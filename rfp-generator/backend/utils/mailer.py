"""
Outbound transactional email.

Render's free plan blocks outbound traffic to the SMTP ports (25, 465, 587),
so this talks to Brevo's REST API over HTTPS instead. No new dependency —
urllib from the stdlib, run in a worker thread so a slow provider can't block
the event loop.

With BREVO_API_KEY unset the reset link is printed to the server log rather
than sent, which is what lets local development work without an account.
"""

import asyncio
import json
import os
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
TIMEOUT_SECONDS = 15


def _config() -> tuple[str, str, str]:
    """Read at call time, not import time, so tests and reloads see changes."""
    return (
        os.getenv("BREVO_API_KEY", "").strip(),
        os.getenv("BREVO_SENDER_EMAIL", "").strip(),
        os.getenv("BREVO_SENDER_NAME", "ProposAI").strip() or "ProposAI",
    )


def _reset_email_body(reset_link: str, ttl_minutes: int) -> tuple[str, str]:
    """Returns (html, plain_text). Both say the same thing."""
    text = (
        "Someone asked to reset the password on your ProposAI account.\n\n"
        f"Open this link to choose a new one (it expires in {ttl_minutes} minutes):\n"
        f"{reset_link}\n\n"
        "If that wasn't you, ignore this email — your password stays as it is."
    )
    html = f"""\
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
            background:#0a0a0f;padding:32px;color:#e6e6f0;">
  <div style="max-width:480px;margin:0 auto;background:#111118;border:1px solid #1e1e2e;
              border-radius:14px;padding:32px;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:24px;">
      Propos<span style="color:#6366f1;">AI</span>
    </div>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Someone asked to reset the password on your ProposAI account.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      Choose a new one with the button below. The link expires in
      <strong>{ttl_minutes} minutes</strong>.
    </p>
    <a href="{reset_link}"
       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;
              border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Set a new password
    </a>
    <p style="font-size:12.5px;line-height:1.6;color:#8a8a9e;margin:24px 0 0;">
      If that wasn't you, ignore this email — your password stays as it is.
    </p>
    <p style="font-size:12px;line-height:1.6;color:#5a5a70;margin:16px 0 0;word-break:break-all;">
      Button not working? Paste this into your browser:<br />{reset_link}
    </p>
  </div>
</div>"""
    return html, text


def _post(api_key: str, payload: dict) -> None:
    request = urllib.request.Request(
        BREVO_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        response.read()


async def send_password_reset_email(
    to_email: str, reset_link: str, ttl_minutes: int
) -> bool:
    """
    Returns True when the provider accepted the message.

    Never raises: the caller answers the same way whether or not the address
    is registered, so a delivery failure must not change the HTTP response.
    """
    api_key, sender_email, sender_name = _config()

    if not api_key or not sender_email:
        print(
            "[WARN] BREVO_API_KEY/BREVO_SENDER_EMAIL not set - no email sent.\n"
            f"       Password reset link for {to_email}:\n       {reset_link}"
        )
        return False

    html, text = _reset_email_body(reset_link, ttl_minutes)
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": "Reset your ProposAI password",
        "htmlContent": html,
        "textContent": text,
    }

    try:
        await asyncio.to_thread(_post, api_key, payload)
        print(f"[OK] Password reset email sent to {to_email}")
        return True
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        print(f"[ERROR] Brevo rejected the message ({e.code}): {detail}")
    except Exception as e:
        print(f"[ERROR] Could not send password reset email: {type(e).__name__}: {e}")

    return False

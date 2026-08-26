/**
 * Client-side validation for the sign-in / sign-up form.
 *
 * These rules deliberately mirror what the backend already enforces —
 * pydantic's EmailStr and `password: str = Field(min_length=8)` in
 * routers/auth.py, plus bcrypt's 72-byte ceiling from utils/security.py — so
 * anything that passes here won't bounce back as a 422. The backend stays the
 * real gatekeeper; this only saves the user a round trip.
 *
 * Every validator returns "" when the value is fine, or the message to show.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_LOCAL_LENGTH = 64;

/**
 * A practical address grammar: local part, @, dotted domain, and a TLD of at
 * least two letters. Stricter than <input type="email">, which accepts "a@b"
 * and "you@example" — both of which the backend rejects.
 */
const EMAIL_RE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

const GENERIC_EMAIL_MESSAGE = "Enter a valid email address, like you@example.com.";

/** Misspellings of the domains people actually sign up with. */
const DOMAIN_TYPOS = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.comm": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmall.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "iclould.com": "icloud.com",
  "icloud.co": "icloud.com",
  "protonmai.com": "protonmail.com",
  "protonmail.co": "protonmail.com",
};

function byteLength(value) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  return unescape(encodeURIComponent(value)).length;
}

/**
 * @param  {string} raw  the raw input value
 * @return {string}      "" if valid, otherwise the message to show
 */
export function validateEmail(raw) {
  const value = (raw || "").trim();

  if (!value) return "Email is required.";
  if (/\s/.test(value)) return "An email address can't contain spaces.";

  const at = value.indexOf("@");
  if (at === -1) return GENERIC_EMAIL_MESSAGE;
  if (value.indexOf("@", at + 1) !== -1) return "An email address can only contain one @.";

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);

  if (!local) return "Add the part before the @, like you@example.com.";
  if (!domain) return "Add a domain after the @, like you@example.com.";
  if (!domain.includes(".")) return "That domain is missing an ending, like .com.";
  if (local.length > MAX_LOCAL_LENGTH) return "The part before the @ is too long.";
  if (value.length > MAX_EMAIL_LENGTH) return "That email address is too long.";
  if (!EMAIL_RE.test(value)) return GENERIC_EMAIL_MESSAGE;

  return "";
}

/**
 * Same rules for both tabs — no account can exist with a password the signup
 * form wouldn't have accepted, so applying them on sign-in too turns a 422
 * into an instant, readable message.
 */
export function validatePassword(raw) {
  const value = raw || "";

  if (!value) return "Password is required.";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (byteLength(value) > MAX_PASSWORD_BYTES) {
    return `Password must be ${MAX_PASSWORD_BYTES} bytes or fewer.`;
  }

  return "";
}

/**
 * Non-blocking nudge for a mistyped domain. Returns the corrected address, or
 * "" when there's nothing to suggest. The local part keeps its original case.
 */
export function suggestEmailFix(raw) {
  const value = (raw || "").trim();
  const at = value.lastIndexOf("@");
  if (at === -1) return "";

  const fixed = DOMAIN_TYPOS[value.slice(at + 1).toLowerCase()];
  return fixed ? `${value.slice(0, at)}@${fixed}` : "";
}

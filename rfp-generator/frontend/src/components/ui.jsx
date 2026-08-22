import { useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------------
   Small shared primitives.
   Each of these replaces a block of markup that was copy-pasted
   several times across the landing page.
   --------------------------------------------------------------- */

/** Wordmark — was hand-written in the navbar, the footer and the auth page. */
export function Logo({ size = 22 }) {
  return (
    <span
      style={{
        fontSize: `${size}px`,
        fontWeight: 700,
        letterSpacing: "-0.5px",
        color: "var(--text)",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: `${size * 1.1}px`,
          height: `${size * 1.1}px`,
          borderRadius: `${size * 0.32}px`,
          background: "linear-gradient(135deg, var(--brand), var(--accent))",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${size * 0.55}px`,
          color: "#fff",
          fontWeight: 800,
        }}
      >
        P
      </span>
      <span>
        Propos<span style={{ color: "var(--brand)" }}>AI</span>
      </span>
    </span>
  );
}

/** Surface card — the same four style properties appeared a dozen times. */
export function Card({ children, style = {}, hover = true, ...rest }) {
  return (
    <div
      className={hover ? "lift" : undefined}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "24px",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Section heading. Every section repeated the same 32px/700/centred h2
 * with one word coloured; now the accent is just the last word.
 */
export function SectionHeading({ children, accent, sub }) {
  return (
    <div style={{ textAlign: "center", marginBottom: sub ? "44px" : "40px" }}>
      <h2
        style={{
          fontSize: "clamp(26px, 4vw, 34px)",
          fontWeight: 700,
          letterSpacing: "-0.8px",
          color: "var(--text)",
        }}
      >
        {children} <span style={{ color: "var(--brand)" }}>{accent}</span>
      </h2>
      {sub && (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "15px",
            marginTop: "12px",
            maxWidth: "560px",
            marginInline: "auto",
            lineHeight: 1.7,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/** Fades its children up the first time they scroll into view. */
export function Reveal({ children, delay = 0, style = {}, as: Tag = "div" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? " is-visible" : ""}`}
      style={{ "--delay": `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

/**
 * Counts up to a number when scrolled into view.
 * `value` is written the way it should read, e.g. "30s", "3hrs", "100%".
 */
export function CountUp({ value, duration = 1400, style = {} }) {
  const match = String(value).match(/^([\d.]+)(.*)$/);
  const target = match ? parseFloat(match[1]) : 0;
  const suffix = match ? match[2] : String(value);
  const decimals = match && match[1].includes(".") ? 1 : 0;

  const ref = useRef(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      if (reduced) return setShown(target);
      const start = performance.now();
      let frame;
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        // ease-out-cubic
        setShown(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    let cleanup;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cleanup = run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cleanup?.();
    };
  }, [target, duration]);

  return (
    <span ref={ref} style={style}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Sun / moon switch that flips the [data-theme] tokens. */
export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="press"
      style={{
        width: "54px",
        height: "30px",
        borderRadius: "999px",
        border: "1px solid var(--border)",
        background: "var(--bg-alt)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "3px",
          left: isDark ? "3px" : "27px",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--brand), var(--accent))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          transition: "left 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

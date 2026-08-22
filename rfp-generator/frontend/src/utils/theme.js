const STORAGE_KEY = "proposai_theme";

/**
 * Resolve the theme to use on first paint: an explicit past choice wins,
 * otherwise follow the operating system.
 */
export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage can be blocked (private mode) — fall through to the OS */
  }
  const prefersLight =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

/** Paint the theme by stamping it on <html>, where the CSS tokens hang. */
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* not fatal — the theme still applies for this visit */
  }
}

/** Call once as early as possible to avoid a flash of the wrong theme. */
export function initTheme() {
  const theme = getInitialTheme();
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

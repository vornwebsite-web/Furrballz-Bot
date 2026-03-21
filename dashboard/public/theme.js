// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

(function () {
  'use strict';

  const STORAGE_KEY = 'furrballz-theme';
  const DEFAULT     = 'dark';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT;
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function toggleTheme() {
    const current = getTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply saved theme immediately on page load (before paint)
  setTheme(getTheme());

  // Expose globally for the toggle button
  window.toggleTheme = toggleTheme;
})();

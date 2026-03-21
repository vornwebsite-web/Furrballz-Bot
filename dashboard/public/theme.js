// ── Copyright 2026 Furrballz Bot™ ────────────────────────────────────────────
// Theme is applied inline in <head> before paint to prevent flicker.
// This file only handles the toggle function.

(function () {
  'use strict';

  const STORAGE_KEY = 'furrballz-theme';

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function toggleTheme() {
    const current = localStorage.getItem(STORAGE_KEY) || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  window.toggleTheme = toggleTheme;
})();

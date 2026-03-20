'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', DEBUG: 'DEBUG' };

const COLORS = {
  INFO:  '\x1b[36m',  // cyan
  WARN:  '\x1b[33m',  // yellow
  ERROR: '\x1b[31m',  // red
  DEBUG: '\x1b[35m',  // magenta
  RESET: '\x1b[0m',
  DIM:   '\x1b[2m',
  BOLD:  '\x1b[1m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, message) {
  const color = COLORS[level] || COLORS.RESET;
  const ts    = `${COLORS.DIM}${timestamp()}${COLORS.RESET}`;
  const lvl   = `${color}${COLORS.BOLD}${level.padEnd(5)}${COLORS.RESET}`;
  const msg   = level === 'ERROR' ? `${COLORS.ERROR}${message}${COLORS.RESET}` : message;
  console.log(`${ts} ${lvl} ${msg}`);
}

const logger = {
  info:  (msg) => log(LEVELS.INFO,  msg),
  warn:  (msg) => log(LEVELS.WARN,  msg),
  error: (msg) => log(LEVELS.ERROR, msg),
  debug: (msg) => log(LEVELS.DEBUG, msg),
};

module.exports = logger;

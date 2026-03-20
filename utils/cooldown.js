'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const config = require('../config');

// Map structure: commandName → Map<userId, expiryTimestamp>
const cooldowns = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [commandName, userMap] of cooldowns) {
    for (const [userId, expiry] of userMap) {
      if (now > expiry) userMap.delete(userId);
    }
    if (userMap.size === 0) cooldowns.delete(commandName);
  }
}, 5 * 60 * 1000);

/**
 * Checks if a user is on cooldown for a command.
 * Returns remaining seconds if on cooldown, or 0 if not.
 *
 * @param {string} commandName
 * @param {string} userId
 * @param {number} [durationMs] - Cooldown duration in ms. Defaults to config default.
 * @returns {number} Remaining cooldown in seconds (0 = not on cooldown)
 */
function check(commandName, userId, durationMs = config.limits.commandCooldownDefault) {
  if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Map());

  const userMap  = cooldowns.get(commandName);
  const now      = Date.now();
  const expiry   = userMap.get(userId);

  if (expiry && now < expiry) {
    return (expiry - now) / 1000; // remaining seconds
  }

  // Set cooldown
  userMap.set(userId, now + durationMs);
  return 0;
}

/**
 * Manually clear a user's cooldown for a command.
 * @param {string} commandName
 * @param {string} userId
 */
function clear(commandName, userId) {
  const userMap = cooldowns.get(commandName);
  if (userMap) userMap.delete(userId);
}

/**
 * Clear all cooldowns for a command.
 * @param {string} commandName
 */
function clearAll(commandName) {
  cooldowns.delete(commandName);
}

module.exports = { check, clear, clearAll };

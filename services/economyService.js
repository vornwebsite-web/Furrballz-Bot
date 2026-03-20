'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const User     = require('../models/User');
const ShopItem = require('../models/ShopItem');
const logger   = require('../utils/logger');

/**
 * Gets a user's balance. Returns { balance, bank }.
 */
async function getBalance(userId, guildId) {
  const user = await User.getOrCreate(userId, guildId);
  return { balance: user.balance, bank: user.bank };
}

/**
 * Adds or subtracts from a user's wallet balance.
 * @param {string} userId
 * @param {string} guildId
 * @param {number} amount  - Positive to add, negative to subtract
 * @returns {Promise<number>} New balance
 */
async function modifyBalance(userId, guildId, amount) {
  const user    = await User.getOrCreate(userId, guildId);
  user.balance  = Math.max(0, user.balance + amount);
  await user.save();
  return user.balance;
}

/**
 * Transfers balance from one user to another.
 * Returns false if the sender has insufficient funds.
 */
async function transfer(fromUserId, toUserId, guildId, amount) {
  if (amount <= 0) return { success: false, reason: 'Amount must be positive.' };

  const from = await User.getOrCreate(fromUserId, guildId);
  if (from.balance < amount) return { success: false, reason: 'Insufficient balance.' };

  from.balance -= amount;
  await from.save();

  await modifyBalance(toUserId, guildId, amount);
  return { success: true };
}

/**
 * Claims the daily reward. Returns false if still on cooldown.
 * @returns {{ success: boolean, amount?: number, nextAt?: Date }}
 */
async function claimDaily(userId, guildId, guildDoc) {
  const user      = await User.getOrCreate(userId, guildId);
  const now       = Date.now();
  const cooldownMs = 20 * 60 * 60 * 1000; // 20 hours

  if (user.dailyCooldown && now < user.dailyCooldown.getTime()) {
    return { success: false, nextAt: user.dailyCooldown };
  }

  const amount      = guildDoc?.economy?.dailyAmount ?? 100;
  user.balance     += amount;
  user.dailyCooldown = new Date(now + cooldownMs);
  await user.save();

  return { success: true, amount, newBalance: user.balance };
}

/**
 * Claims the work reward. Returns false if on cooldown.
 */
async function claimWork(userId, guildId, guildDoc) {
  const user       = await User.getOrCreate(userId, guildId);
  const now        = Date.now();
  const cooldownMs = 60 * 60 * 1000; // 1 hour

  if (user.workCooldown && now < user.workCooldown.getTime()) {
    return { success: false, nextAt: user.workCooldown };
  }

  const min    = guildDoc?.economy?.workMin ?? 50;
  const max    = guildDoc?.economy?.workMax ?? 200;
  const amount = Math.floor(Math.random() * (max - min + 1)) + min;

  user.balance    += amount;
  user.workCooldown = new Date(now + cooldownMs);
  await user.save();

  return { success: true, amount, newBalance: user.balance };
}

/**
 * Buys an item from the shop.
 * @returns {{ success: boolean, reason?: string }}
 */
async function buyItem(userId, guildId, itemId, guild) {
  const [user, item] = await Promise.all([
    User.getOrCreate(userId, guildId),
    ShopItem.findById(itemId),
  ]);

  if (!item || !item.enabled)         return { success: false, reason: 'Item not found or unavailable.' };
  if (item.guildId !== guildId)       return { success: false, reason: 'Item not found in this server.' };
  if (user.balance < item.price)      return { success: false, reason: `Insufficient balance. You need **${item.price}** coins.` };
  if (item.stock === 0)               return { success: false, reason: 'This item is out of stock.' };

  user.balance -= item.price;
  item.sold    += 1;
  if (item.stock > 0) item.stock -= 1;

  // Add to inventory
  const existing = user.inventory.find(i => i.itemId === item._id.toString());
  if (existing) {
    existing.quantity++;
  } else {
    user.inventory.push({ itemId: item._id.toString(), name: item.name, quantity: 1 });
  }

  await Promise.all([user.save(), item.save()]);

  // Grant role if item type is 'role'
  if (item.type === 'role' && item.roleId && guild) {
    const member = await guild.members.fetch(userId).catch(() => null);
    const role   = guild.roles.cache.get(item.roleId);
    if (member && role) await member.roles.add(role).catch(() => {});
  }

  return { success: true, item, newBalance: user.balance };
}

/**
 * Gets the economy leaderboard.
 */
async function getLeaderboard(guildId, limit = 10) {
  return User.find({ guildId }).sort({ balance: -1 }).limit(limit).lean();
}

module.exports = { getBalance, modifyBalance, transfer, claimDaily, claimWork, buyItem, getLeaderboard };

'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isManager } = require('../utils/permissions');
const { number }    = require('../utils/formatters');
const { paginate }  = require('../utils/paginator');
const ShopItem = require('../models/ShopItem');
const User     = require('../models/User');
const Guild    = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Server shop management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Add an item to the shop')
      .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
      .addIntegerOption(o => o.setName('price').setDescription('Item price').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('type').setDescription('Item type').setRequired(true)
        .addChoices({ name: 'Item', value: 'item' }, { name: 'Role', value: 'role' }))
      .addStringOption(o => o.setName('description').setDescription('Item description'))
      .addRoleOption(o => o.setName('role').setDescription('Role to grant (if type is role)'))
      .addIntegerOption(o => o.setName('stock').setDescription('Stock amount (-1 for unlimited)').setMinValue(-1)))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove an item from the shop')
      .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all shop items'))
    .addSubcommand(s => s
      .setName('edit')
      .setDescription('Edit a shop item')
      .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true))
      .addIntegerOption(o => o.setName('price').setDescription('New price'))
      .addStringOption(o => o.setName('description').setDescription('New description'))
      .addIntegerOption(o => o.setName('stock').setDescription('New stock (-1 = unlimited)').setMinValue(-1)))
    .addSubcommand(s => s
      .setName('buy')
      .setDescription('Buy an item from the shop')
      .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('inventory')
      .setDescription('View your inventory')
      .addUserOption(o => o.setName('user').setDescription('User to check')))
    .addSubcommand(s => s
      .setName('restock')
      .setDescription('Restock an item')
      .addStringOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount to add').setRequired(true).setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (['add', 'remove', 'edit', 'restock'].includes(sub)) {
      if (!isManager(interaction.member)) return noPermission(interaction);
    }

    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const currency = guildDoc.economy?.currencyEmoji || '🪙';

    if (sub === 'add') {
      const name  = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');
      const type  = interaction.options.getString('type');
      const desc  = interaction.options.getString('description');
      const role  = interaction.options.getRole('role');
      const stock = interaction.options.getInteger('stock') ?? -1;

      if (type === 'role' && !role) return errorReply(interaction, 'You must specify a role for role-type items.');

      const item = await ShopItem.create({
        guildId: interaction.guild.id, name, price, type,
        description: desc || null, roleId: role?.id || null, stock,
      });
      await interaction.reply({ embeds: [success(`**${name}** added to the shop!\nPrice: ${currency} ${number(price)} | ID: \`${item._id}\``)], ephemeral: true });
    }

    else if (sub === 'remove') {
      const id   = interaction.options.getString('item_id');
      const item = await ShopItem.findOneAndDelete({ _id: id, guildId: interaction.guild.id });
      if (!item) return errorReply(interaction, 'Item not found.');
      await interaction.reply({ embeds: [success(`**${item.name}** removed from the shop.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const items = await ShopItem.find({ guildId: interaction.guild.id });
      if (!items.length) return interaction.reply({ embeds: [info('The shop is empty.')], ephemeral: true });
      const lines = items.map(i => `\`${i._id}\` **${i.name}** — ${currency} ${number(i.price)}${i.stock > -1 ? ` | Stock: ${i.stock}` : ''}${!i.enabled ? ' *(disabled)*' : ''}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 8) pages.push(neutral(lines.slice(i, i + 8).join('\n'), `Shop Items (${items.length})`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'edit') {
      const id   = interaction.options.getString('item_id');
      const item = await ShopItem.findOne({ _id: id, guildId: interaction.guild.id });
      if (!item) return errorReply(interaction, 'Item not found.');
      const price = interaction.options.getInteger('price');
      const desc  = interaction.options.getString('description');
      const stock = interaction.options.getInteger('stock');
      if (price !== null) item.price       = price;
      if (desc  !== null) item.description = desc;
      if (stock !== null) item.stock       = stock;
      await item.save();
      await interaction.reply({ embeds: [success(`**${item.name}** updated.`)], ephemeral: true });
    }

    else if (sub === 'buy') {
      const economyService = require('../services/economyService');
      const itemId = interaction.options.getString('item_id');
      const result = await economyService.buyItem(interaction.user.id, interaction.guild.id, itemId, interaction.guild);
      if (!result.success) return errorReply(interaction, result.reason);
      await interaction.reply({ embeds: [success(`You bought **${result.item.name}** for ${currency} ${number(result.item.price)}!\nNew balance: **${currency} ${number(result.newBalance)}**`)] });
    }

    else if (sub === 'inventory') {
      const target  = interaction.options.getUser('user') || interaction.user;
      const userDoc = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
      const inv     = userDoc?.inventory || [];
      if (!inv.length) return interaction.reply({ embeds: [info(`**${target.username}** has an empty inventory.`)], ephemeral: true });
      const lines = inv.map(i => `**${i.name}** × ${i.quantity}`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), `${target.username}'s Inventory`)] });
    }

    else if (sub === 'restock') {
      const id     = interaction.options.getString('item_id');
      const amount = interaction.options.getInteger('amount');
      const item   = await ShopItem.findOneAndUpdate(
        { _id: id, guildId: interaction.guild.id },
        { $inc: { stock: amount } },
        { new: true },
      );
      if (!item) return errorReply(interaction, 'Item not found.');
      await interaction.reply({ embeds: [success(`Restocked **${item.name}** by ${amount}. New stock: **${item.stock}**`)], ephemeral: true });
    }
  },
};

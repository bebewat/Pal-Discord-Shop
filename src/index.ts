import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } from './config';
import { addItem, buyItem, getAvailableItemsText, getInventory, listItems, updateStock } from './shop';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Show available Palworld shop items.'),
  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase an item from the shop.')
    .addStringOption(option =>
      option.setName('item_id').setDescription('The item ID to buy').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantity').setDescription('How many units to buy').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your Palworld shop inventory.'),
  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Add a new item to the shop (admin only).')
    .addStringOption(option =>
      option.setName('name').setDescription('Item name').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description').setDescription('Item description').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('server_id').setDescription('Palworld server item ID').setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('price').setDescription('Item price in coins').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('stock').setDescription('Initial stock count').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('restock')
    .setDescription('Change stock for a shop item (admin only).')
    .addStringOption(option =>
      option.setName('item_id').setDescription('Item id to restock').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount to add or subtract').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;

  if (command === 'shop') {
    await interaction.reply({ content: getAvailableItemsText() || 'Shop is empty.', ephemeral: true });
    return;
  }

  if (command === 'buy') {
    const itemId = interaction.options.getString('item_id', true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;
    const result = await buyItem(interaction.user.id, itemId, quantity);

    if (result.error) {
      await interaction.reply({ content: result.error, ephemeral: true });
      return;
    }

    const purchasedCount = result.inventory?.find(entry => entry.id === itemId)?.quantity ?? quantity;
    let message = `Purchased ${quantity}x **${result.item?.name}** for ${result.item?.price ?? 0} coins each. You now own ${purchasedCount}x of this item.`;

    if (result.serverResult) {
      message += `\nServer delivery ${result.serverResult.delivered ? 'confirmed' : 'pending'}.`;
      if (result.serverResult.remainingCoins !== undefined) {
        message += ` Remaining balance: ${result.serverResult.remainingCoins}.`;
      }
    }

    await interaction.reply({ content: message, ephemeral: true });
    return;
  }

  if (command === 'inventory') {
    const inventory = getInventory(interaction.user.id);
    if (!inventory.length) {
      await interaction.reply({ content: 'Your inventory is empty.', ephemeral: true });
      return;
    }

    const list = inventory
      .map(entry => {
        const item = listItems().find(shopItem => shopItem.id === entry.id);
        return item ? `**${item.name}** (${item.id}) - x${entry.quantity}` : `Unknown item (${entry.id}) - x${entry.quantity}`;
      })
      .join('\n');

    await interaction.reply({ content: `Your inventory:\n${list}`, ephemeral: true });
    return;
  }

  if (command === 'additem') {
    const name = interaction.options.getString('name', true);
    const description = interaction.options.getString('description', true);
    const serverId = interaction.options.getString('server_id') ?? undefined;
    const price = interaction.options.getInteger('price', true);
    const stock = interaction.options.getInteger('stock', true);

    const item = addItem({ name, description, serverId, price, stock });
    await interaction.reply({ content: `Added item **${item.name}** with ID **${item.id}**${item.serverId ? ` and server ID **${item.serverId}**` : ''}.` });
    return;
  }

  if (command === 'restock') {
    const itemId = interaction.options.getString('item_id', true);
    const amount = interaction.options.getInteger('amount', true);
    const updated = updateStock(itemId, amount);

    if (!updated) {
      await interaction.reply({ content: 'Item not found.', ephemeral: true });
      return;
    }

    await interaction.reply({
      content: `Updated **${updated.name}** stock to ${updated.stock}.`
    });
    return;
  }
});

async function registerCommands() {
  if (!CLIENT_ID || !GUILD_ID) {
    console.warn('CLIENT_ID or GUILD_ID is not set. Skipping command registration.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Failed to register commands', error);
  }
}

registerCommands().then(() => client.login(DISCORD_TOKEN));

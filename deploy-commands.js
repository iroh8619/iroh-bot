const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');

const commands = [
  new SlashCommandBuilder()
    .setName('pai_sho_pairs')
    .setDescription('Start a new Pai Sho Pairs memory game.'),
  new SlashCommandBuilder()
    .setName('reward')
    .setDescription('Server Owner only'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to use the bot.'),
  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the Iroh Challenge!'),
  new SlashCommandBuilder()
    .setName('find_uncle_iroh')
    .setDescription('Start a new round to find Iroh.'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top dragons.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// RECOMMENDED: Replace with your real guild ID for instant registration
const GUILD_ID = '905876133151637575'; // <-- Replace this
const CLIENT_ID = process.env.CLIENT_ID;

(async () => {
  try {
    console.log('📤 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
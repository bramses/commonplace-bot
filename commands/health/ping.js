import { SlashCommandBuilder } from 'discord.js';

const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!');

export const data = pingCommand;

export async function execute(interaction) {
  console.log('ping command executed');
  await interaction.reply('Pong!');
}

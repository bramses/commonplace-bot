import config from '../../config.json' assert { "type": "json" };
import { SlashCommandBuilder, ChannelType } from 'discord.js';

const { quoordinates_server } = config;

// post to quoordinates server with the user's input as the body.query
async function main(query) {
    const response = await fetch(quoordinates_server, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });
    const json = await response.json();
    console.log(json);
    return json;
    }

export const data = new SlashCommandBuilder()
    .setName('quos')
    .setDescription('Generates a random quoordinate.')
    .addStringOption(option =>
        option.setName('input')
            .setDescription('The text to generate a quoordinate from.')
            .setRequired(true)
    );

export async function execute(interaction) {
    await interaction.deferReply();
    const userInput = interaction.options.getString('input');
    const quoordinate  = await main(userInput);

    const quotes = quoordinate.map(q => `> ${q.text}\n\n-- ${q.title}\n\n`).filter(q => q.length < 2000);

    const thread = await interaction.channel.threads.create({
        name: userInput,
        autoArchiveDuration: 60,
        startMessage: interaction.channel.lastMessage,
        type: ChannelType.GUILD_PUBLIC_THREAD,
        reason: 'Sending quotes as separate messages in one thread',
    });
    
    for (const quote of quotes) {
        await thread.send(quote);
    }
    await interaction.editReply(`Results: ${quoordinate.length} quotes`);
}
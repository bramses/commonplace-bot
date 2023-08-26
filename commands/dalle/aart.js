import OpenAI from "openai";
import config from '../../config.json' assert { "type": "json" };
import { SlashCommandBuilder } from 'discord.js';
import { invocationWorkflow, preWorkflow } from '../../invocation.js';



const  { OPENAI_API_KEY } = config;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function complete(text) {
  // console.log(`Summarizing: ${text}`);
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Summarize the following into a theme and create an art prompt from the feel of the text aesthetically along the lines of: 'an abstract of [some unique lesser known art style from history] version of {x}' where x is the feel of the text aesthetically. Just return the art prompt, say nothing else." +
          text,
      },
    ],
    model: "gpt-4",
  });

  return completion.choices[0].message.content;
}

async function main(prompt) {
  prompt = await complete(prompt);
  prompt = prompt.replace("Art Prompt: ", "").trim();
  const image = await openai.images.generate({ prompt: prompt });
  const imageUrl = image.data[0].url;

  return {
    prompt,
    imageUrl,
  }
  
}

export const data = new SlashCommandBuilder()
    .setName('aart')
    .setDescription('Generates an art prompt from the feel of the text aesthetically.')
    .addStringOption(option =>
        option.setName('input')
            .setDescription('The text to generate an art prompt from.')
            .setRequired(true)
    );

export async function execute(interaction) {
    await interaction.deferReply();

    if (!await preWorkflow(interaction)) {
        await interaction.editReply('You have reached your monthly limit for this command: ' + interaction.commandName);
        return;
    }


    const userInput = interaction.options.getString('input');
    const { prompt, imageUrl } = await main(userInput);
    await interaction.editReply(`Art Prompt (save the image it disappears in 24 hours!): ${prompt} \n Image: [(url)](${imageUrl})`);
    await invocationWorkflow(interaction);
}
import OpenAI from "openai";
// import config from "../../config.json" assert { "type": "json" };
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { invocationWorkflow, preWorkflow } from "../../invocation.js";
import Filter from "bad-words";
import { queue, processQueue } from "../../shared-queue.js";
import {
  invocationWorkflowSB,
  preWorkflowSB,
} from "../../supabase-invocations.js";

import dotenv from "dotenv";

dotenv.config();

const { OPENAI_API_KEY } = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const filter = new Filter();

async function complete(text) {
  try {
    text = filter.clean(text);
  
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Summarize the following into a theme and create an art prompt from the feel of the text aesthetically along the lines of: 'an abstract of [some unique lesser known art style from history] version of {x}' where x is the feel of the text aesthetically. Remove any unsafe or NSFW content. Just return the art prompt, say nothing else." +
            text,
        },
      ],
      model: "gpt-4",
    });
  
    return completion.choices[0].message.content;
  } catch (err) {
    console.log(err);
    return "Error generating prompt.";
  }
}

export async function main(prompt) {
  try {
    prompt = await complete(prompt);
    prompt = prompt.replace("Art Prompt: ", "").trim();

    if (prompt === "Error generating prompt.") {
      return {
        prompt: "Error generating prompt.",
        imageUrl: "",
      };
    }

    const image = await openai.images.generate({ model: "dall-e-3", prompt: prompt });
    const imageUrl = image.data[0].url;

    if (imageUrl === undefined) {
      return {
        prompt: "Error generating prompt.",
        imageUrl: "",
      };
    }

    return {
      prompt,
      imageUrl,
    };
  } catch (err) {
    console.log(err);
    return {
      prompt: "Error generating prompt.",
      imageUrl: "",
    };
  }
}

let drawCommand = null;

if (process.env.is_production === "true") {
  drawCommand = new SlashCommandBuilder()
    .setName("draw")
    .setDescription(
      "Generates an art prompt and image from the feel of the text aesthetically."
    )
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("The text to generate an art prompt from.")
        .setRequired(true)
    );
} else {
  drawCommand = new SlashCommandBuilder()
    .setName("draw")
    .setDescription(
      "Generates an art prompt and image from the feel of the text aesthetically."
    )
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("The text to generate an art prompt from.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

export const data = drawCommand;

export async function execute(interaction) {
  // await interaction.deferReply({ ephemeral: true });

  // add to queue
  const sentMessage = await interaction.reply({
    content: `<@${interaction.user.id}>, your request has been added to the queue.`,
    ephemeral: true,
  });

  queue.push({
    task: async (user, message) => {
      if (!(await preWorkflowSB(interaction))) {
        await interaction.editReply({
          content:
            "You have reached your monthly limit for this command: " +
            interaction.commandName +
            ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
          ephemeral: true,
        });
        return;
      }

      try {
        const userInput = interaction.options.getString("input");
        const { prompt, imageUrl } = await main(userInput);
  
        console.log(prompt, imageUrl);
  
        // save image to cf from imageUrl
        const cfRes = await fetch(process.env.quoordinates_server_dalle_cf, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: imageUrl }),
  
        })
  
        console.log(cfRes);
  
  
        const cfResJson = await cfRes.json();
        const cfResUrl = cfResJson.result;
  
        // send message to channel
        const channelMsg = await interaction.channel.send(
          `Art Prompt (**save the image it disappears in 24 hours!**): ${prompt} \n Image: [(url)](${cfResUrl})`
        );
  
        console.log(cfResUrl);
        await invocationWorkflowSB(interaction);
        await interaction.editReply({
          content: `<@${interaction.user.id}>, your request has been completed. Link to result: ${channelMsg.url}`,
          ephemeral: true,
        });
      } catch (err) {
        console.log(err);
        await interaction.editReply({
          content: `<@${interaction.user.id}>, your request has failed. Please try again later.`,
          ephemeral: true,
        });
      }
    },
    user: interaction.user,
    message: sentMessage,
    interaction,
  });

  processQueue();
}

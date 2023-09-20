import OpenAI from "openai";
import config from "../../config.json" assert { "type": "json" };
import { SlashCommandBuilder } from "discord.js";
import { invocationWorkflow, preWorkflow } from "../../invocation.js";
import Filter from "bad-words";
import { queue, processQueue } from "../../shared-queue.js";

const { OPENAI_API_KEY } = config;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const filter = new Filter();

async function complete(text) {
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
}

export async function main(prompt) {
  try {
    prompt = await complete(prompt);
    prompt = prompt.replace("Art Prompt: ", "").trim();
    const image = await openai.images.generate({ prompt: prompt });
    const imageUrl = image.data[0].url;

    return {
      prompt,
      imageUrl,
    };
  } catch (err) {
    return {
      prompt: "Error generating prompt.",
      imageUrl: "",
    };
  }
}

export const data = new SlashCommandBuilder()
  .setName("aart")
  .setDescription(
    "Generates an art prompt from the feel of the text aesthetically."
  )
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The text to generate an art prompt from.")
      .setRequired(true)
  );

export async function execute(interaction) {
  // await interaction.deferReply({ ephemeral: true });

  if (!(await preWorkflow(interaction))) {
    await interaction.editReply({
      content:
        "You have reached your monthly limit for this command: " +
        interaction.commandName +
        ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
      ephemeral: true,
    });
    return;
  }

  // add to queue
  const sentMessage = await interaction.reply({
    content: `<@${interaction.user.id}>, your request has been added to the queue.`,
    ephemeral: true,
  });

  queue.push({
    task: async (user, message) => {
      const userInput = interaction.options.getString("input");
      const { prompt, imageUrl } = await main(userInput);

      // send message to channel
      const channelMsg = await interaction.channel.send(
        `Art Prompt (**save the image it disappears in 24 hours!**): ${prompt} \n Image: [(url)](${imageUrl})`
      );

      console.log(imageUrl);
      await invocationWorkflow(interaction);
      await interaction.editReply({
        content: `<@${interaction.user.id}>, your request has been completed. Link to result: ${channelMsg.url}`,
        ephemeral: true,
      });
    },
    user: interaction.user,
    message: sentMessage,
    interaction,
  });

  processQueue();
}

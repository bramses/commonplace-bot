import {
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";
import config from "../../config.json" assert { "type": "json" };
import { lookupBook } from "../../books.js";
import { preWorkflow, invocationWorkflow } from "../../invocation.js";
import { processQueue, queue } from "../../shared-queue.js";

const { quoordinates_server_random } = config;

export async function randomExport() {
  try {
    const response = await fetch(quoordinates_server_random, {
      method: "GET",
    });
    const json = await response.json();

    return json[0];
  } catch (err) {
    console.log(err);

    return {
      text: "Something went wrong. Please try again.",
      book: null,
    };
  }
}

const randomCommand = new SlashCommandBuilder()
  .setName("random")
  .setDescription("Fetch a random quote from the library.");

export const data = randomCommand;

export async function execute(interaction) {
  interaction.commandName = "random";
  if (!(await preWorkflow(interaction))) {
    await interaction.reply({
      content:
        "You have reached your monthly limit for this command: " +
        interaction.commandName +
        ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
      ephemeral: true,
    });
    return;
  }
  try {
    const sentMessage = await interaction.reply({
      content: `<@${interaction.user.id}>, your request has been added to the queue.`,
      ephemeral: true,
    });

    queue.push({
      task: async (user, message) => {
        const random = await randomExport();

        while (random.text.length > 2000) {
          random = await randomExport();
        }

        // log random quote to console with keys double-quoted
        console.log(JSON.stringify(random, null, 2));

        //   const makeAart = new ButtonBuilder()
        //     .setCustomId("aart_btn")
        //     .setLabel("aart")
        //     .setStyle(ButtonStyle.Primary);

        const repost = new ButtonBuilder()
          .setCustomId("repost")
          .setLabel("new-home")
          .setStyle(ButtonStyle.Primary);

        const learnMore = new ButtonBuilder()
          .setCustomId("quos_learn_more")
          .setLabel("delve")
          .setStyle(ButtonStyle.Primary);

        const summarize = new ButtonBuilder()
          .setCustomId("summarize")
          .setLabel("tldr")
          .setStyle(ButtonStyle.Primary);

        const share = new ButtonBuilder()
          .setCustomId("share")
          .setLabel("share")
          .setStyle(ButtonStyle.Primary);

        // idk if this is more helpful than delve
        const followUpQuestions = new ButtonBuilder()
          .setCustomId("follow_up_questions")
          .setLabel("follow-up")
          .setStyle(ButtonStyle.Primary);

        const cloze = new ButtonBuilder()
          .setCustomId("cloze_deletion")
          .setLabel("cloze")
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(
          repost,
          learnMore,
          summarize,
          share
        );

        // \n\n[cover](${random.book.cover_image_url})
        const res = await interaction.channel.send({
          content: `> ${random.text}\n\n-- [${
            random.book.title
          } (**affiliate link**)](${lookupBook(random.book.title)})`,
          components: [row],
        });

        interaction.commandName = "random";
        await invocationWorkflow(interaction);

        await interaction.editReply({
          content: `<@${interaction.user.id}>, your \`/random\` request has been processed. Link to result: ${res.url}`,
          ephemeral: true,
        });
      },
      user: interaction.user,
      message: sentMessage,
      interaction: interaction,
    });

    processQueue();
  } catch (err) {
    await interaction.reply({
      content: `Something went wrong: ${err}`,
    });
  }
}

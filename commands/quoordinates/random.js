import {
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
// import config from "../../config.json" assert { "type": "json" };
import { lookupBook } from "../../books.js";
import { preWorkflow, invocationWorkflow } from "../../invocation.js";
import { processQueue, queue } from "../../shared-queue.js";
import {
  invocationWorkflowSB,
  preWorkflowSB,
} from "../../supabase-invocations.js";

import dotenv from "dotenv";
dotenv.config();

const { quoordinates_server_random, quoordinates_server_random_in_book, is_production } = process.env;

export async function randomExport(amount = 1) {
  try {
    const response = await fetch(quoordinates_server_random, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });
    const json = await response.json();

    return json;
  } catch (err) {
    console.log(err);

    return {
      text: "Something went wrong. Please try again.",
      book: null,
    };
  }
}

export async function randomExportWithBookID(bookIds, amount = 1) {
  try {
    const response = await fetch(quoordinates_server_random_in_book, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, book_ids: bookIds })
    });
    const json = await response.json();

    return json;
  } catch (err) {
    console.log(err);

    return {
      text: "Something went wrong. Please try again.",
      book: null,
    };
  }
}

let randomCommand = null

if (process.env.is_production === "true") {
  randomCommand = new SlashCommandBuilder()
  .setName("random")
  .setDescription("Fetch a random quote from the library.");
} else {
  randomCommand = new SlashCommandBuilder()
  .setName("random")
  .setDescription("Fetch a random quote from the library.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
}

export const data = randomCommand;

export async function execute(interaction) {
  // check if in thread -- should not work in thread
  if (interaction.channel.type === ChannelType.PublicThread) {
    await interaction.reply({
      content:
        "The `/random` command does not work in threads. Please use it in the main channel.",
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
        interaction.commandName = "random";
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
        let randomArr = await randomExport(1);
        let random = randomArr[0];

        while (random.text.length > 2000) {
          randomArr = await randomExport(1);
          random = randomArr[0];
        }

        // log random quote to console with keys double-quoted
        // console.log(JSON.stringify(random, null, 2));

          const makeAart = new ButtonBuilder()
            .setCustomId("aart_btn")
            .setLabel("draw")
            .setStyle(ButtonStyle.Primary);

        // const repost = new ButtonBuilder()
        //   .setCustomId("repost")
        //   .setLabel("new-home")
        //   .setStyle(ButtonStyle.Primary);

        const learnMore = new ButtonBuilder()
          .setCustomId("quos_learn_more")
          .setLabel("delve")
          .setStyle(ButtonStyle.Secondary);

        const summarize = new ButtonBuilder()
          .setCustomId("summarize")
          .setLabel("tldr")
          .setStyle(ButtonStyle.Secondary);

        const speak = new ButtonBuilder()
          .setCustomId("speak")
          .setLabel("speak")
          .setStyle(ButtonStyle.Secondary);

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

        const quiz = new ButtonBuilder()
          .setCustomId("quiz")
          .setLabel("quiz")
          .setStyle(ButtonStyle.Primary);

        const pseudocode = new ButtonBuilder()
          .setCustomId("pseudocode")
          .setLabel("context")
          .setStyle(ButtonStyle.Primary);

        const thoughtsBtn = new ButtonBuilder()
          .setCustomId("add-thoughts-btn_" + random.id)
          .setLabel("+ thought")
          .setStyle(ButtonStyle.Success);

        console.log("random.id" + random.id);

        // const row = new ActionRowBuilder().addComponents(
        //   // repost,
        //   learnMore,
        //   summarize,
        //   share,
        //   quiz,
        //   pseudocode,
        // );

        let transformRow = null
        let engageRow = null
        let metaRow = null

        transformRow = new ActionRowBuilder().addComponents(
          makeAart,
          quiz,
          pseudocode,
          share,
        )
        engageRow = new ActionRowBuilder().addComponents(
          learnMore,
          summarize,
          speak,
        )
        metaRow = new ActionRowBuilder().addComponents(
          thoughtsBtn
        )

        const components = []

        if (transformRow) {
          components.push(transformRow)
        }
        if (engageRow) {
          components.push(engageRow)
        }
        if (metaRow && is_production === "false") {
          components.push(metaRow)
        }
          

        // \n\n[cover](${random.book.cover_image_url})
        const res = await interaction.channel.send({
          content: `> ${random.text}\n\n-- [${
            random.book.title
          } (**affiliate link**)](${await lookupBook(random.book.title)})`,
          components: components,
        });

        interaction.commandName = "random";
        await invocationWorkflowSB(interaction);

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

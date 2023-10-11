// import config from "../../config.json" assert { "type": "json" };
import {
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import { invocationWorkflow, preWorkflow } from "../../invocation.js";
import { lookupBook } from "../../books.js";
import chunk from "chunk-text";
import { queue, processQueue } from "../../shared-queue.js";
import {
  invocationWorkflowSB,
  preWorkflowSB,
} from "../../supabase-invocations.js";

import dotenv from "dotenv";
dotenv.config();

const { quoordinates_server } = process.env;

// post to quoordinates server with the user's input as the body.query
export async function quosLogic(query) {
  const response = await fetch(quoordinates_server, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const json = await response.json();
  return json;
}

export let randomCommand;

if (process.env.is_production === "true") {
  randomCommand = new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search the entire library of Commonplace Bot.")
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription(
          "your search query -- if you don't know what to search, try the `/random` command. Max 100 chars."
        )
        .setRequired(true)
    );
} else {
  randomCommand = new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search the entire library of Commonplace Bot.")
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription(
          "your search query -- if you don't know what to search, try the `/random` command. Max 100 chars."
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

export let data = randomCommand;

export async function execute(interaction) {
  try {
    // check if in thread -- should not work in thread
    if (interaction.channel.type === ChannelType.PublicThread) {
      await interaction.reply({
        content:
          "The `/quos` command does not work in threads. Please use it in the main channel.",
        ephemeral: true,
      });
      return;
    }

    const sentMessage = await interaction.reply({
      content: `<@${interaction.user.id}>, your request has been added to the queue.`,
      ephemeral: true,
    });

    queue.push({
      task: async (user, message) => {
        interaction.commandName = "search";
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
        const userInput = interaction.options.getString("input");
        const quoordinate = await quosLogic(userInput);

        // const quotes = quoordinate
        //   .map(
        //     async (q) =>
        //       `> ${q.text}\n\n-- ${
        //         await lookupBook(q.title)
        //           ? `[${q.title} (**affiliate link**)](${await lookupBook(q.title)})`
        //           : q.title
        //       }\n\n`
        //   )
        //   .filter((q) => q.length < 2000); // still filtering out quotes that are too long because the UX is bad but logic is in conditional below "logic for splitting quotes into multiple messages"

        const ids = [];

        const quotesPromises = quoordinate.map(async (q) => {
          const bookLink = await lookupBook(q.title);
          const quote = `> ${q.text}\n\n-- ${
            bookLink
              ? `[${q.title} (**affiliate link**)](${bookLink})`
              : q.title
          }\n\n`;
          if (quote.length < 2000) {
            console.log(q);
            ids.push({
              id: q.id,
              text: q.text,
              title: q.title,
              thoughts: q.thoughts,
            });
            return quote;
          } else {
            return null;
          }
        });

        const quotes = (await Promise.all(quotesPromises)).filter(Boolean);

        const startMessage = await interaction.channel.send(
          `**Question:** ${userInput}`
        );
        const thread = await startMessage.startThread({
          name: userInput.slice(0, 50) + "...",
          autoArchiveDuration: 60,
          reason: "Sending quotes as separate messages in one thread",
        });

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
          .setLabel("pseudocode")
          .setStyle(ButtonStyle.Primary);

        let transformRow = null;
        let engageRow = null;
        let metaRow = null;

        transformRow = new ActionRowBuilder().addComponents(
          makeAart,
          quiz,
          pseudocode,
          share
        );
        engageRow = new ActionRowBuilder().addComponents(
          learnMore,
          summarize,
          speak
        );

        const components = [];

        if (transformRow) {
          components.push(transformRow);
        }
        if (engageRow) {
          components.push(engageRow);
        }

        let idx = 0;

        let dividesFilenames = [
          "waifu.png",
          "mice.png",
          "skulls.png",
          "shapes.png",
          "kanji.png",
          "planets-1.png",
          "planets-2.png",
          "books.png",
        ];


        for (const quote of quotes) {
          // fetch id by matching quote.text to ids.text
          const matched = ids.find(
            (id) => id.text === quote.split("\n\n")[0].replace("> ", "")
          );

          const thoughtsBtn = new ButtonBuilder()
            .setCustomId("add-thoughts-btn_" + matched.id)
            .setLabel("+ thought")
            .setStyle(ButtonStyle.Success);

          const forLoopRow = new ActionRowBuilder().addComponents(thoughtsBtn);
         
          const qRes = await thread.send({
              content: quote,
              components: components.concat(forLoopRow),
            });
          

          if (matched.thoughts) {
            console.log(typeof interaction.user.id);

            for (const thought of matched.thoughts) {
              console.log(String(thought.userId));
              console.log(interaction.user.id);
              console.log(String(thought.userId) === interaction.user.id);

              // reply to qRes
              
              await qRes.reply({
                content: `<@${thought.userId}> **added a thought on ${
                  thought.createdAt.split("T")[0]
                }**:\n\n${thought.thought}`,
              });
            }
          }

          if (idx < quotes.length - 1) {
            // choose a random divider
            let dividerFilename =
              dividesFilenames[
                Math.floor(Math.random() * dividesFilenames.length)
              ];
            console.log(dividerFilename);
            await thread.send({
              files: [`./dividers/` + dividerFilename],
            });
          }

          idx++;
        }

        await invocationWorkflowSB(interaction);

        await interaction.editReply({
          content: `<@${interaction.user.id}>, your \`/quos\` request has been processed. Link to result: ${thread.url}`,
          ephemeral: true,
        });
      },
      user: interaction.user,
      message: sentMessage,
      interaction: interaction,
    });

    processQueue();
  } catch (err) {
    console.log(err);
  }
}

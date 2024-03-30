import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { lookupBook } from "../../books.js";
import {
  randomExport,
  randomExportWithBookID,
} from "../quoordinates/random.js";
import { complete } from "../../openai_helper.js";
import { quosLogic } from "./quos.js";
import { invocationWorkflow, preWorkflow } from "../../invocation.js";
import {
  invocationWorkflowSB,
  preWorkflowSB,
} from "../../supabase-invocations.js";
import { queue, processQueue } from "../../shared-queue.js";

import dotenv from "dotenv";
dotenv.config();

let curioCommand;

if (process.env.is_production === "true") {
  curioCommand = new SlashCommandBuilder()
    .setName("wander")
    .setDescription(
      "Wander with the help of a guide through the library of Commonplace Bot."
    )
    // add optional command to use book id
    .addStringOption((option) =>
      option
        .setName("book_ids")
        .setDescription(
          "Book ID(s) to filter by (comma separated). See book ID list url in the /help command."
        )
        .setRequired(false)
    );
} else {
  curioCommand = new SlashCommandBuilder()
    .setName("wander")
    .setDescription(
      "Wander with the help of a guide through the library of Commonplace Bot."
    )
    // add optional command to use book id
    .addStringOption((option) =>
      option
        .setName("book_ids")
        .setDescription(
          "Book ID(s) to filter by (comma separated). See book ID list url in the /help command."
        )
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

export const data = curioCommand;

export const TEST = false;

export async function execute(interaction) {
  // check if in thread -- should not work in thread
  if (interaction.channel.type === ChannelType.PublicThread) {
    await interaction.reply({
      content:
        "The `/wander` command does not work in threads. Please use it in the main channel.",
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
      interaction.commandName = "wander";
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
      // get three random quotes
      // ask user which one they like best
      // show them the quote they picked
      const threeQuotes = [];

      if (interaction.options.getString("book_ids")) {
        let bookIDs = interaction.options
          .getString("book_ids")
          .split(",")
          .map((id) => parseInt(id));
        let randomArr = await randomExportWithBookID(bookIDs, 6);
        console.log(randomArr);
        while (threeQuotes.length < 3 && randomArr.length > 0) {
          let random = randomArr.pop();
          if (random.text.length > 2000) continue;

          threeQuotes.push(random);
        }
      } else {
        // start a timer to see how long it takes to get three quotes from randomExport
        let start = new Date().getTime();
        let randomArr = await randomExport(6);
        let end = new Date().getTime();
        let time = end - start;
        console.log("Call to randomExport took " + time + " milliseconds.");

        console.log(randomArr.length);

        while (threeQuotes.length < 3 && randomArr.length > 0) {
          let random = randomArr.pop();
          if (random.text.length > 2000) continue;

          threeQuotes.push(random);
        }
      }

      // use openai to generate a question about each quote
      const questions = [];
      for (const quote of threeQuotes) {
        let question = "";
        if (quote.question) {
          question = quote.question;
          console.log("using question from quote " + question);
        } else
          question = await complete(
            `Generate a single question from this quote. The end user cannot see the quote so DO NOT use any abstract concepts like "the speaker" or "the writer" in your question. BE EXPLICIT. DO NOT ASSUME the reader has read the quote. DO NOT use passive voice and do not use passive pronouns like he/she/they/him/her etc. You can use any of who/what/where/when/why. Say nothing else.\n\nQuote:\n\n${quote.text}\n\nQ:`,
            "gpt-3.5-turbo"
          );
        questions.push({
          question,
          quote,
        });
      }
      // ask user which quote they like best
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("curio__question_1")
          .setLabel("Question 1")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("curio__question_2")
          .setLabel("Question 2")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("curio__question_3")
          .setLabel("Question 3")
          .setStyle(ButtonStyle.Primary)
      );
      const msg = await interaction.followUp({
        content:
          `<@${interaction.user.id}>, **which question are you curious about**?\n\n` +
          questions
            .map((q, i) => `\n\n${i + 1}. ${q.question}`.trim())
            .join("\n"),
        components: [row],
        fetchReply: true,
        ephemeral: true,
      });
      interaction.commandName = "wander";
      // await invocationWorkflow(interaction);
      await invocationWorkflowSB(interaction);
      const filter = (i) => {
        return i.user.id === interaction.user.id;
      };

      await message.edit({
        content: `<@${user}>, your \`/wander\` request has been processed! Link: ${msg.url}`,
        ephemeral: true,
      });

      const collector = msg.createMessageComponentCollector({
        filter,
      });

      collector.on("collect", async (i) => {
        if (
          i.customId === "curio__question_1" ||
          i.customId === "curio__question_2" ||
          i.customId === "curio__question_3"
        ) {
          const collectorMsgQueue = await i.reply({
            content: `<@${i.user.id}>, your request has been added to the queue.`,
            ephemeral: true,
          });

          queue.push({
            task: async (user, message) => {
              i.commandName = "search";

              if (!(await preWorkflowSB(i))) {
                await i.editReply({
                  content:
                    "You have reached your monthly limit for this command: " +
                    i.commandName +
                    ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
                  ephemeral: true,
                });
                return;
              }
              const question =
                questions[parseInt(i.customId.split("_")[3]) - 1];
              const quoordinate = await quosLogic(question.question);

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

              const quotes = (await Promise.all(quotesPromises)).filter(
                Boolean
              );

              const startMessage = await interaction.channel.send(
                `**Question:** ${question.question}`
              );
              const thread = await startMessage.startThread({
                name: question.question.slice(0, 50) + "...",
                autoArchiveDuration: 60,
                type: ChannelType.GUILD_PUBLIC_THREAD,
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
                .setLabel("context")
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
              // link to thread
              i.commandName = "search";
              // await invocationWorkflow(interaction);
              await invocationWorkflowSB(i, false, question.question);
              await i.editReply({
                content: `<@${interaction.user.id}>, your \`/quos\` result has been processed: ${thread.url}`,
              });
            },
            user: i.user.id,
            interaction: i,
            message: collectorMsgQueue,
          });
          processQueue();
        }
      });
    },
    user: interaction.user.id,
    interaction: interaction,
    message: sentMessage,
  });

  processQueue();
}

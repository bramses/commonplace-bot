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

const {
  quoordinates_server_random,
  quoordinates_server_random_in_book,
  is_production,
} = process.env;

export async function randomExport(amount = 3) {
  try {
    const response = await fetch(quoordinates_server_random, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
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

let whoSaidCommand = null;

if (process.env.is_production === "true") {
  whoSaidCommand = new SlashCommandBuilder()
    .setName("whosaidit")
    .setDescription("What author said the follow quote?");
} else {
  whoSaidCommand = new SlashCommandBuilder()
    .setName("whosaidit")
    .setDescription("What author said the follow quote?")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

export const data = whoSaidCommand;

export async function execute(interaction) {
  // check if in thread -- should not work in thread
  if (interaction.channel.type === ChannelType.PublicThread) {
    await interaction.reply({
      content:
        "The `/whosaidit` command does not work in threads. Please use it in the main channel.",
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
        interaction.commandName = "whosaidit";
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
        let randomArr = await randomExport(3);
        let randIdx = 0;
        let random = randomArr[randIdx];

        while (random.text.length > 2000 && randIdx < randomArr.length) {
          randIdx++;
          random = randomArr[randIdx];
        }

        if (randIdx >= randomArr.length) {
          await interaction.editReply({
            content: "Something went wrong. Please try again.",
            ephemeral: true,
          });
          return;
        }

        let authors = randomArr.map((r) => {
          return { author: r.book.author, correct: r.id === random.id };
        });
        // remove duplicates. if the same author matches random remove duplicate that is false
        authors = authors.filter(
          (author, idx, self) =>
            idx === self.findIndex((t) => t.author === author.author)
        );
        // shuffle authors
        for (let i = authors.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [authors[i], authors[j]] = [authors[j], authors[i]];
        }

        // create a button for each author
        const buttons = authors.map((author, idx) => {
          return new ButtonBuilder()
            .setCustomId("whosaidit" + idx +  "_" + author.correct)
            .setLabel(author.author)
            .setStyle(ButtonStyle.Primary);
        });

        const row = new ActionRowBuilder().addComponents(...buttons);

        const affLink = await lookupBook(random.book.title);

        /*
        rm title for challenge
        \n\n-- ${
                  random.book.title
                }

        \n\n-- [${
                  random.book.title
                } (**affiliate link**)](${affLink})
        */

        let res = null;
        if (!affLink) {
          res = await interaction.channel.send({
            content: `> ${random.text}\n\n|| -- ${random.book.title} ||`,
            components: [row],
          });
        } else {
          res = await interaction.channel.send({
            content: `> ${random.text}\n\n|| -- ${random.book.title} ||`,
            components: [row],
          });
        }

        interaction.commandName = "whosaidit";
        await invocationWorkflowSB(interaction);

        await interaction.editReply({
          content: `<@${interaction.user.id}>, your \`/whosaidit\` request has been processed. Link to result: ${res.url}`,
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

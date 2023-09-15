import config from "../../config.json" assert { "type": "json" };
import {
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { invocationWorkflow, preWorkflow } from "../../invocation.js";
import { lookupBook } from "../../books.js";
import chunk from "chunk-text";

const { quoordinates_server } = config;

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
  console.log(json);
  return json;
}

export const data = new SlashCommandBuilder()
  .setName("quos")
  .setDescription("Quote search")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription(
        "your search query -- if you don't know what to search, try the `/random` command. Max 100 chars."
      )
      .setRequired(true)
  );

export async function execute(interaction) {
  try {
    await interaction.deferReply({
      ephemeral: true,
    });

    interaction.commandName = "quos";
    if (!(await preWorkflow(interaction))) {
      await interaction.editReply(
        "You have reached your monthly limit for this command: " +
          interaction.commandName
      );
      return;
    }

    const userInput = interaction.options.getString("input");
    const quoordinate = await quosLogic(userInput);

    const quotes = quoordinate
      .map(
        (q) =>
          `> ${q.text}\n\n-- ${
            lookupBook(q.title)
              ? `[${q.title} (**affiliate link**)](${lookupBook(q.title)})`
              : q.title
          }\n\n`
      )
      .filter((q) => q.length < 2000); // still filtering out quotes that are too long because the UX is bad but logic is in conditional below "logic for splitting quotes into multiple messages"

    const startMessage = await interaction.channel.send(
      "Starting a new thread..."
    );
    const thread = await startMessage.startThread({
      name: userInput.slice(0, 50) + "...",
      autoArchiveDuration: 60,
      reason: "Sending quotes as separate messages in one thread",
    });

    const makeAart = new ButtonBuilder()
      .setCustomId("aart_btn")
      .setLabel("aart")
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

    const row = new ActionRowBuilder().addComponents(
      makeAart,
      learnMore,
      summarize,
      share
    );

    for (const quote of quotes) {
      if (quote.length > 2000) {
        // logic for splitting quotes into multiple messages
        console.log("quote too long");
        // split into multiple messages by last word within 2000 ch and add (cont) if quote is too long the last should have the row

        const title = quote.split("\n\n")[1];

        const strippedQuote = quote.replace(title, "");

        if (strippedQuote.length < 2000) {
          await thread.send({
            content: strippedQuote,
            components: [row],
          });

          await thread.send({
            content: title,
          });
        } else {
          const chunks = chunk(quote, 1990, { min: 1000, max: 1990 });
          for (const chunk of chunks) {
            // if not last chunk
            if (chunk !== chunks[chunks.length - 1]) {
              await thread.send({
                content: chunk + "(cont)",
              });
            } else {
              await thread.send({
                content: chunk,
                components: [row],
              });
            }
          }
        }
      } else {
        await thread.send({
          content: quote,
          components: [row],
        });
      }
    }

    try {
      await interaction.editReply({
        content: `@${interaction.user.username}, here's a thread with quotes that might help you answer your question: ${thread.url}`,
        ephemeral: true,
      });
    } catch (err) {
      console.log(err);
    }

    await invocationWorkflow(interaction);
  } catch (err) {
    console.log(err);
  }
}

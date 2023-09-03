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
      .setDescription("your search query -- if you don't know what to search, try the `/duel` command")
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

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
          lookupBook(q.title) ? `[${q.title}](${lookupBook(q.title)})` : q.title
        }\n\n`
    )
    .filter((q) => q.length < 2000);

  const thread = await interaction.channel.threads.create({
    name: userInput,
    autoArchiveDuration: 60,
    startMessage: interaction.channel.lastMessage,
    type: ChannelType.GUILD_PUBLIC_THREAD,
    reason: "Sending quotes as separate messages in one thread",
  });

  const makeAart = new ButtonBuilder()
    .setCustomId("button_id")
    .setLabel("Make Aart (+1 aart)")
    .setStyle(ButtonStyle.Primary);

  const learnMore = new ButtonBuilder()
    .setCustomId("quos_learn_more")
    .setLabel("Learn More (+1 quos)")
    .setStyle(ButtonStyle.Primary);

    const summarize = new ButtonBuilder()
    .setCustomId("summarize")
    .setLabel("Summarize (+1 quos)")
    .setStyle(ButtonStyle.Primary);

    const share = new ButtonBuilder()
    .setCustomId("share")
    .setLabel("Share")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(makeAart, learnMore, summarize, share);

  for (const quote of quotes) {
    await thread.send({
      content: quote,
      components: [row],
    });
  }
  await interaction.editReply(`Results: ${quoordinate.length} quotes`);
  await invocationWorkflow(interaction);
}

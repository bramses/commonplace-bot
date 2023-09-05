import { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from "discord.js";
import config from "../../config.json" assert { "type": "json" };
import { lookupBook } from "../../books.js";


const { quoordinates_server_random } = config;

export async function randomExport() {
  const response = await fetch(quoordinates_server_random, {
    method: "GET",
  });
  const json = await response.json();

  return json[0];
}

const randomCommand = new SlashCommandBuilder()
  .setName("random")
  .setDescription("Fetch a random quote from the library.");

export const data = randomCommand;

export async function execute(interaction) {
  const random = await randomExport();

  const makeAart = new ButtonBuilder()
    .setCustomId("button_id")
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

  // \n\n[cover](${random.book.cover_image_url})
  await interaction.reply({
    content: `> ${random.text}\n\n-- [${random.book.title} (**affiliate link**)](${lookupBook(random.book.title)})`,
    components: [row],
  });
}

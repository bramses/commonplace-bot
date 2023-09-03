import { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from "discord.js";
import config from "../../config.json" assert { "type": "json" };

const { quoordinates_server_random } = config;

export async function randomExport() {
  const response = await fetch(quoordinates_server_random, {
    method: "GET",
  });
  const json = await response.json();
  console.log(json);
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

  const row = new ActionRowBuilder().addComponents(
    makeAart,
    learnMore,
    summarize
  );

  await interaction.reply({
    content: `> ${random.text}\n\n-- ${random.book.title}\n\n[cover](${random.book.cover_image_url})`,
    components: [row],
  });
}

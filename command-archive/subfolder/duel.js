import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
} from "discord.js";
import fs from "fs";
import { complete } from "../../openai_helper.js";
import { quosLogic } from "../../commands/quoordinates/quos.js";
import { lookupBook } from "../../books.js";

const duelCommand = new SlashCommandBuilder()
  .setName("duel")
  .setDescription("[DO NOT USE] Find quotes based on your responses to two prompts.");

export const data = duelCommand;

// read from the nomic-topics.txt file and split it into an array of strings by newline
const topics = fs.readFileSync("./nomic-topics.txt", "utf8").split("\n");

export async function execute(interaction) {
  // choose two random topics and put them onto buttons
  const topic1 = topics[Math.floor(Math.random() * topics.length)];
  const topic2 = topics[Math.floor(Math.random() * topics.length)];
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("duel__topic_1")
      .setLabel(topic1)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("duel__topic_2")
      .setLabel(topic2)
      .setStyle(ButtonStyle.Primary)
  );

  const response = await interaction.reply({
    content: `@${interaction.user.username}, Which topic do you prefer?`,
    components: [row],
    ephemeral: true,
  });

  const collectorFilter = (i) => i.user.id === interaction.user.id;
  try {
    const confirmation = await response.awaitMessageComponent({
      filter: collectorFilter,
      time: 60_000,
    });

    if (
      confirmation.customId === "duel__topic_1" ||
      confirmation.customId === "duel__topic_2"
    ) {
      let topic = null;
      if (confirmation.customId === "duel__topic_1") {
        topic = confirmation.message.components[0].components[0].label;
      } else if (confirmation.customId === "duel__topic_2") {
        topic = confirmation.message.components[0].components[1].label;
      }

      const questionsRes = await complete(
        `Create two different short questions (less than 80 chars) about ${topic} that you would ask someone else to get them to talk about it.`
      );

      // create two buttons with the questions as labels
      const question1 = questionsRes.split("\n")[0];
      const question2 = questionsRes.split("\n")[1];

      // create buttons for each question
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("duel__question_1")
          .setLabel("1 is fun")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("duel__question_2")
          .setLabel("2 milord!")
          .setStyle(ButtonStyle.Primary)
      );

      console.log(
        "waiting for second confirmation as " + confirmation.customId
      );
      await confirmation.update({
        content: `Which question do you prefer?\n${question1}\n${question2}`,
        components: [row],
        ephemeral: true,
      });

      //   const collectorFilter = (i) => i.user.id === interaction.user.id;
      console.log("above awaitMessageComponent for second confirmation");
      const confirmation2 = await response.awaitMessageComponent({
        filter: collectorFilter,
        time: 60_000,
      });
      console.log("got second confirmation " + confirmation2.customId);

      let embeddedSearches = [];
      let chosenQuestion = null;

      confirmation2.deferReply();

      if (confirmation2.customId === "duel__question_1") {
        embeddedSearches = await quosLogic(question1);
        chosenQuestion = question1;
      } else if (confirmation2.customId === "duel__question_2") {
        embeddedSearches = await quosLogic(question2);
        chosenQuestion = question2;
      }

      const quotes = embeddedSearches
        .map(
          (q) =>
            `> ${q.text}\n\n-- ${
              lookupBook(q.title)
                ? `[${q.title} (**affiliate link**)](${lookupBook(q.title)})`
                : q.title
            }\n\n`
        )
        .filter((q) => q.length < 2000);

      const thread = await interaction.channel.threads.create({
        name: chosenQuestion,
        autoArchiveDuration: 60,
        startMessage: interaction.channel.lastMessage,
        type: ChannelType.GUILD_PUBLIC_THREAD,
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

      const row2 = new ActionRowBuilder().addComponents(
        makeAart,
        learnMore,
        summarize,
        share
      );

      for (const quote of quotes) {
        await thread.send({
          content: quote,
          components: [row2],
        });
      }

      await confirmation.editReply({
        content: `Generating quotes based on your responses to two prompts. Topic: **${topic}** Question: **${chosenQuestion}**`,
        components: [],
        ephemeral: true,
      });
    } else {
      console.log("not a valid customId");
    }
  } catch (e) {
    console.log(e);
    await interaction.editReply({
      content: "Confirmation not received within 1 minute, cancelling",
      components: [],
    });
  }
}

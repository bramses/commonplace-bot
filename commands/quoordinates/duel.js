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
import { quosLogic } from "./quos.js";
import { lookupBook } from "../../books.js";


const duelCommand = new SlashCommandBuilder()
  .setName("duel")
  .setDescription("Find quotes based on your responses to two prompts.");

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

    if (confirmation.customId === "duel__topic_1") {
      // get topic from button label
      const topic = confirmation.message.components[0].components[0].label;
      const questionsRes = await complete(
        `Create two different short questions (less than 80 characters) about ${topic} that you would ask someone else to get them to talk about it.`
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

      await confirmation.update({
        content: `Which question do you prefer?\n${question1}\n${question2}\nRespond with 1 or 2 emoji.`,
        components: [row],
        ephemeral: true,
      });

      const collectorFilter = (i) => i.user.id === interaction.user.id;
      try {
        const confirmation = await response.awaitMessageComponent({
          filter: collectorFilter,
          time: 60_000,
        });

        if (confirmation.customId === "duel__question_1") {
          // run quosLogic with question1
            try {
                await confirmation.deferReply();
                const quoordinate = await quosLogic(question1);
                // console.log(quoordinate);
                const quotes = quoordinate
                    .map(
                        (q) =>
                            `> ${q.text}\n\n-- ${
                                lookupBook(q.title) ? `[${q.title}](${lookupBook(q.title)})` : q.title
                            }\n\n`
                    )
                    .filter((q) => q.length < 2000);
    
                    
    
                const thread = await interaction.channel.threads.create({
                    name: question1,
                    autoArchiveDuration: 60,
                    startMessage: interaction.channel.lastMessage,
                    type: ChannelType.GUILD_PUBLIC_THREAD,
                    reason: "Sending quotes as separate messages in one thread",
                });
    
                // console.log(thread);
    
                const makeAart = new ButtonBuilder()
                    .setCustomId("button_id")
                    .setLabel("Make Aart (+1 aart)")
                    .setStyle(ButtonStyle.Primary);
    
                const learnMore = new ButtonBuilder()
                    .setCustomId("quos_learn_more")
                    .setLabel("Learn More (+1 quos)")
                    .setStyle(ButtonStyle.Primary);
    
                const row = new ActionRowBuilder().addComponents(makeAart, learnMore);
    
                for (const quote of quotes) {
                    await thread.send({
                        content: quote,
                        components: [row],
                    });
                }
            } catch (err) {
                console.log(err);
            }

            await confirmation.update({
                content: `Results: ${quoordinate.length} quotes`,
                components: [],
                ephemeral: true,
            });


        }
      } catch (e) {
        console.log(e);
      }
    } else if (confirmation.customId === "cancel") {
      await confirmation.update({
        content: "Action cancelled",
        components: [],
      });
    }
  } catch (e) {
    console.log(e);
    await interaction.editReply({
      content: "Confirmation not received within 1 minute, cancelling",
      components: [],
    });
  }
}

import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
  } from "discord.js";
  import fs from "fs";
  import path from "path";
  import qR from "../../quote-royale.json" assert { "type": "json" };
  import { lookupBook } from "../../books.js";
  
  // lookup title in books.json and return url if found
  
  const quotesOfTheDay = qR.quotes;
  
  const quoteRoyaleCommand = new SlashCommandBuilder()
    .setName("quote-royale")
    .setDescription(
      "[WIP] Quote Battle (once daily -- grants access to the secret Quote Royale channel)"
    );
  
  export const data = quoteRoyaleCommand;
  
  export async function execute(interaction) {
    // shuffle quotesOfTheDay
    // pick first 2
    // send in ephemeral message where user can vote
    // take winner and next quote and repeat
    // after 5 rounds, grant access to secret channel and append vote tallies to quote-royale.json
  
    // interaction.user is the object representing the User who ran the command
  
    const user = interaction.user.username;
    const shuffledQuotes = Array.from(quotesOfTheDay).sort(
      () => Math.random() - 0.5
    );
  
    let incumbent = shuffledQuotes.pop();
    let challenger = shuffledQuotes.pop();
    let winner = incumbent;
    let round = 0;
  
    while (round < 5) {
      let response = await quoteBattle(interaction, incumbent, challenger, round);
      // collect resopnse
      const collectorFilter = (i) => i.user.id === interaction.user.id;
      try {
        const confirmation = await response.awaitMessageComponent({
          filter: collectorFilter,
          time: 60_000,
        });
  
        if (
          confirmation.customId === "quote-royale__quote_1" ||
          confirmation.customId === "quote-royale__quote_2"
        ) {
          if (confirmation.customId === "quote-royale__quote_1") {
            winner = incumbent;
          } else if (confirmation.customId === "quote-royale__quote_2") {
            winner = challenger;
          }
          // update incumbent and challenger
          incumbent = winner;
          challenger = shuffledQuotes.pop();
          round++;
        } else {
          throw new Error("Invalid customId");
        }
      } catch (error) {
        console.error(error);
        await interaction.editReply({
          content: `@${interaction.user.username}, you did not respond in time.`,
          ephemeral: true,
        });
        return;
      }
    }
  
    console.log("winner");
    console.log(winner);
  }
  
  const quoteBattle = async (interaction, incumbent, challenger, round) => {
    console.log(incumbent);
    console.log("vs");
    console.log(challenger);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("quote-royale__quote_1")
        .setLabel("1")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("quote-royale__quote_2")
        .setLabel("2")
        .setStyle(ButtonStyle.Primary)
    );
  
    if (round === 0) {
      return await interaction.reply({
        content: `@${interaction.user.username}, Which quote do you prefer? 
              1.\n> ${incumbent.text}\n\n-- [${
          incumbent.book.title
        } (**affiliate link**)](${await lookupBook(incumbent.book.title)})
              2.\n> ${challenger.text}\n\n-- [${
          challenger.book.title
        } (**affiliate link**)](${await lookupBook(challenger.book.title)})`,
        components: [row],
        ephemeral: true,
      });
    } else {
      return await interaction.editReply({
        content: `@${interaction.user.username}, Which quote do you prefer? 
              1.\n> ${incumbent.text}\n\n-- [${
          incumbent.book.title
        } (**affiliate link**)](${await lookupBook(incumbent.book.title)})
              2.\n> ${challenger.text}\n\n-- [${
          challenger.book.title
        } (**affiliate link**)](${await lookupBook(challenger.book.title)})`,
        components: [row],
        ephemeral: true,
      });
    }
  };
  
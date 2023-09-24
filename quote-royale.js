/**
 * @fileoverview
 * at midnight, fetch five random quotes and post it to a new temporary channel called #quote-royale-<date>
 * then create a message with the quotes and a button to vote for each quote
 * user can vote for one quote per day
 * at end of day (11 est), tally votes and post winner to #quote-royale-winners
 * clear channel at midnight and repeat with new channel
 */

import { randomExport } from "./commands/quoordinates/random.js";
import {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { lookupBook } from "./books.js";
import fs from "node:fs";

const createQuoteRoyaleChannel = async (client) => {
  const guild = await client.guilds.fetch("1059980663404646420");
  const categoryID = "1151964359514411038"

  const channel = await guild.channels.create({
    name: `quote-royale-${new Date().toISOString().split("T")[0]}`,
    type: ChannelType.GUILD_TEXT,
    topic: "ONLY ONE QUOTE REIGNS SUPREME.",
    reason: "Quote Royale",
    parent: categoryID,
  });
  return channel;
};

const postQuotes = async (channel) => {
  const quotes = [];

  for (let i = 0; i < 5; i++) {
    let random = await randomExport();
    while (random.text.length > 2000) {
      random = await randomExport();
    }
    quotes.push(random);
  }

  // send each quote as a separate message
  for (const quote of quotes) {
    await channel.send({
      content: `> ${quote.text}\n\n-- [${
        quote.book.title
      } (**affiliate link**)](${await lookupBook(quote.book.title)})`,
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("qroyale__quote_1")
      .setLabel("Quote 1")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("qroyale__quote_2")
      .setLabel("Quote 2")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("qroyale__quote_3")
      .setLabel("Quote 3")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("qroyale__quote_4")
      .setLabel("Quote 4")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("qroyale__quote_5")
      .setLabel("Quote 5")
      .setStyle(ButtonStyle.Primary)
  );

  const message = await channel.send({
    content: "Vote for your favorite quote!",
    components: [row],
  });

  // write quotes to json file with { quotes: quotes, votes: 0, voters: [] }
  const quotesWithVotes = {
    quotes: quotes,
    votes: [0, 0, 0, 0, 0],
    voters: [],
  };

  // write quotes to json file with { quote: quote, votes: 0, voters: [] }
  fs.writeFileSync(
    "./quotes-votes.json",
    JSON.stringify(quotesWithVotes, null, 2)
  );

  return message;
};

const calculateWinner = (quotesVotes) => {
  let winner = 0;
  let winnerIndex = 0;
  for (let i = 0; i < quotesVotes.votes.length; i++) {
    if (quotesVotes.votes[i] > winner) {
      winner = quotesVotes.votes[i];
      winnerIndex = i;
    }
  }

  return {
    quote: quotesVotes.quotes[winnerIndex],
    votes: winner,
  };
};

export const quoteRoyale = async (client) => {
  const guild = await client.guilds.fetch("1059980663404646420");
  let winner = null;
  let channelDate = null;

  // check if channel already exists
  const existingChannel = guild.channels.cache.find((channel) =>
    channel.name.startsWith("quote-royale-")
  );
  if (existingChannel) {
    // check if channel matches today's date
    const today = new Date().toISOString().split("T")[0];
    // quote-royale-2023-09-08
    channelDate =
      existingChannel.name.split("-")[2] +
      "-" +
      existingChannel.name.split("-")[3] +
      "-" +
      existingChannel.name.split("-")[4];
    console.log(`today: ${today}, channelDate: ${channelDate}`);

    if (today === channelDate) {
      // channel is up to date, do nothing
      return existingChannel;
    }

    const quotesVotes = JSON.parse(fs.readFileSync("./quotes-votes.json"));
    winner = calculateWinner(quotesVotes);

    // channel is not up to date, delete it
    await existingChannel.delete();
  }

  const channel = await createQuoteRoyaleChannel(client);
  const message = await postQuotes(channel);

  if (winner && channelDate) {
    // post winner in general 1059980664222515273
    const general = await guild.channels.fetch("1059980664222515273");
    const winnersCircle = await guild.channels.fetch("1151964589102211094");
    await general.send({
      content: `THE WINNER OF QUOTE ROYALE ${channelDate} IS...\n\n> ${
        winner.quote.text
      }\n\n-- [${winner.quote.book.title} (**affiliate link**)](${await lookupBook(
        winner.quote.book.title
      )}).
        
        Vote for your favorite from the next five contenders in Quote Royale! <#${
            channel.id
        }>`,
    });
    await winnersCircle.send({
      content: `THE WINNER OF QUOTE ROYALE ${channelDate} IS...\n\n> ${
        winner.quote.text
      }\n\n-- [${winner.quote.book.title} (**affiliate link**)](${await lookupBook(
        winner.quote.book.title
      )}).
        
        Vote for your favorite from the next five contenders in Quote Royale! <#${
            channel.id
        }>`,
    });
  }

  return message;
};

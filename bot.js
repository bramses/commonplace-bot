import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  NewsChannel,
  ThreadChannel,
} from "discord.js";
import { main } from "./commands/dalle/aart.js";
import { invocationWorkflow, preWorkflow } from "./invocation.js";
import { quosLogic } from "./commands/quoordinates/quos.js";
import { lookupBook } from "./books.js";
import { complete } from "./openai_helper.js";

import { CronJob } from "cron";
import { randomExport } from "./commands/quoordinates/random.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
import config from "./config.json" assert { "type": "json" };

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const channelId = "1144620340509675541"; // replace with your channel ID
  const job = new CronJob(
    "*/60 * * * *",
    async () => {
      console.log("You will see this message every hour");
      const random = await randomExport();
      const channel = await client.channels.fetch(channelId);

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

	  const row = new ActionRowBuilder().addComponents(
		makeAart,
		learnMore,
		summarize,
		share
	  );

      await channel.send({
		content: `> ${random.text}\n\n-- ${random.book.title}\n\n[cover](${random.book.cover_image_url})`,
		components: [row],
	  });
    },
    null,
    true,
    "America/New_York"
  );
  job.start();
});

client.commands = new Collection();
const foldersPath = new URL("./commands", import.meta.url).pathname;
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  if (interaction.isButton()) {
    if (interaction.customId === "summarize") {
      await interaction.deferReply();
      await preWorkflow(interaction);
      // get text from interaction.message.content and pass it to complete
      const summary = await complete(
        `TLDR to one or two sentences this:\n${interaction.message.content}`
      );
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(summary);
      } else {
        await interaction.reply(summary);
      }
      interaction.commandName = "summarize";
      await invocationWorkflow(interaction, true);
    } else if (interaction.customId === "button_id") {
      await interaction.deferReply();
      await preWorkflow(interaction);
      const { prompt, imageUrl } = await main(interaction.message.content);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(
          `Art Prompt (**save the image it disappears in 24 hours!**): ${prompt} \n Image: [(url)](${imageUrl})`
        );
      } else {
        await interaction.reply(
          `Art Prompt (**save the image it disappears in 24 hours!**): ${prompt} \n Image: [(url)](${imageUrl})`
        );
      }
      console.log(imageUrl);
      // set interaction command name to aart
      interaction.commandName = "aart";
      await invocationWorkflow(interaction, true);
    } else if (interaction.customId === "share") {
      /*
		1. get an image url from aart
		2. post to quoordinates server with the following
		{
			"text": {userInput},
			"url": {imageUrl}
		}
		3. get back a url and reply with it
		*/
      await interaction.deferReply();
      await preWorkflow(interaction);
      let userInput = interaction.message.content.trim();
      // remove [cover](url) from userInput
      const regex = /\[cover\]\((.*)\)/;
      const match = userInput.match(regex);
      if (match) {
        userInput = userInput.replace(match[0], "").trim();
      }

      // await interaction.followUp("This feature is not yet implemented.");

      const { prompt, imageUrl } = await main(userInput);
      const response = await fetch(config.quoordinates_server_share, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: userInput, url: imageUrl }),
      });
      const json = await response.json();
      console.log(json);
      const shareUrl = json.result;

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(`${shareUrl}`);
      }
      interaction.commandName = "share";
      await invocationWorkflow(interaction, true);
    } else if (interaction.customId === "quos_learn_more") {
      await interaction.deferReply();
      await preWorkflow(interaction);
      const similarQuos = await quosLogic(interaction.message.content);

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

      const row = new ActionRowBuilder().addComponents(
        makeAart,
        learnMore,
        summarize,
        share
      );

      // get other messages in current thread
      if (interaction.channel instanceof ThreadChannel) {
        console.log(`Parent channel ID: ${interaction.channel.id}`);
        const threadId = interaction.channel.id; // replace with your thread ID
        const thread = await client.channels.fetch(threadId);
        if (thread instanceof ThreadChannel) {
          const messages = await thread.messages.fetch();
          const messagesContent = messages.map((m) => m.content);

          const quotes = similarQuos
            .filter((q) => {
              return !interaction.message.content.includes(q.text);
            })
            .filter((q) => {
              // q.text is the quote should not be in any of the messages from messagesContent
              return !messagesContent.some((m) => m.includes(q.text));
            })
            .map(
              (q) =>
                `> ${q.text}\n\n-- ${
                  lookupBook(q.title)
                    ? `[${q.title}](${lookupBook(q.title)})`
                    : q.title
                }\n\n`
            )
            .filter((q) => q.length < 2000);
          // append quotes to thread

          if (quotes.length === 0) {
            await interaction.followUp({
              content: "No more quotes found!",
              components: [],
            });
          } else {
            for (const quote of quotes) {
              await interaction.followUp({
                content: quote,
                components: [row],
              });
            }
          }

          interaction.commandName = "quos";
          await invocationWorkflow(interaction, true);
        } else {
          console.log("The channel with the provided ID is not a thread.");
        }
      } else {
        if (interaction.replied || interaction.deferred) {
          const quotes = similarQuos
            .filter((q) => {
              return !interaction.message.content.includes(q.text);
            })
            .map(
              (q) =>
                `> ${q.text}\n\n-- ${
                  lookupBook(q.title)
                    ? `[${q.title}](${lookupBook(q.title)})`
                    : q.title
                }\n\n`
            )
            .filter((q) => q.length < 2000);
          // append quotes to thread

          if (quotes.length === 0) {
            await interaction.followUp({
              content: "No more quotes found!",
              components: [],
            });
          } else {
            for (const quote of quotes) {
              await interaction.followUp({
                content: quote,
                components: [row],
              });
            }
          }

          interaction.commandName = "quos";
        } else {
          console.log("Tin the reply or defer");
        }
        await invocationWorkflow(interaction, true);
      }
    }

    return;
  } else {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      console.log(
        `[ERROR] There was an error while executing the command ${interaction.commandName}.`
      );
      console.log(`[ERROR] ${JSON.stringify(error.rawError.errors.content)}`);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  }
});
client.login(config.token);

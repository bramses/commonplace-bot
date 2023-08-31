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
} from "discord.js";
import { main } from "./commands/dalle/aart.js";
import { invocationWorkflow, preWorkflow } from "./invocation.js";
import { quosLogic } from "./commands/quoordinates/quos.js";
import { lookupBook } from "./books.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
import config from "./config.json" assert { "type": "json" };

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
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
    if (interaction.customId === "button_id") {
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
      // set interaction command name to aart
      interaction.commandName = "aart";
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

      const row = new ActionRowBuilder().addComponents(makeAart, learnMore);

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

      for (const quote of quotes) {
        await interaction.followUp({
          content: quote,
          components: [row],
        });
      }

      interaction.commandName = "quos";
      await invocationWorkflow(interaction, true);
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

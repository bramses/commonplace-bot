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
  Partials,
} from "discord.js";
import { main } from "./commands/dalle/aart.js";
import { invocationWorkflow, preWorkflow } from "./invocation.js";
import { quosLogic } from "./commands/quoordinates/quos.js";
import { lookupBook } from "./books.js";
import { complete } from "./openai_helper.js";

import { CronJob } from "cron";
import { randomExport } from "./commands/quoordinates/random.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
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

      await channel.send({
        content: `> ${random.text}\n\n-- [${
          random.book.title
        } (**affiliate link**)](${lookupBook(random.book.title)})`,
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

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }

  // Now the message has been cached and is fully available
  console.log(
    `${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`
  );
  // The reaction is now also fully available and the properties will be reflected accurately:
  console.log(
    `${reaction.count} user(s) have given the same reaction to this message! ${reaction.emoji.name}`
  );

  // log the reaction and if reaction is :floppy_disk: then dm the user with the message content
  if (reaction.emoji.name === "💾") {
    await user.send(`${reaction.message.content}`);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  if (interaction.isButton()) {
    if (interaction.customId === "summarize") {
      await interaction.deferReply();
      await preWorkflow(interaction);
      console.log(
        interaction.message.content
          .replace(/\(\*\*affiliate link\*\*\)/g, "")
          .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
          .trim()
      );
      // get text from interaction.message.content and pass it to complete
      const summary = await complete(
        `tldr to one or two sentences this:\n${interaction.message.content
          .replace(/\(\*\*affiliate link\*\*\)/g, "")
          .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
          .trim()}`
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

      // remove leading >
      userInput = userInput.replace(/^>/, "").trim();

      // remove any markdown links
      userInput = userInput.replace(/\[(.*?)\]\((.*?)\)/g, "$1");

      // remove (**affiliate link**) from userInput
      userInput = userInput.replace(/\(\*\*affiliate link\*\*\)/g, "").trim();

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
    } else if (interaction.customId === "repost") {
      await interaction.deferReply();
      const channels = [
        {
          name: "00-cs-info",
          description:
            "This section covers general works that include a variety of topics, often serving as reference materials. Encyclopedias, bibliographies, journals, and other compilations fall under this classification. It also includes works on computers, information technology, and data processing, which are increasingly significant in this digital age. Items related to journalism and news media can also be found here.",
          id: "1148700226996154518",
          tags: [
            "generalities",
            "encyclopedia",
            "encyclopedias",
            "computer",
            "computers",
            "information technology",
            "journalism",
            "news media",
          ],
        },
        {
          name: "100-phil-psy",
          description:
            "This category focuses on human thought, reasoning, and the mind. Works in philosophy discuss fundamental issues like existence, morality, and knowledge, while psychology texts explore mental processes, behavior, and the human psyche. Classical philosophical treatises and contemporary psychological studies both find their home in this section.",
          id: "1148693095655940187",
          tags: [
            "philosophy",
            "psychology",
            "psychoanalysis",
            "psychotherapy",
            "psychotherapist",
            "psychoanalyst",
            "psychologist",
            "psychiatrist",
            "psychiatry",
          ],
        },
        {
          name: "200-religion",
          description:
            "This section contains works related to religious beliefs, practices, and institutions. Texts from a wide array of religious traditions including Christianity, Islam, Hinduism, Buddhism, and others are categorized here. Topics may range from sacred texts and theology to religious history and comparative religion.",
          id: "1148693201012662292",
          tags: ["religion", "faith", "spirituality", "theology"],
        },
        {
          name: "300-soc-sci",
          description:
            "This category encompasses works that study human society and social relationships. Subjects such as economics, politics, law, education, and sociology fall under this section. It offers a broad overview of how human groups function, interact, and are governed.",
          id: "1148693249737887815",
          tags: [
            "social science",
            "social sciences",
            "economics",
            "politics",
            "law",
            "education",
            "sociology",
          ],
        },
        {
          name: "400-lang",
          description:
            "This section is dedicated to works that explore the complexities of language and linguistics. It includes dictionaries, grammars, and instructional material for learning different languages. Topics may range from the structure of language to the study of specific languages and language families.",
          id: "1148693285330763907",
          tags: [
            "language",
            "languages",
            "linguistics",
            "grammar",
            "dictionary",
            "dictionaries",
          ],
        },
        {
          name: "500-science",
          description:
            "This section houses texts related to the natural world and its phenomena, from physics and chemistry to earth sciences and biology. Mathematics books also find their place here, covering topics from arithmetic to advanced calculus and theoretical mathematics.",
          id: "1148693329203167334",
          tags: [
            "science",
            "physics",
            "chemistry",
            "biology",
            "earth science",
            "math",
            "mathematics",
          ],
        },
        {
          name: "600-tech",
          description:
            "This category covers practical sciences and their applications in daily life. Subfields include medicine, engineering, agriculture, home economics, and many other technologies that shape modern society. Manuals, guides, and professional literature are typical in this section.",
          id: "1148693368742883399",
          tags: [
            "technology",
            "applied science",
            "applied sciences",
            "medicine",
            "engineering",
            "agriculture",
            "home economics",
          ],
        },
        {
          name: "700-arts",
          description:
            "This section is a hub for works related to the arts, entertainment, and recreation. Whether it's painting, music, theater, sports, or photography, this classification provides a home for the creative and recreational aspects of human culture.",
          id: "1148693419854659615",
          tags: ["art", "arts", "recreation", "music", "sports", "games"],
        },
        {
          name: "800-lit",
          description:
            "This section is devoted to literature in all its forms, including poetry, essays, drama, and fiction. Works are often organized by their original language or country of origin, providing a global perspective on literary traditions. Anthologies, literary criticism, and works on writing techniques are also found here.",
          id: "1148693465073467472",
          tags: [
            "literature",
            "poetry",
            "essay",
            "essays",
            "drama",
            "fiction",
            "novel",
            "novels",
            "book",
            "books",
            "shakespeare",
          ],
        },
        {
          name: "900-hist-geo",
          description:
            "This section contains works that explore the human past and the world around us. Histories of various nations, civilizations, and significant events are grouped here, along with geographical works that examine the Earth's features and political boundaries. Travel guides, atlases, and maps are common in this category.",
          id: "1148693527228850227",
          tags: [
            "history",
            "geography",
            "historical",
            "historian",
            "historians",
            "geographer",
            "geographers",
            "civilization",
            "civilizations",
            "geopolitics",
            "geopolitical",
            "travel",
            "atlas",
            "atlases",
            "map",
            "maps",
          ],
        },
      ];

      /*
	  600-tech: 1148693368742883399
	  700-arts: 1148693419854659615
	  800-lit: 1148693465073467472
	  900-hist-geo: 1148693527228850227

	  */

      // use complete function to match the prompt to a channel
    //   const channelTags = await complete(
    //     `Which of these channels tags matches this message content the most? Just return the channel name. Message: ${
    //       interaction.message.content
    //     } Channels: ${channels
    //       .map((c) => c.name + " : [" + c.tags.join(" ") + "]")
    //       .join("\n")}`
    //   );
	  const channel = await complete(
        `Which of these channels descriptions matches this book quote the most? Just return the channel name. Quote: ${
          interaction.message.content.replace(/\[(.*?)\]\((.*?)\)/g, "$1").replace(/\(\*\*affiliate link\*\*\)/g, "")
        } Channels:\n\n${channels
          .map((c) => c.name + " : " + c.description)
          .join("\n\n")}`, "gpt-3.5-turbo"
      );
	  console.log(`Which of these channels descriptions matches this book quote the most? Just return the channel name. Quote: ${
		interaction.message.content.replace(/\[(.*?)\]\((.*?)\)/g, "$1").replace(/\(\*\*affiliate link\*\*\)/g, "")
	  } Channels:\n\n${channels
		.map((c) => c.name + " : " + c.description)
		.join("\n\n")}`)
      console.log(channel); // 200-religion : [religion faith spirituality theology]
      const channelName = channel.split(" : ")[0];
      const targetChannelId = channels.find((c) => c.name === channelName).id;

      const targetChannel = await client.channels.fetch(targetChannelId);

      /*
	  TODO:
			[{"type":1,"components":[{"type":2,"style":1,"label":"repost","custom_id":"repost"},{"type":2,"style":1,"label":"delve","custom_id":"quos_learn_more"},{"type":2,"style":1,"label":"tldr","custom_id":"summarize"},{"type":2,"style":1,"label":"share","custom_id":"share"}]}]
			remove the repost button

			const filteredComponents = interaction.message.components.map((c) => {
        return {
          type: c.type,
          components: c.components.filter((c) => c.customId !== "repost"),
        };
      });

	  */

      targetChannel.send({
        content: interaction.message.content,
        components: interaction.message.components,
      });
      interaction.commandName = "repost";
      // delete the original message
      await interaction.message.delete();
      // reply ephemeral with link to reposted message
      await interaction.editReply({
        content: `Moved to https://discord.com/channels/${interaction.guildId}/${targetChannelId}/${interaction.message.id}`,
        ephemeral: true,
      });
    } else if (interaction.customId === "quos_learn_more") {
      await interaction.deferReply();
      await preWorkflow(interaction);
      const similarQuos = await quosLogic(interaction.message.content);

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
                    ? `[${q.title} (**affiliate link**)](${lookupBook(
                        q.title
                      )})`
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
          // get the last 10 messages in the channel
          const messages = await interaction.channel.messages.fetch({
            limit: 10,
          });
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
                    ? `[${q.title} (**affiliate link**)](${lookupBook(
                        q.title
                      )})`
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

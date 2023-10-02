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
  ButtonComponent,
  ThreadChannel,
  Partials,
  ChannelType,
} from "discord.js";
import { main } from "./commands/dalle/aart.js";
import { invocationWorkflow, preWorkflow } from "./invocation.js";
import { invocationWorkflowSB, preWorkflowSB } from "./supabase-invocations.js";
import { quosLogic } from "./commands/quoordinates/quos.js";
import { lookupBook } from "./books.js";
import { complete } from "./openai_helper.js";
import { generateClozeDeletion } from "./anki.js";

import { CronJob } from "cron";
import { randomExport } from "./commands/quoordinates/random.js";
import { quoteRoyale } from "./quote-royale.js";
import { processQueue, queue } from "./shared-queue.js";

import { createClient } from "@supabase/supabase-js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
// import config from "./config.json" assert { "type": "json" };
import dotenv from "dotenv";

dotenv.config();

const { supabaseUrl, supabaseKey } = process.env;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const channelId = "1151221056951038025"; // replace with your channel ID
  const job = new CronJob(
    "*/60 * * * *",
    async () => {
      try {
        console.log("You will see this message every hour");
        let random = await randomExport();

        while (random.text.length > 2000) {
          random = await randomExport();
        }

        const channel = await client.channels.fetch(channelId);

        //   const repost = new ButtonBuilder()
        //   .setCustomId("repost")
        //   .setLabel("new-home")
        //   .setStyle(ButtonStyle.Primary);

        //   const makeAart = new ButtonBuilder()
        //     .setCustomId("aart_btn")
        //     .setLabel("draw")
        //     .setStyle(ButtonStyle.Primary);

        //   const learnMore = new ButtonBuilder()
        //     .setCustomId("quos_learn_more")
        //     .setLabel("delve")
        //     .setStyle(ButtonStyle.Primary);

        const summarize = new ButtonBuilder()
          .setCustomId("summarize")
          .setLabel("tldr")
          .setStyle(ButtonStyle.Primary);

        const share = new ButtonBuilder()
          .setCustomId("share")
          .setLabel("share")
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(summarize, share);

        await channel.send({
          content: `> ${random.text}\n\n-- [${
            random.book.title
          } (**affiliate link**)](${await lookupBook(random.book.title)})`,
          components: [row],
        });
      } catch (err) {
        console.error(err);
      }
    },
    null,
    true,
    "America/New_York"
  );
  job.start();

  // create a job to run quoteRoyale(client); every day at 12:00 AM EST
  const job2 = new CronJob(
    "0 0 * * *",
    async () => {
      try {
        console.log("You will see this message every day at 12:00 AM EST");
        await quoteRoyale(client);
      } catch (err) {
        console.error(err);
      }
    },
    null,
    true,
    "America/New_York"
  );

  job2.start();
  
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

  // log the reaction and if reaction is :floppy_disk: then dm the user with the message content and the url to the message
  if (reaction.emoji.name === "💾") {
    await user.send(`${reaction.message.content}\n\n${reaction.message.url}`);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // List of channel IDs where the bot should respond
  // const allowedChannels = ['1144620340509675541'];

  // if (!allowedChannels.includes(interaction.channelId) && process.env.NODE_ENV !== 'production') {
  //   return interaction.reply({ content: 'I\'m not allowed to interact in this channel!', ephemeral: true });
  // }

  if (interaction.isButton()) {
    if (interaction.customId === "summarize") {
      interaction.commandName = "summarize";

      const sentMessage = await interaction.reply({
        content: `<@${interaction.user.id}>, your request has been added to the queue.`,
        ephemeral: true,
      });

      queue.push({
        task: async (user, message) => {
          if (!(await preWorkflowSB(interaction))) {
            await interaction.editReply({
              content:
                "You have reached your monthly limit for this command: " +
                interaction.commandName +
                ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
              ephemeral: true,
            });
            return;
          }

          const summary = await complete(
            `tldr to one or two sentences this:\n${interaction.message.content
              .replace(/\(\*\*affiliate link\*\*\)/g, "")
              .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
              .trim()}`
          );

          const res = await interaction.followUp(summary);
          interaction.commandName = "summarize";
          await invocationWorkflowSB(interaction, true);

          await message.edit({
            content: `<@${user}>, your \`/tldr\` request has been processed! Link: ${res.url}`,
            ephemeral: true,
          });
        },
        user: interaction.user.id,
        interaction: interaction,
        message: sentMessage,
      });

      processQueue();
    } else if (interaction.customId === "quiz") {
      interaction.commandName = "quiz";

      const sentMessage = await interaction.reply({
        content: `<@${interaction.user.id}>, your request has been added to the queue.`,
        ephemeral: true,
      });

      queue.push({
        task: async (user, message) => {
          if (!(await preWorkflowSB(interaction))) {
            await interaction.editReply({
              content:
                "You have reached your monthly limit for this command: " +
                interaction.commandName +
                ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
              ephemeral: true,
            });
            return;
          }

          const quiz = await complete(
            `Hey Teachers assistant! Turn this quote into a one to three question quiz (your discretion). The form should be "Question: ||Answer||". Make sure to surround answer with "||" so its hidden from the students. Just return the quiz and nothing else.\n\nQuote:\n${interaction.message.content
              .replace(/\(\*\*affiliate link\*\*\)/g, "")
              .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
              .trim()}`
          );

          const res = await interaction.followUp(quiz);
          interaction.commandName = "quiz";
          await invocationWorkflowSB(interaction, true);

          await message.edit({
            content: `<@${user}>, your \`/quiz\` request has been processed! Link: ${res.url}`,
            ephemeral: true,
          });
        },
        user: interaction.user.id,
        interaction: interaction,
        message: sentMessage,
      });

      processQueue();
    } else if (interaction.customId === "pseudocode") {
      interaction.commandName = "pseudocode";

      const sentMessage = await interaction.reply({
        content: `<@${interaction.user.id}>, your request has been added to the queue.`,
        ephemeral: true,
      });

      queue.push({
        task: async (user, message) => {
          if (!(await preWorkflowSB(interaction))) {
            await interaction.editReply({
              content:
                "You have reached your monthly limit for this command: " +
                interaction.commandName +
                ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
              ephemeral: true,
            });
            return;
          }

          const pseudocodeRes = await complete(
            `You are a surrealist creative technologist who has a graduate degree in Computer Science and mathematics. You are paid very well to think outside the box and come up with never before thought of surreal app ideas, your ideas are always hits on the app store because there are no similar offerings. You don't come up with boring ideas that are straightforward, you deeply think about your quote and provide your clients the best option. You have access to the GPT-4 API, ReactJS, Go Lang for CLI apps, Swift for iOS apps, p5.js and three.js for web canvas, and any HTTP calls. If you'd like to use any libraries or SaaS tools, merely add a comment as to what they are and why. Use this quote and convert it to an app idea and psuedocode. Total should be less than 1000 chars. If you use \`\`\` for the pseudocode make sure to include the programming language e.g. \`\`\`swift or \`\`\`js or \`\`\`go for example. Choose whatever language is best.\n\nQuote:\n${interaction.message.content
              .replace(/\(\*\*affiliate link\*\*\)/g, "")
              .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
              .trim()}`
          );

          // split the pseudocodeRes into the description and code block (specified by ```)
          const pseudocodeResSplit = pseudocodeRes.split("```");
          const pseudocodeResDescription = pseudocodeResSplit[0];
          const pseudocodeResCodeBlock = pseudocodeResSplit[1];

          // fence the code block with ``` and the language if not already
          const pseudocodeResCodeBlockFenced =
            pseudocodeResCodeBlock.startsWith("```") &&
            pseudocodeResCodeBlock.endsWith("```")
              ? pseudocodeResCodeBlock
              : `\`\`\`${pseudocodeResCodeBlock.trim()}\`\`\``;

          // if either is greater than 2000 chars, return gracefully
          if (
            pseudocodeResDescription.length > 2000 ||
            pseudocodeResCodeBlockFenced.length > 2000
          ) {
            await interaction.editReply({
              content: `<@${user}>, your \`/pseudocode\` request has been processed! However, the result was too long to post in a single message. Please try again.`,
              ephemeral: true,
            });
            return;
          }

          const res = await interaction.followUp(pseudocodeResDescription);
          await interaction.followUp(pseudocodeResCodeBlockFenced);
          interaction.commandName = "pseudocode";
          await invocationWorkflowSB(interaction, true);

          await message.edit({
            content: `<@${user}>, your \`/pseudocode\` request has been processed! Link: ${res.url}`,
            ephemeral: true,
          });
        },
        user: interaction.user.id,
        interaction: interaction,
        message: sentMessage,
      });

      processQueue();
    } else if (interaction.customId === "follow_up_questions") {
      await interaction.deferReply({
        ephemeral: true,
      });
      // use complete to generate three follow up questions based on the interaction.message.content
      // user then sees three questions
      // they can click buttons 1, 2, 3 for a quos on that question

      // todo make it work for all three questions not just the first one
      // todo respond in thread to follow up follow ups
      // todo why do some interactions fail randomly? collector? length of text?

      const followUpQuestions = await complete(
        `What are three follow up questions to this quote? These questions should all be unique, simple conceptually and very different from one another. One question for each of the following (if applicable): people places and things.\n\n${interaction.message.content
          .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
          .replace(/\(\*\*affiliate link\*\*\)/g, "")}`,
        "gpt-3.5-turbo"
      );
      const followUpQuestionsArray = followUpQuestions.split("\n");
      const followUpQuestionsArrayTrimmed = followUpQuestionsArray.map((q) =>
        q.trim()
      );
      const followUpQuestionsArrayFiltered =
        followUpQuestionsArrayTrimmed.filter((q) => q !== "");
      const followUpQuestionsArrayFilteredUnique = [
        ...new Set(followUpQuestionsArrayFiltered),
      ];
      const followUpQuestionsArrayFilteredUniqueThree =
        followUpQuestionsArrayFilteredUnique.slice(0, 3);
      console.log(followUpQuestionsArrayFilteredUniqueThree);
      const followUpQuestionsArrayFilteredUniqueThreeString =
        followUpQuestionsArrayFilteredUniqueThree.join("\n");

      const btn_question_one = new ButtonBuilder()
        .setCustomId("btn_question_one")
        .setLabel("1")
        .setStyle(ButtonStyle.Primary);

      const btn_question_two = new ButtonBuilder()
        .setCustomId("btn_question_two")
        .setLabel("2")
        .setStyle(ButtonStyle.Primary);

      const btn_question_three = new ButtonBuilder()
        .setCustomId("btn_question_three")
        .setLabel("3")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(
        btn_question_one,
        btn_question_two,
        btn_question_three
      );

      await interaction.followUp({
        content: followUpQuestionsArrayFilteredUniqueThreeString,
        components: [row],
        ephemeral: true,
      });

      const collectorFilter = (i) => {
        return i.user.id === interaction.user.id;
      };

      const collector = interaction.channel.createMessageComponentCollector({
        filter: collectorFilter,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "btn_question_one") {
          console.log(i);
          await i.deferReply();

          const quos = await quosLogic(
            followUpQuestionsArrayFilteredUniqueThree[0]
          );
          const quotes = quos
            .filter((q) => q.text.length < 2000)
            .filter((q) => {
              console.log("debug");
              console.log(q.text);
              console.log(interaction.message.content);
              return !interaction.message.content.includes(q.text);
            })
            .map(
              async (q) =>
                `> ${q.text}\n\n-- ${
                  (await lookupBook(q.title))
                    ? `[${q.title} (**affiliate link**)](${await lookupBook(
                        q.title
                      )})`
                    : q.title
                }\n\n`
            );

          const thread = await i.channel.threads.create({
            name:
              followUpQuestionsArrayFilteredUniqueThree[0]
                .replace(/^\d+\.\s/, "")
                .slice(0, 50) + "...",
            autoArchiveDuration: 60,
            startMessage: i.channel.lastMessage,
            type: ChannelType.GUILD_PUBLIC_THREAD,
            reason: "Sending quotes as separate messages in one thread",
          });
          for (const quote of quotes) {
            await thread.send({
              content: quote,
              components: [],
            });
          }
          await i.editReply(`Results: ${quotes.length} quotes`);
        }
        if (i.customId === "btn_question_two") {
          await i.deferReply();
          const quos = await quosLogic(
            followUpQuestionsArrayFilteredUniqueThree[1]
          );
          await i.followUp(quos);
        }
        if (i.customId === "btn_question_three") {
          await i.deferReply();
          const quos = await quosLogic(
            followUpQuestionsArrayFilteredUniqueThree[2]
          );
          await i.followUp(quos);
        }
      });
    } else if (interaction.customId.includes("qroyale__quote_")) {
      // on button click show ephemeral message thanking user for voting
      // if user has already voted, show ephemeral message saying they can only vote once per day
      // await interaction.deferReply();
      const buttonId = interaction.customId;
      const quoteNumber = Number(buttonId.split("qroyale__quote_")[1]);
      // const quotesVotes = JSON.parse(fs.readFileSync("./quotes-votes.json"));
      // last row in db
      const { data , error } = await supabase
        .from("quote-votes")
        .select("*")
        .order("id", { ascending: false })
        .limit(1);

      if (error) {
        console.log(error);
        return;
      }

      const quotesVotes = data[0];

      const userId = interaction.user.id;
      // { quotes: quotes, votes: [0,0,0,0,0], voters: [] }
      const voters = quotesVotes.voters;
      if (voters.includes(userId)) {
        await interaction.reply({
          content: `You have already voted today! Check back tomorrow (EST) for the results. And come back tomorrow to vote again on a new set of quotes!`,
          ephemeral: true,
        });
        return;
      }
      quotesVotes.votes[quoteNumber - 1] =
        quotesVotes.votes[quoteNumber - 1] + 1;
      quotesVotes.voters.push(userId);
      // fs.writeFileSync(
      //   "./quotes-votes.json",
      //   JSON.stringify(quotesVotes, null, 2)
      // );
      // update db
      const { data: data2, error: error2 } = await supabase
        .from("quote-votes")
        .update({ votes: quotesVotes.votes, voters: quotesVotes.voters })
        .eq("id", quotesVotes.id);

      if (error2) {
        console.log(error2);
        return;
      }
      await interaction.reply({
        content: `You voted for quote ${quoteNumber}! Check back tomorrow (EST) for the results. And come back tomorrow to vote again on a new set of quotes!`,
        ephemeral: true,
      });
    } else if (interaction.customId === "aart_btn") {
      const sentMessage = await interaction.reply({
        content: `<@${interaction.user.id}>, your request has been added to the queue.`,
        ephemeral: true,
      });

      queue.push({
        task: async (user, message) => {
          interaction.commandName = "draw";
          if (!(await preWorkflowSB(interaction))) {
            await interaction.editReply({
              content:
                "You have reached your monthly limit for this command: " +
                interaction.commandName +
                ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
              ephemeral: true,
            });
            return;
          }
          const { prompt, imageUrl } = await main(interaction.message.content);

          // send message to channel
          const channelMsg = await interaction.channel.send(
            `Art Prompt (**save the image it disappears in 24 hours!**): ${prompt} \n Image: [(url)](${imageUrl})`
          );

          interaction.commandName = "draw";
          await invocationWorkflowSB(interaction, true);
          await interaction.editReply({
            content: `<@${interaction.user.id}>, your request has been completed. Link to result: ${channelMsg.url}`,
            ephemeral: true,
          });
        },
        user: interaction.user,
        message: sentMessage,
        interaction,
      });

      processQueue();
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
      // await interaction.deferReply();

      const sentMessage = await interaction.reply({
        content: `<@${interaction.user.id}>, your request has been added to the queue.`,
        ephemeral: true,
      });

      try {
        queue.push({
          task: async (user, message) => {
            interaction.commandName = "share";
            if (!(await preWorkflowSB(interaction))) {
              await interaction.editReply({
                content:
                  "You have reached your monthly limit for this command: " +
                  interaction.commandName +
                  ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
                ephemeral: true,
              });
              return;
            }
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
            userInput = userInput
              .replace(/\(\*\*affiliate link\*\*\)/g, "")
              .trim();

            // await interaction.followUp("This feature is not yet implemented.");

            const { prompt, imageUrl } = await main(userInput);

            if (prompt === "Error generating prompt.") {
              await interaction.followUp({
                content: "Something went wrong. Please try again.",
                ephemeral: true,
              });
              return;
            }

            const response = await fetch(
              process.env.quoordinates_server_share,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: userInput, url: imageUrl }),
              }
            );
            const json = await response.json();

            console.log(json);

            if (json.error) {
              await interaction.followUp({
                content: "Something went wrong. Please try again.",
                ephemeral: true,
              });
              return;
            }

            const shareUrlHorizontal = json.result.horizontal;
            const shareUrlVertical = json.result.vertical;
            const res = await interaction.followUp(`Art Prompt: ${prompt}\n\nHorizontal:\n\n${shareUrlHorizontal}\n\nVertical:\n\n${shareUrlVertical}`);

            interaction.commandName = "share";
            await invocationWorkflowSB(interaction, true);

            await message.edit({
              content: `<@${user}>, your \`/share\` request has been processed! Link: ${res.url}`,
              ephemeral: true,
            });
          },
          user: interaction.user.id,
          interaction: interaction,
          message: sentMessage,
        });

        processQueue();
      } catch (err) {
        console.log(err);
        await interaction.followUp({
          content: "Something went wrong. Please try again.",
          ephemeral: true,
        });
      }
    } else if (interaction.customId === "cloze_deletion") {
      interaction.commandName = "cloze_deletion";
      await preWorkflow(interaction);
      await interaction.deferReply({
        ephemeral: true,
      });

      const text = interaction.message.content
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
        .replace(/\(\*\*affiliate link\*\*\)/g, "")
        .replace(/^>/, "")
        .trim();

      const cloze = await generateClozeDeletion(text);

      await interaction.editReply({
        content: "done! see quiz below",
        ephemeral: true,
      });

      await interaction.channel.send({
        content: `${cloze}\n\nLink to original message: https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.message.id}`,
        ephemeral: false,
      });

      interaction.commandName = "cloze_deletion";
      await invocationWorkflowSB(interaction, true);
    } else if (interaction.customId === "repost") {
      interaction.commandName = "repost";
      if (!(await preWorkflow(interaction))) {
        await interaction.editReply({
          content:
            "You have reached your monthly limit for this command: " +
            interaction.commandName +
            ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({
        ephemeral: true,
      });
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
        `Which of these channels descriptions matches this book quote the most?  The descriptions are from the 2011 Dewey Decimal Classification system. Just return the channel name, say nothing else. Quote: ${interaction.message.content
          .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
          .replace(/\(\*\*affiliate link\*\*\)/g, "")} Channels:\n\n${channels
          .map((c) => c.name + " : " + c.description)
          .join("\n\n")}`,
        "gpt-3.5-turbo"
      );
      //   console.log(`Which of these channels descriptions matches this book quote the most? Just return the channel name. Quote: ${
      // 	interaction.message.content.replace(/\[(.*?)\]\((.*?)\)/g, "$1").replace(/\(\*\*affiliate link\*\*\)/g, "")
      //   } Channels:\n\n${channels
      // 	.map((c) => c.name + " : " + c.description)
      // 	.join("\n\n")}`)
      //   console.log(channel); // 200-religion : [religion faith spirituality theology]
      const channelName = channel.split(" : ")[0];
      const targetChannelId = channels.find((c) => c.name === channelName).id;

      const targetChannel = await client.channels.fetch(targetChannelId);

      // create new components without the repost button
      const makeAart = new ButtonBuilder()
        .setCustomId("aart_btn")
        .setLabel("draw")
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

      const newMsg = await targetChannel.send({
        content: interaction.message.content,
        components: [row],
      });
      // delete the original message
      await interaction.message.delete();
      // reply ephemeral with link to reposted message
      await interaction.editReply({
        content: `Moved to https://discord.com/channels/${interaction.guildId}/${targetChannelId}/${newMsg.id}`,
        ephemeral: true,
      });

      interaction.commandName = "repost";
      await invocationWorkflowSB(interaction, true);
    } else if (interaction.customId === "quos_learn_more") {
      const sentMessage = await interaction.reply({
        content: `<@${interaction.user.id}>, your request has been added to the queue.`,
        ephemeral: true,
      });

      queue.push({
        task: async (user, message) => {
          interaction.commandName = "delve";
          if (!(await preWorkflowSB(interaction))) {
            await interaction.editReply({
              content:
                "You have reached your monthly limit for this command: " +
                interaction.commandName +
                ". You can get more invocations by supporting the project [here](https://www.bramadams.dev/discord/)!",
              ephemeral: true,
            });
            return;
          }
          const similarQuos = await quosLogic(interaction.message.content);

          const makeAart = new ButtonBuilder()
            .setCustomId("aart_btn")
            .setLabel("draw")
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

            const quiz = new ButtonBuilder()
              .setCustomId("quiz")
              .setLabel("quiz")
              .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder().addComponents(
            makeAart,
            learnMore,
            summarize,
            share,
            quiz
          );

          // get other messages in current thread
          if (interaction.channel instanceof ThreadChannel) {
            const threadId = interaction.channel.id; // replace with your thread ID
            const thread = await client.channels.fetch(threadId);
            if (thread instanceof ThreadChannel) {
              const messages = await thread.messages.fetch();
              const messagesContent = messages.map((m) => m.content);

              const quotesPromises = similarQuos
                .filter((q) => {
                  return !interaction.message.content.includes(q.text);
                })
                .filter((q) => {
                  // q.text is the quote should not be in any of the messages from messagesContent
                  return !messagesContent.some((m) => m.includes(q.text));
                })
                .map(async (q) => {
                  const bookLink = await lookupBook(q.title);
                  const quote = `> ${q.text}\n\n-- ${
                    bookLink
                      ? `[${q.title} (**affiliate link**)](${bookLink})`
                      : q.title
                  }\n\n`;
                  return quote.length < 2000 ? quote : null;
                });

              const quotes = (await Promise.all(quotesPromises)).filter(
                Boolean
              );

              let firstQuote = null;

              if (quotes.length === 0) {
                firstQuote = await interaction.followUp({
                  content: "No more quotes found!",
                  components: [],
                });
              } else {
                for (const quote of quotes) {
                  if (!firstQuote) {
                    firstQuote = await interaction.followUp({
                      content: quote,
                      components: [row],
                    });
                  } else {
                    await interaction.followUp({
                      content: quote,
                      components: [row],
                    });
                  }
                }
              }

              interaction.commandName = "delve";
              await invocationWorkflowSB(interaction, true);

              await message.edit({
                content: `<@${user}>, your \`/delve\` request has been processed! Link: ${firstQuote.url}`,
                ephemeral: true,
              });
            } else {
              console.log("The channel with the provided ID is not a thread.");
            }
          } else {
            // create a new thread and post the quotes there
            const startMessage = await interaction.channel.send(
              `${interaction.message.content}`
            );
            const thread = await startMessage.startThread({
              name:
                interaction.message.content
                  .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
                  .replace(/\(\*\*affiliate link\*\*\)/g, "")
                  .slice(0, 50) + "...",
              autoArchiveDuration: 60,
              type: ChannelType.GUILD_PUBLIC_THREAD,
              reason: "Sending quotes as separate messages in one thread",
            });

            const quotesPromises = similarQuos
              .filter((q) => {
                return !interaction.message.content.includes(q.text);
              })
              .map(async (q) => {
                const bookLink = await lookupBook(q.title);
                const quote = `> ${q.text}\n\n-- ${
                  bookLink
                    ? `[${q.title} (**affiliate link**)](${bookLink})`
                    : q.title
                }\n\n`;
                return quote.length < 2000 ? quote : null;
              });

            const quotes = (await Promise.all(quotesPromises)).filter(Boolean);

            if (quotes.length === 0) {
              await thread.send({
                content: "No more quotes found!",
                components: [],
              });
            } else {
              for (const quote of quotes) {
                await thread.send({
                  content: quote,
                  components: [row],
                });
              }
            }

            interaction.commandName = "delve";
            await invocationWorkflowSB(interaction, true);

            await message.edit({
              content: `<@${user}>, your \`/delve\` request has been processed! Link: ${thread.url}`,
              ephemeral: true,
            });
          }
        },
        user: interaction.user.id,
        interaction: interaction,
        message: sentMessage,
      });

      processQueue();
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

client.on("guildMemberAdd", (member) => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.cache.find(
    (ch) => ch.name === "onboarding"
  );
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(
    `Welcome to the server, ${member}! Let's get started by typing \`/wander\` in this channel. Then follow the prompts! You may also prefer to go through the official Discord onboarding workflow and introduce yourself here!`
  );
});

if (process.env.is_production === "true") {
  client.login(process.env.token);
} else {
  client.login(process.env.test_token);
  console.log("test token");
}

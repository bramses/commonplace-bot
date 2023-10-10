import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ThreadChannel,
} from "discord.js";
import { processQueue, queue } from "../../shared-queue.js";
import {
  invocationWorkflowSB,
  preWorkflowSB,
} from "../../supabase-invocations.js";
import { complete } from "../../openai_helper.js";

import dotenv from "dotenv";
dotenv.config();

let thesisCommand = null;

if (process.env.is_production === "true") {
  thesisCommand = new SlashCommandBuilder()
    .setName("thesis")
    .setDescription(
      "Builds a thesis from every message in thread responded to with :thesis:"
    );
} else {
  thesisCommand = new SlashCommandBuilder()
    .setName("thesis")
    .setDescription(
      "Builds a thesis from every message in thread responded to with :thesis:"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

export const data = thesisCommand;

export async function execute(interaction, client) {
  if (interaction.channel.type !== ChannelType.PublicThread) {
    await interaction.reply({
      content:
        "The `/thesis` command only works in threads. Please use it in a thread.",
      ephemeral: true,
    });
    return;
  }

  try {
    const sentMessage = await interaction.reply({
      content: `<@${interaction.user.id}>, your request has been added to the queue.`,
      ephemeral: true,
    });

    let preamble = `Merge the quotes into a short bullet point list of shared ideas and why. Bring the shared idea down to earth so it can be understood in isolation, without context. Ignore singleton ideas, just discuss shared concepts. Don't just rehash the quotes and summarize them, really create a narrative of shared logic. Example: If it does not include an "and" between two or more quotes, its probably not supposed to be in! Later shared ideas should reference earlier shared ideas to build the argument. E.g. shared argument #2 should reference #1, and #3 should reference #2 or #1 and so on.\n\n`;

    queue.push({
      task: async (user, message) => {
        interaction.commandName = "thesis";
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

        

        const threadId = interaction.channel.id; // replace with your thread ID
        const thread = await client.channels.fetch(threadId);
        if (thread instanceof ThreadChannel) {
          const starterMessage = await thread.fetchStarterMessage();
          const starterMessageContent = starterMessage.content;
          preamble = preamble.concat(
            `Query: ${starterMessageContent.replace(`**Question:**`,"")}\n\n`
          );
          const messagesManager = await thread.messages.fetch();
          const messages = messagesManager;
          // console.log(messages);
          const messagesContent = messages.map((m) => m.content);
          
          const msgUrls = []
          const thesisMessages = messages.filter((msg) => {
            // reject any messages that dont start with > and include -- (the title) and dont include :thesis:
             if (msg.reactions.cache.has("📜") && msg.content.startsWith(">") && msg.content.includes("--")) {
                msgUrls.push(msg.url);
                return true;
             }
          });

          const thesisText = thesisMessages
            .map((msg) => {
              return (
                msg.content
                  .split("\n")                   
                  // remove the title
                  .filter((line) => {
                    return !line.startsWith("--");
                  })
                  .join("\n")
              );
            })
            // shuffle
            .sort(() => Math.random() - 0.5);

          preamble = preamble.concat(thesisText.join("\n\n"));

          console.log(preamble);

          const result = await complete(preamble);
            console.log(result);


            await interaction.channel.send({
                content: `**Thesis for messages:** ${msgUrls.map(url => `${url}`).join(", ")}`,
            });
            // do not show embeds
            await interaction.channel.send({
                content: `${result}`,    
            });

        }

        interaction.commandName = "thesis";
        await invocationWorkflowSB(interaction, false, preamble);

        await interaction.editReply({
          content: `<@${
            interaction.user.id
          }>, your \`/thesis\` request has been processed. Link to result: ${true}`,
          ephemeral: true,
        });
      },
      user: interaction.user,
      message: sentMessage,
      interaction: interaction,
    });

    processQueue();
  } catch (err) {
    await interaction.reply({
      content: `Something went wrong: ${err}`,
    });
  }
}

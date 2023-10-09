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

import dotenv from "dotenv";
dotenv.config();

let thesisCommand = null;

if (process.env.is_production === "true") {
  thesisCommand = new SlashCommandBuilder()
    .setName("nyi-thesis")
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

export async function execute(interaction) {
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
        const thread = await interaction.guild.channels.fetch(threadId);
        if (thread instanceof ThreadChannel) {
          const messagesManager = await thread.messages.fetch({ limit: 100 }); // fetch up to 100 messages
          const messages = messagesManager;
          console.log(messages);
          const messagesContent = messages.map((m) => m.content);
          console.log(messagesContent);
          const thesisMessages = messages.filter((msg) => {
            return msg.reactions.cache.has("📜");
          });

          console.log(thesisMessages.map((msg) => msg.content));

          const thesisText = thesisMessages
            .map((msg) => {
              return msg.content
                .split("\n")
                .map((line) => {
                  return line.replace(/^> /, "");
                })
                // remove the title
                .filter((line) => {
                  return !line.startsWith("--");
                })
                .join("\n");
            })
            

          console.log(thesisText);
        }
       
    

        interaction.commandName = "thesis";
        await invocationWorkflowSB(interaction);

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

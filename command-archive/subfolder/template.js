import { SlashCommandBuilder } from "discord.js";
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

export async function execute(interaction) {
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
            
            interaction.commandName = "thesis";
            await invocationWorkflowSB(interaction);
    
            await interaction.editReply({
              content: `<@${interaction.user.id}>, your \`/thesis\` request has been processed. Link to result: ${res.url}`,
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

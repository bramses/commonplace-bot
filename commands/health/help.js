import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

let helpCommand;

if (process.env.is_production === "true") {
  helpCommand = new SlashCommandBuilder()
    .setName("help")
    .setDescription("How to use Commonplace Bot");
} else {
  helpCommand = new SlashCommandBuilder()
    .setName("help")
    .setDescription("How to use Commonplace Bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

export const data = helpCommand;

export async function execute(interaction) {
  await interaction.reply(`**Commonplace Bot** is a bot that serves this Discord as a librarian, gallery curator, artist, games master and more!
  
## Slash Commands

- \`/quos\` - Find quotes based on your search query. The algorithm is semantic, so if it can't find anything, it will return something that is similar. Try asking questions like "what is the philosophy of the tech industry" or even declarative statements like "Napoleon was first given the rank of general in Italy". If you don't know what to search, try the \`/random\` command and then \`delve\` into any topic that takes your eye. Costs 1 \`quos\` credit.
- \`/random\` - Fetch a random quote from the library. Costs 1 \`random\` credit.
- \`/aart\` - Creates an abstract image and art prompt that can be copied into MJ of DALL-E or whatever based on input. Costs 1 \`aart\` credit.


## Buttons
- \`aart\` - (see above)
- \`delve\` - Delve deeper into the quotes main ideas, explore its neighbors. Costs 1 \`delve\` credit.
- \`tldr\` - Summarize the quote. Really great when the quote is long but you want the general idea. Costs 1 \`tldr\` credit.
- \`share\` - Share the quote by overlaying the quote text onto an \`aart\` creation. Every time is unique! Costs 1 \`share\` credit.
- \`repost\` - Repost the quote to a more fitting channel. Costs 1 \`repost\` credit. Only available from the \`/random\` command.

## Other Commands

React to any message with the floppy disk emoji (💾, : floppy_disk : (no spaces)) to save the quote to your personal library.

## Community

Visit the #quote-royale channel to participate in the Quote Royale! Every day, 5 quotes are posted and you can vote on which one you like the most. The winner is crowned Champion and is added to the Hall of Fame.

## Open Source

Commonplace Bot is open source! You can see the bot source code here: <https://github.com/bramses/bramdroid>

Read more at <https://www.bramadams.dev/discord/> or ping @bramses`);
}

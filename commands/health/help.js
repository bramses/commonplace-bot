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

- \`/wander\` - Wander with a guide through the library of Commonplace Bot. Costs 1 \`wander\` credit. To wander in a book, use \`/wander <book id>\`. You can see the book list [here](https://bramses.notion.site/67debd06db5e43ef84ec87e99b32fe96?v=f105c32bb51342558a3e12a628de655a&pvs=4).
- \`/search\` - Find quotes based on your search query. The algorithm is semantic, so if it can't find anything, it will return something that is similar. 
- \`/random\` - Fetch a random quote from the library. Costs 1 \`random\` credit.


## Buttons
- \`draw\` - (see above)
- \`delve\` - Delve deeper into the quotes main ideas, explore its neighbors. Costs 1 \`delve\` credit.
- \`tldr\` - Summarize the quote. Really great when the quote is long but you want the general idea. Costs 1 \`tldr\` credit.
- \`share\` - Share the quote by overlaying the quote text onto an \`draw\` creation. Every time is unique! Costs 1 \`share\` credit.

## Other Commands

React to any message with the floppy disk emoji (💾, : floppy_disk : (no spaces)) to save the quote to your personal library.

## Community

Visit the #quote-royale channel to participate in the Quote Royale!

## Open Source

Commonplace Bot is open source! You can see the bot source code here: <https://github.com/bramses/bramdroid>

Read more at <https://www.bramadams.dev/discord/> or ping @bramses`);
}

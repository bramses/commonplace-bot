// currently deprecated, but will be used in the future, cron is running in bot.js bc i couldnt figure out how to get it to work here by moving the client

import { CronJob } from "cron";
import { randomExport } from "./commands/quoordinates/random.js";
import { Client } from "discord.js";

const client = new Client();
const channelId = '1147334209984274522'; // replace with your channel ID

export const job = new CronJob("* * * * *", async () => {
    console.log("You will see this message every minute")
    const random = await randomExport();

    const channel = await client.channels.fetch(channelId);
    if (!channel.isText()) {
        console.log(`Channel with ID ${channelId} is not a text-based channel`);
        return;
    }
    channel.send(`Random export: ${random}`);
}, null, true, "America/New_York");

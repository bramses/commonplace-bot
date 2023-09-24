import { REST, Routes, PermissionFlagsBits } from 'discord.js';
// import config from './config.json' assert { "type": "json" };

import dotenv from "dotenv";

dotenv.config();
import fs from 'node:fs';
import path from 'node:path';

let clientId;
let token;
const { guildId, is_production } = process.env;

if (is_production === "true") {
	clientId = process.env.clientId;
	token = process.env.token;
} else {
	clientId = process.env.test_client_id;
	token = process.env.test_token;
	console.log('Using test client ID');
}

const commands = [];
const permissions = [];
// Grab all the command files from the commands directory you created earlier
const foldersPath = new URL('./commands', import.meta.url).pathname;
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(filePath);

		if ('TEST' in command && command.TEST && is_production === "true") {
			console.log(`[WARNING] The command at ${filePath} has TEST set to true and will not be deployed.`);
			continue;
		}

		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);
		
		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
		console.log(error.data);
	}
})();
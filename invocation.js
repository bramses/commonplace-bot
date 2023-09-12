
import { GuildMember } from 'discord.js';
import fs from 'node:fs';

// extract user name from interaction
const getUserName = (interaction) => {
    let tag = interaction.tag || interaction.user.tag
    if (interaction.member instanceof GuildMember) {
        

        return interaction.user.username + '#' + interaction.member.user.id;
    }
    else {
        return interaction.user.username + '#' + interaction.user.id;
    }
}

// if user not in invocations.json, add them
const addUser = (interaction, invocations) => {
    const userName = getUserName(interaction);
    if (!(userName in invocations)) {
        invocations[userName] = {};
        invocations[userName].commands = [];
        invocations[userName].lifetimeInvocations = 0;
        invocations[userName].commandInvocations = {}
        invocations[userName].isMember = false;
        invocations[userName].isComped = false;
        invocations[userName].dayOfSignup = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    }

    return invocations;
}

// add invocation to invocations.json
const addInvocation = (interaction, invocations, isButton = false, query = null) => {
    const userName = getUserName(interaction);

    if (isButton) {
        // use interaction.message.content as query
        query = interaction.message.content;
    } else {
        // use interaction.options.getString('input') as query
        query = query || interaction.options.getString('input') || null;
    }

    invocations[userName].commands.push({
        command: interaction.commandName,
        time: new Date().toISOString(),
        query: query,
    });
    if (interaction.commandName in invocations[userName].commandInvocations) {
        invocations[userName].commandInvocations[interaction.commandName] += 1;
    } else {
        invocations[userName].commandInvocations[interaction.commandName] = 1;
    }

    invocations[userName].lifetimeInvocations += 1;

    return invocations;
}

// save invocations.json
const saveInvocations = (invocations) => {
    fs.writeFileSync('./invocations.json', JSON.stringify(invocations, null, 2));
}

// if 28 days have passed since user signup date, reset commandInvocations and reset dayOfSignup to today
const resetCommandInvocations = (invocations) => {
    const today = new Date().toISOString().slice(0, 10);
    const dayReset = 28;
    for (const userName in invocations) {
        const dayOfSignup = invocations[userName].dayOfSignup;
        const daysSinceSignup = Math.floor((Date.parse(today) - Date.parse(dayOfSignup)) / 86400000);
        if (daysSinceSignup >= dayReset) {
            invocations[userName].commandInvocations = {};
            invocations[userName].dayOfSignup = today;
        }
    }
    
    return invocations;
}

export const resetCommandInvocationsChoreWorkflow = () => {
    let invocations = loadInvocations();
    invocations = resetCommandInvocations(invocations);
    saveInvocations(invocations);
}

// load invocations.json
const loadInvocations = () => {
    try {
        const data = fs.readFileSync('./invocations.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        return {};
    }
}

const loadCommandLimits = () => {
    try {
        const data = fs.readFileSync('./command_limits.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        return {};
    }
}


// main function
export const invocationWorkflow = async (interaction, isButton = false, query = null) => {
    let invocations = loadInvocations();
    invocations = addInvocation(interaction, invocations, isButton, query);
    saveInvocations(invocations);

    return invocations;
}

export const preWorkflow = async (interaction) => {
    let invocations = loadInvocations();
    invocations = addUser(interaction, invocations);
    saveInvocations(invocations);

    return checkCommandLimits(interaction, invocations);
}

const checkCommandLimits = async (interaction, invocations) => {
    const commandLimits = loadCommandLimits();
    const userName = getUserName(interaction);
    const userInvocations = invocations[userName];
    const isMember = userInvocations.isMember;
    const isComped = userInvocations.isComped;
    const commandName = interaction.commandName;

    if (isComped) {
        return true;
    }

    if (commandName in commandLimits) {
        const commandLimit = commandLimits[commandName][isMember ? 'member' : 'free'];
        const commandInvocations = userInvocations.commandInvocations[commandName];

        if (commandInvocations >= commandLimit) {
            return false;
        }
    }

    return true;
}

import { GuildMember } from "discord.js";
import { createClient } from "@supabase/supabase-js";
import config from "./config.json" assert { "type": "json" };

const { supabaseUrl, supabaseKey } = config;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

// extract user name from interaction
const getUserName = (interaction) => {
  let tag = interaction.tag || interaction.user.tag;
  if (interaction.member instanceof GuildMember) {
    return interaction.user.username + "#" + interaction.member.user.id;
  } else {
    return interaction.user.username + "#" + interaction.user.id;
  }
};

// if user not in invocations table, add them
const addUser = async (interaction) => {
  const userName = getUserName(interaction);

  const { data, error } = await supabase
    .from("invocations")
    .select("*")
    .eq("username", userName);

  if (error) {
    console.log(error);
    return;
  }

  if (data.length === 0) {
    const { data, error } = await supabase.from("invocations").insert([
      {
        username: userName,
        commands: [],
        commandInvocations: {},
        dayOfSignup: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        tier: "free",
        lifetimeInvocations: 0,
      },
    ]);

    if (error) {
      console.log(error);
      return;
    }
  }
};

// add invocation to username in invocations table
const addInvocation = async (interaction, isButton = false, query = null) => {
  const userName = getUserName(interaction);

  if (isButton) {
    // use interaction.message.content as query
    query = interaction.message.content;
  } else {
    // use interaction.options.getString('input') as query
    query = query || interaction.options.getString("input") || null;
  }

  const { data, error } = await supabase
    .from("invocations")
    .select("*")
    .eq("username", userName);

  if (error) {
    console.log(error);
    return;
  }

  const user = data[0];

  user.commands.push({
    command: interaction.commandName,
    time: new Date().toISOString(),
    query: query,
  });

  // trim commands to last 10 if more than 10

  if (user.commands.length > 10) {
    user.commands = user.commands.slice(-10);
  }

  if (interaction.commandName in user.commandInvocations) {
    user.commandInvocations[interaction.commandName] += 1;
  } else {
    user.commandInvocations[interaction.commandName] = 1;
  }

  user.lifetimeInvocations += 1;

  const { insertData, insertError } = await supabase
    .from("invocations")
    .update({
      commands: user.commands,
      commandInvocations: user.commandInvocations,
      lifetimeInvocations: user.lifetimeInvocations,
    })
    .eq("username", userName);

  if (insertError) {
    console.log(insertError);
    return;
  }
};

// save invocations.json
// const saveInvocations = (invocations) => {
//   fs.writeFileSync("./invocations.json", JSON.stringify(invocations, null, 2));
// };

// if 28 days have passed since user signup date, reset commandInvocations and reset dayOfSignup to today
const resetCommandInvocations = async () => {
  // fetch invocations from table where dayOfSignup is >= 28 days ago
  const today = new Date().toISOString().slice(0, 10);
  const dayReset = 28;
  const daysAgo = new Date(new Date().setDate(new Date().getDate() - dayReset))
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("invocations")
    .select("*")
    .gte("dayOfSignup", daysAgo);

  if (error) {
    console.log(error);
    return;
  }

  // reset commandInvocations and dayOfSignup to today
  for (const user of data) {
    user.commandInvocations = {};
    user.dayOfSignup = today;
  }

  // update invocations table
  const { insertData, insertError } = await supabase
    .from("invocations")
    .update(data);

  if (insertError) {
    console.log(insertError);
    return;
  }
};

export const resetCommandInvocationsChoreWorkflow = () => {
  resetCommandInvocations();
};

const loadCommandLimits = async () => {
  // fetch command limits from supabase command_limits table
  const { data, error } = await supabase.from("command_limits").select("*");

  if (error) {
    console.log(error);
    return;
  }

  const commandLimits = {};
  for (const command of data) {
    commandLimits[command.command] = {
      free: command.free,
      member: command.member,
      paid: command.paid,
    };
  }

  return commandLimits;
};

// main function
export const invocationWorkflowSB = async (
  interaction,
  isButton = false,
  query = null
) => {
  await addInvocation(interaction, isButton, query);

};

export const preWorkflowSB = async (interaction) => {
 
  await addUser(interaction);
  return checkCommandLimits(interaction);
};

const checkCommandLimits = async (interaction) => {
  const commandLimits = await loadCommandLimits();
  const userName = getUserName(interaction);

    const { data, error } = await supabase
    .from("invocations")
    .select("*")
    .eq("username", userName);

    if (error) {
    console.log(error);
    return;
    }

    const invocations = data[0];
    const userInvocations = invocations;

  const commandName = interaction.commandName;
  const tier = userInvocations.tier;

  if (tier === "admin" || tier === "mod" || tier === "comped") {
    return true;
  }

  if (commandName in commandLimits) {
    const commandLimit =
      commandLimits[commandName][
        tier === "paid" ? "paid" : tier === "member" ? "member" : "free"
      ];
    const commandInvocations = userInvocations.commandInvocations[commandName];

    if (commandInvocations >= commandLimit) {
      return false;
    }
  }

  return true;
};

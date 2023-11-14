import OpenAI from "openai";
// import config from "../../config.json" assert { "type": "json" };
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { invocationWorkflow, preWorkflow } from "../../invocation.js";
import Filter from "bad-words";
import { queue, processQueue } from "../../shared-queue.js";
import {
  invocationWorkflowSB,
  preWorkflowSB,
} from "../../supabase-invocations.js";

import dotenv from "dotenv";

dotenv.config();

const { OPENAI_API_KEY } = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const filter = new Filter();

async function complete(text) {
  try {
    text = filter.clean(text);

    const artMovements = [
      "Abstract Expressionism",
      "Art Deco",
      "Art Nouveau",
      "Avant-garde",
      "Baroque",
      "Bauhaus",
      "Classicism",
      "CoBrA",
      "Color Field Painting",
      "Conceptual Art",
      "Constructivism",
      "Cubism",
      "Dada / Dadaism",
      "Digital Art",
      "Expressionism",
      "Fauvism",
      "Futurism",
      "Harlem Renaissance",
      "Impressionism",
      "Installation Art",
      "Land Art",
      "Minimalism",
      "Neo-Impressionism",
      "Neoclassicism",
      "Neon Art",
      "Op Art",
      "Performance Art",
      "Pop Art",
      "Post-Impressionism",
      "Precisionism",
      "Rococo",
      "Street Art",
      "Surrealism",
      "Suprematism",
      "Symbolism",
      "Zero Group"
  ];

  const randomArtMovement = artMovements[Math.floor(Math.random() * artMovements.length)];

  const palettes = [
    "#C7CEEA, #D6EADF, #E4C1F9, #B5EAD7, #E1CE7A",
"#D8A7B1, #FFDAC1, #FFD1DC, #F4E8C1, #A4B0BE",
"#A4B0BE, #FBC4AB, #E4C1F9, #FEF5EF, #6A4C93",
"#D8A7B1, #C7CEEA, #FFC1CC, #6A4C93, #C4FCEF",
"#D6EADF, #FFADCD, #C7CEEA, #FFDAC1, #8CC0DE",
"#FFD1DC, #C4FCEF, #E1CE7A, #F4E8C1, #FBC4AB",
"#FFADCD, #E1CE7A, #FFD1DC, #FFB4A2, #B5EAD7",
"#E4C1F9, #FFC1CC, #B5E2FA, #FEF5EF, #BEE5BF",
"#C7CEEA, #FBC4AB, #C7CEEA, #A3D8F4, #8CC0DE",
"#D6EADF, #FFDAC1, #FFADCD, #FFB7B2, #B5EAD7",
"#FEF5EF, #F7D08A, #B5EAD7, #C7CEEA, #FFADCD",
"#FFB7B2, #B5EAD7, #778DA9, #F0A1BF, #C7CEEA",
"#E1CE7A, #E4C1F9, #B5EAD7, #FFC1CC, #FFD1DC",
"#6A4C93, #C4FCEF, #FBC4AB, #E1CE7A, #FF9AA2",
"#FBC4AB, #F0A1BF, #FFD1DC, #FFDAC1, #FFDAC1",
"#BEE5BF, #A4B0BE, #FBC4AB, #B5EAD7, #B5E2FA",
"#FEF5EF, #FFDAC1, #A3D8F4, #C7CEEA, #C1E1C1",
"#E1CE7A, #F7D08A, #C4FCEF, #FFC1CC, #D8A7B1",
"#F7D08A, #FFB4A2, #B5EAD7, #E4C1F9, #FEF5EF",
"#6A4C93, #C7CEEA, #D6EADF, #FEF5EF, #FFC1CC",
"#FFC1CC, #C7CEEA, #BEE5BF, #A3D8F4, #F7D08A",
"#F0A1BF, #B5EAD7, #FBC4AB, #E1CE7A, #F7D08A",
"#B5EAD7, #F7D08A, #F4E8C1, #FFADCD, #8CC0DE",
"#B5E2FA, #C7CEEA, #FFADCD, #A4B0BE, #FFDAC1",
"#FFD1DC, #FFB4A2, #FFADCD, #C7CEEA, #C1E1C1"

  ]

  const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];

  
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            `Summarize the following into a theme and create an art prompt from the feel of the text aesthetically along the lines of: 'an abstract of ${randomArtMovement} version of {x}' where x is the feel of the text aesthetically. Remove any unsafe or NSFW content. Just return the art prompt, say nothing else. Use color palette: ${randomPalette}` +
            text,
        },
      ],
      model: "gpt-4",
    });
  
    return completion.choices[0].message.content;
  } catch (err) {
    console.log(err);
    return "Error generating prompt.";
  }
}

export async function main(prompt) {
  try {
    prompt = await complete(prompt);
    prompt = prompt.replace("Art Prompt: ", "").trim();

    if (prompt === "Error generating prompt.") {
      return {
        prompt: "Error generating prompt.",
        imageUrl: "",
      };
    }

    const image = await openai.images.generate({ model: "dall-e-3", prompt: prompt });
    const imageUrl = image.data[0].url;

    if (imageUrl === undefined) {
      return {
        prompt: "Error generating prompt.",
        imageUrl: "",
      };
    }

    return {
      prompt,
      imageUrl,
    };
  } catch (err) {
    console.log(err);
    return {
      prompt: "Error generating prompt.",
      imageUrl: "",
    };
  }
}

let drawCommand = null;

if (process.env.is_production === "true") {
  drawCommand = new SlashCommandBuilder()
    .setName("draw")
    .setDescription(
      "Generates an art prompt and image from the feel of the text aesthetically."
    )
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("The text to generate an art prompt from.")
        .setRequired(true)
    );
} else {
  drawCommand = new SlashCommandBuilder()
    .setName("draw")
    .setDescription(
      "Generates an art prompt and image from the feel of the text aesthetically."
    )
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("The text to generate an art prompt from.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

export const data = drawCommand;

export async function execute(interaction) {
  // await interaction.deferReply({ ephemeral: true });

  // add to queue
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

      try {
        const userInput = interaction.options.getString("input");
        const { prompt, imageUrl } = await main(userInput);
  
        console.log(prompt, imageUrl);
  
        // save image to cf from imageUrl
        const cfRes = await fetch(process.env.quoordinates_server_dalle_cf, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: imageUrl }),
  
        })
  
        console.log(cfRes);
  
  
        const cfResJson = await cfRes.json();
        const cfResUrl = cfResJson.result;
  
        // send message to channel
        const channelMsg = await interaction.channel.send(
          `Art Prompt (**save the image it disappears in 24 hours!**): ${prompt} \n Image: [(url)](${cfResUrl})`
        );
  
        console.log(cfResUrl);
        await invocationWorkflowSB(interaction);
        await interaction.editReply({
          content: `<@${interaction.user.id}>, your request has been completed. Link to result: ${channelMsg.url}`,
          ephemeral: true,
        });
      } catch (err) {
        console.log(err);
        await interaction.editReply({
          content: `<@${interaction.user.id}>, your request has failed. Please try again later.`,
          ephemeral: true,
        });
      }
    },
    user: interaction.user,
    message: sentMessage,
    interaction,
  });

  processQueue();
}

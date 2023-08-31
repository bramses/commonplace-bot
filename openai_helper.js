import OpenAI from "openai";
import config from './config.json' assert { "type": "json" };




const  { OPENAI_API_KEY } = config;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function complete(prompt) {
  // console.log(`Summarizing: ${text}`);
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: prompt,
      },
    ],
    model: "gpt-4",
  });

  return completion.choices[0].message.content;
}
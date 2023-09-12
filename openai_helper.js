import OpenAI from "openai";
import config from './config.json' assert { "type": "json" };
import Filter from 'bad-words';




const  { OPENAI_API_KEY, OPENAI_API_ORG } = config;

const filter = new Filter();

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, organization: OPENAI_API_ORG });

export async function complete(prompt, model = "gpt-4") {

  prompt = filter.clean(prompt);
  console.log(prompt);
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: prompt,
      },
    ],
    model,
  });

  return completion.choices[0].message.content;
}
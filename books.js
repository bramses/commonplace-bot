import { createClient } from "@supabase/supabase-js";
// import config from "./config.json" assert { "type": "json" };

import dotenv from "dotenv";

dotenv.config();

const { supabaseUrl, supabaseKey } = process.env;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

// let books = [];

// const loadBooks = async () => {
//   const { data, error } = await supabase.from("books").select("*");

//   if (error) {
//     console.log(error);
//     return;
//   }

//   books = data.data;
//   return books;
// };

// (async () => {
//   await loadBooks();
// })();

export const lookupBook = async (title) => {
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .ilike("title", `%${title}%`);

    if (error) {
        console.log(error);
        return;
        }

    if (data.length === 0) {
        return null;
    }

    return data[0].link;

  } catch (err) {
    throw err;
  }
};

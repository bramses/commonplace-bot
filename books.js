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

let books = [];

const loadBooks = async () => {
  const { data, error } = await supabase.from("books").select("*");

  if (error) {
    console.log(error);
    return;
  }

  books = data.data;
  return books;
};

(async () => {
  await loadBooks();
})();

export const lookupBook = (title) => {
  try {
    console.log(books.length);
    for (const bookIdx of books) {
      const book = books[bookIdx];
      if (book.title.toLowerCase() === title.toLowerCase()) {
        return book.link;
      }
    }
    return null;
  } catch (err) {
    throw err;
  }
};

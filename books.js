import fs from 'fs';
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



let books = []

const loadBooks = async () => {
    const data = await supabase
        .from('books')
        .select('*')
    books = data
}

(async () => {
    await loadBooks();
})()

export const lookupBook = (title) => {
    for (const book of books.books) {
        if (book.title.toLowerCase() === (title.toLowerCase())) {
            return book.link;
        }
    }
    return null;
}

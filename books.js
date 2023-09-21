import fs from 'fs';

// lookup title in books.json and return url if found


const books = JSON.parse(fs.readFileSync('./books.json', 'utf8'));

export const lookupBook = (title) => {
    for (const book of books.books) {
        if (book.title.toLowerCase() === (title.toLowerCase())) {
            return book.link;
        }
    }
    return null;
}

/**
 * Given a quote, use cloze deletion to generate a question about the quote.
 * Use "||" around the deletions
 */

import { complete } from "./openai_helper.js";

export async function generateClozeDeletion(quote) {
    const anki = await complete(
        `Use cloze deletion in Anki to rewrite the following quote for study. Use || around the deleted terms. Focus on subjects and things that could be asked in a short quiz. Deletions should only be 1 word long or short coherent phrases of up to three words. Write nothing else but the cloze edited quote.\n\nQuote:\n\n${quote}\n\nCloze Version:`,
        "gpt-4"
    );
    
    return anki;
    }

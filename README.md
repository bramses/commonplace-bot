# bramdroid - a novel discord bot

## Modernizing Books

Books are an amazing technology. By far, books rank amongst the best inventions humanity has ever managed. Countless readers and writers have been directly benefited by the existence of books over the millennia. Books have offered wisdom, solace, knowledge and experience that continues to be unrivaled by much newer technologies up to and including the Internet. It is due to the veracity of books' value, that the *technology* that is books is roughly the same as it was 500 years ago.

Must this be the case? How can we add the newest technologies of computation without cheapening the experience of reading? How can we modernize books without losing the value that they have offered for so long?

To answer these questions, we need to talk about the current landscape of reading and computation.

### The Landscapes

To understand the value of Bramdroid, it is important to understand the current landscape of reading and computation.

#### Books

Books are a very old technology. They are so old in fact, that it is hard to pinpoint when they were invented. It is likely that books were invented independently in many places around the world, and even that claim is heavily dependent on your definition of what a book qualifies as. The *earliest surviving book* is from the Tang Dynasty, the [Diamond Sutra](https://en.wikipedia.org/wiki/Diamond_Sutra) circa 868 CE.

Since the printing press was invented in 1440, books have been printed in roughly the same way, albeit the technology today is much faster than the typesetting of Gutenberg's era. The printing press was a huge leap forward in the technology of the dissemination of books. The printing press allowed for books to be mass produced, but it did not change the way that books were read at the individual level.

Much of the recent digitization of books has been focused on making them more accessible by weight and convenience, but not more interactive. Thanks to E-readers, we can now carry thousands of books in our pockets. In a sense, we have turned the printing press from a hardware technology into a software technology. If an author wants to publish a book, they can do so without the need for a printing press, or even pressing "print" on their computer, for that matter.

But we still cannot interact with books in any meaningful way outside of...reading.

#### Reading

When a reader consumes a novel, or is studying a leading book on some subject they care to know more about, they leverage tactics that have been around for centuries. They highlight passages, they take notes, they write in the margins, they dog-ear pages and leave coffee-stained bookmarks in pages. These old, common actions between all serious readers tells us a very, very important detail about reading. These actions tell us that the information that are in books are **not evenly distributed**. Some parts of books are **more relevant** to the reader than others.

Even more frustratingly, these highlights will vary from reader to reader. A reader may highlight a passage that another reader may not find interesting at all. This is because the information in books is **not evenly distributed** between readers either. This makes reading a quite solitary activity. It is hard to share the experience of reading with others, because the information that is relevant to you is not necessarily relevant to others.

Third, reading is a very **passive** activity. The reader consumes the information in the book once -- maybe twice if it's a really good read, and that's it. The reader may take notes, but the book itself does not change during different read throughs. The book is a static object that is the same for every reader, frozen in time. The information is delivered linearly, and the reader has no control over the order in which they consume the information outside of skipping around the book manually.

Fourth, information from a book is recalled mentally. This means that most information is sieved through the context of the human mind, and facts are eviscerated, re-arranged and digested in analogy. This is awesome for creativity but terrible for recall. This is why it is so hard to remember the details of a book you read a year ago, but you can remember the gist of it.

But must these facts be the case? As we have discussed, the highlights are dynamic from reader to reader, so why can't the book be dynamic as well?

Now let's level up from the viewpoint of a single book to the entire library.

#### Libraries

Libraries serve first and foremost as a database of books. Any  collection of books whether it be on a bookshelf in the garage or the NYPL count as a library. All libraries have the same two functions:
1. Store books for later use
2. Allow readers to find books for immediate use

Each library, intentionally or unintentionally, applies their own curation efforts in the effort of the two functions above. These curation efforts are implicit (books not featured on the library shelves due to lack of space) or explicit (books that are featured on the library shelves due to the librarian's recommendation). The curation efforts of libraries are a huge part of their value. These curation efforts of libraries are what make them more valuable than a simple database of all books, as they increase the overall quality of what is on offer. One of the reasons we love word of mouth recommendations is because we trust the person who is recommending the book to us. We trust that they have done the curation effort for us, and that the book they are recommending is worth our time.

On the other end of the spectrum, you have services like Google that serve as a psuedo-library of sorts. Google is a database of all books (all information , really), but it is not curated. The information has no context and outside of surfacing with the same PageRank algorithm that Google uses for all of its search results, there is no way to know what information is more relevant to you than others. In other words, Google will eat anything it can crawl, without any care as to why one document may be better than another. All the curation is applied at runtime, and simply sorted by the context of the search query.

#### Computer Science

While libraries and books have been around for centuries, computer science is a much newer field. Computer science is a field that is only a few decades old, still in its infancy, but is directly related to the tradition of books and libraries. Why? Computer science is the study of information, and how to manipulate it -- using computers. This is quite convenient, because books are a form of information, and libraries are a form of information storage!

Computer Science has come up with interesting data structures such as trees, hash tables, etc. that has created novel ways to conduct information retrieval and manipulation. Certain algorithms could only be "unlocked" by the existence of modern computation. These revelations have led to file transfers, the Internet, programming languages and their programs through symbolic translation, and data being treated as a brand new category of value. As of yet, these data structures and algorithms have not been applied to the field of books and libraries, outside of retrieval.

Basically, we now have the ability to store and full text search between books at scale, as well as leaving notes that link to images, videos, or whatever else we might imagine. We can even link between books, and create a graph of information that is related to each other. But all of this effort was still largely a manual process done by readers or broad stroke heavy handed algorithms that do mass tagging or organizing. Until...

#### LLMs

The Large Language Models of today are really good at spatial reasoning. They are able to take in a large amount of text, and then generate text that is similar to the text that they were trained on. This is a huge breakthrough in the field of Natural Language Processing, and has led to a lot of interesting applications. However, the most interesting application of LLMs is **not** the ability to generate text that is similar to the text that they were trained on. It is the ability to **understand** the text that they were trained on. This opens up two brand new capabilities that were not possible before: **linking at scale** and **transformation**. 

**Linking at scale** is the act of searching an entire latent space for neighbors, by leveraging a technique known as semantic search. These neighbors can be used to create a graph of related information, without having a tradtional "root node" for any unique search, since it is based around matches of probability. 

**Transformation** is the act of taking a piece of text, and transforming it into something else. This something else can be visual (images, videos, etc.), mathematical (code) or textual (a summary, a translation, a poem etc.), or even educational (a quiz, a test, etc.). Basically, the LLM can take in a piece of text, and then output something that is related to that text. This is a huge breakthrough, because it allows us to create a feedback loop between the reader and the book. The reader can now interact with the book in a meaningful way, and the book can respond to the reader in a meaningful way. This is the first time in history that this has been possible.

Modern LLMs have two large constraints: hallucinations and context windows. Hallucinations are when the LLM generates text that is not related to the text that it was trained on. Context windows are the amount of text that the LLM can take in at once. These constraints are important to understand, because they are the reason why LLMs are not perfect. This leads us to talking about why Bramdroid uses quotes.

#### Where Does This Leave Us?

So that's the broad story as it pertains to books and computation. Book technology for dissemination has changed drastically over the centuries thanks to the printing press and the Internet, but curation and the reading process have stayed relatively untouched. People still rely on word of mouth or stumbling upon books at a bookstore. Reading is done silently, the information is inefficiently stored in the mind of the reader, and recall is not guaranteed. Computer science has created novel ways to store and retrieve information, but has not been applied to books and libraries. LLMs have created novel ways to understand information, but have constraints that make them imperfect. 

With all of this in mind, let's talk about Bramdroid.

## Bramdroid
### Quotes

Why quotes?

- Quotes are short and informationally extremely dense
- Quotes/highlights are chosen manually by the reader, creating a curation effort implicitly
- Quotes are generally isolated from their context (the book they came from)
- Hallucinations are minimized due to there being a strong source seed

Quotes are the perfect (current) medium to leverage LLMs for the following reasons: quotes are short, have very high informational density, are chosen manually by the reader, and generally isolated from their context of the book they came from. 

By virtue of being **short**, quotes are cheap to store and retrieve in an LLM. We rarely need to worry about running into context window issues, and the quotes are generally short enough that we can store a lot of them in a single database.

Quotes have very **high informational density**. This means that each quote has a very high chance of being distinct from every other quote. 
## Features

New features are added all the time as creativity strikes and as my reading experience deepens, but here are some of the current features:

### Slash Commands

#### `/curio`

1. Bramdroid will ask you three questions from random quotes.
2. You pick the question that you think is the most interesting and piques your curiosity.
3. Bramdroid will run the `/quos` command (below) on the question you picked.

#### `/random`

Let pure randomness guide your reading experience. Bramdroid will pick a random quote from the database and display it to you. This is equivalent to picking a random book off of a bookshelf and reading a random page.

#### `/quos`

Power user command to search the database directly for quotes. This is the equivalent of going up to the librarian and asking them to find you a book on a specific topic. Bramdroid will find the quotes that are most similar to the query you give it, and display them to you. This is akin to a breadth-first search of the latent space of the LLM. The matches will rarely be an "exact" match, but this is because the database does not have **all** information, it has **curated** information.

#### `/help`

Will display a help message with all the commands and their descriptions.

### Button Interactions

#### `delve`

Above in the reading section we discussed the importance of being able to have complete context to make a good curation choice. The `delve` button interaction allows you to do just that. When you click the `delve` button, Bramdroid will find similar quotes about the same topic, and display them to you. This allows you to make a more informed decision about whether or not you want to add the quote to your collection, as well as see multiple books that may share the same concept. This is akin to a depth-first search of the latent space of the LLM.

#### `tldr`

Some quotes are too long and you may rightly not want to read them. The `tldr` button interaction will generate a summary of the quote for you.

#### `aart`

The main transformation of Bramdroid, allows you to (literally) see quotes in a brand new way. Uses the quote as a seed to generate a prompt, and uses that prompt to generate an image. Since each generation is unique, this entails that libraries could effectively moonlight as unique art galleries. 

### Channels

#### quote-royale

...
#### feed

...

## Usage

Join the Discord server to try it out!

## Example from `curio` to `share`

Let's look at an end to end example of how Bramdroid can be used to learn new knowledge and share it.

## Invocation Limits

See invocation limits [here](https://www.bramadams.dev/discord/#limits)
## Installation

Bramdroid is pretty bespoke, and is unlikely to be useful to anyone else due to its specificity.

However, there are some tactics that can be used to inspire your own bots of a similar caliber.

I won't be discussing how the quotes get into the database, that is discussed on the backend server GiHub repo for Quoordinates.

### OpenAI + Discord

...

### The UX of Button Interactions

...

### The UX of Slash Commands

...

### Managing User Invocations

...

### Speed and Performance

...
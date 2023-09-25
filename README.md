# Commonplace Bot: A Novel Approach to Capturing, Engaging, and Sharing Knowledge

Commonplace Bot is a modern representation of the commonplace book.

## What is a commonplace book?

For millennia, people have kept commonplace books to capture, engage, and share knowledge. The commonplace book is a notebook where people write down quotes, ideas, and other information that they want to remember. It has gone by many names historically: zibaldone, zettelkasten, florilegium, and more. But all commonplace books have served roughly the same purpose: to serve as both an external memory and compute augmentation for human ideas.

Before we talk about Commonplace Bot, let's talk about the history of the commonplace book and its modern implementations.
## Capture

The first layer of the commonplace book is the book itself, the raw collection of ideas. Whether the author prefers paper or digital capture they follow the same basic principles. The author of the commonplace book collects ideas, quotes, and other information that they want to remember. The author can then organize these ideas into a structure that makes sense to them. This structure can be as simple as a table of contents, or as complex as a full-blown taxonomy. The author can then add metadata to each idea to help them find it later. This metadata can be as simple as a date, or as complex as a full-blown ontology. The author can then add their own thoughts and ideas to each idea, and link ideas together. This is the basic structure of the commonplace book. 

Modern techniques like the Zettelkasten and Second Brain movements have focused on making the capture process as efficient as possible. Thanks to apps like Notion, Obsidian, Readwise, etc. eliminating friction, the endgame idea is that the commonplace book will become a natural extension of the author's mind.

## Engage

Engaging with the data from the data in the capture section in the commonplace book is all about strategy and triggers. The goal of engaging is to find the right data at the right time. Strategies include: spaced repetition, tickler files, exhaustive table of contents, etc. Triggers include: time, location, and context. The goal of engaging is to make the commonplace book a useful tool for the author. The author should be able to find the right data at the right time, and use it to solve problems and generate new ideas.

Modern techniques for engaging with data roughly oscillate around tagging and recommendation systems. The idea is that the commonplace book should be able to recommend the right data at the right time. This is done by tagging data with metadata, and then using that metadata to recommend data to the author. When you browse through a site like YouTube, you are engaging with a recommendation system. The recommendation system is using metadata to recommend videos to you. The same principle applies to the commonplace book. The author can use smart metadata to recommend data to themselves.

## Share

Sharing data from a commonplace book is where the commonplace book "pays off". Sharing in the context of a commonplace book is really transformation. Data in the commonplace book becomes a meme template of sorts, for a creative author to either change the message or change the medium. People have shared their entire commonplace books down to their decesendants, and people have shared their commonplace books with the world, for example, Leonardo Da Vinci's notebooks but this is rare as it requires the author to have spent the effort curating honing and organizing their commonplace book into something that is useful to others.

Modern versions of sharing have largely been relegated to blogs and social profiles, where creators build a backlog of information, engage with it by transforming it in their expertise, and then share it with their audience. The commonplace book is the raw material for the creative process, but afaik, isn't the arbiter of transformation and sharing itself. 

## What is Commonplace Bot?

Using modern technological advancements in computation, data storage, machine learning, and networking, Commonplace Bot is a working example of what the Commonplace book of the future may look like, and what it may be capable of. It shows how a commonplace book can be leveraged by the individual author as well as their community to proliferate knowledge and ideas.

Let's revisit the three layers of the commonplace book in the context of Commonplace Bot.

### Capture

The important evolution to the capture workflow for Commonplace Bot is to leverage embeddings and cached transformations. Basically, captured data is embedded into vector space where it can be combined and organized differently depending on the direction that the data is referenced from. Imagine having 1000 different table of contents, each with its own unique structure. This is the power of embeddings. Cached transformations are the idea that the commonplace book can store the results of transformations, so that the author doesn't have to recompute them every time they want to use them. For example, Commonplace Bot transforms every quote into a question with the following prompt:

{img of embeddings}

`Generate a single question from this quote. The end user cannot see the quote so DO NOT use any abstract concepts like "the speaker" or "the writer" in your question. BE EXPLICIT. DO NOT ASSUME the reader has read the quote. DO NOT use passive voice and do not use passive pronouns like he/she/they/him/her etc. You can use any of who/what/where/when/why. Say nothing else.\n\nQuote:\n\n${highlight}\n\nQ:`

This question is stored in the row of the database that contains the quote. This transformation is important for the engagement section of the data, which we will be taking a look at next.


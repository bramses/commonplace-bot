# Commonplace Bot: A Novel Approach to Capturing, Engaging, and Sharing Knowledge

Commonplace Bot is a modern representation of the commonplace book. By using a combination of the newest computation technologies and creative design techniques, Commonplace Bot is the first of its kind to show what the commonplace book of the future may look like.

## What is a commonplace book?

For millennia, people have kept commonplace books to capture, engage, and share knowledge. The commonplace book is a notebook where people write down quotes, ideas, and other information that they want to remember. It has gone by many names historically: zibaldone, zettelkasten, florilegium, and more. But all commonplace books have served roughly the same purpose: to serve as both an external memory and compute augmentation for human ideas. They are slightly seperate from diaries and journals, which are more focused on capturing the author's thoughts and feelings. Commonplace books are more focused on capturing ideas as raw material, and then transforming them into something new.

Before we talk about Commonplace Bot, let's talk about the history of the commonplace book and its modern implementations.
## Capture

The first layer of the commonplace book is the book itself, the raw collection of ideas. Whether the author prefers paper or digital capture they follow the same basic principles: the author of the commonplace book collects ideas, quotes, and other information that they want to remember. The author can then organize these ideas into a structure that makes sense to them. This structure can be as simple as a table of contents, or as complex as a full-blown taxonomy. The author can then add metadata to each idea to help them find it later. This metadata can be as simple as a date, or as complex as a full-blown ontology like complex tagging systems. Next, many authors then add their own thoughts and ideas to each idea, and link ideas together in a bid to increase the utility of any particular node of knowledge. This is the basic structure of the commonplace book. 

Modern techniques like the Zettelkasten and Second Brain movements have focused on making the capture process as efficient as possible. Thanks to apps like Notion, Obsidian, Readwise, etc. eliminating friction, the endgame idea is that the commonplace book will become a natural extension of the author's mind. The author will be able to capture ideas as they come, and then organize them in a way that makes sense to them.

## Engage

Engaging with the data from the capture section in the commonplace book is all about strategy and triggers. Strategies include: spaced repetition, tickler files, exhaustive table of contents, etc. Triggers include: time, location, and context. The goal of engaging is to make the commonplace book a useful tool for the author. The author should be able to find the right data at the right time, and use it to solve problems and generate new ideas.

Modern techniques for engaging with data roughly oscillate around tagging and recommendation systems. This is done by tagging data with metadata, and then using that metadata to surface relevant data to the author. Explicit tagging systems can be found in apps like Notion, and in library systems like Dewey Decimal.

When you browse through a site like YouTube, you are engaging with a recommendation system, which functions as an implicit tagging machine. The recommendation system is using metadata to recommend videos to you, it's just not front and center. The same principle applies to the commonplace book. The author can use smart metadata to recommend data to themselves.

## Share

Sharing data is where the commonplace book "pays off". Sharing in the context of a commonplace book is in reality, transformation. Data in the commonplace book becomes a meme template of sorts, for a creative author to either change the message or change the medium. People have shared their entire commonplace books down to their decesendants. Some have even shared their commonplace books with the world, for example, Leonardo Da Vinci's notebooks -- but this is rare as it requires the author to have spent the effort curating honing and organizing their commonplace book into something that is useful to others.

Modern versions of sharing have largely been relegated to blogs and social profiles, where creators build a backlog of information, engage with it by transforming it in their expertise, and then share it with their audience. The commonplace book is the raw material for the creative process, but afaik, isn't the arbiter of transformation and sharing itself. 

## What is Commonplace Bot?

Using modern technological advancements in computation, data storage, machine learning, and networking, Commonplace Bot is a working example of what the Commonplace book of the future may look like, and what it may be capable of. It shows how a commonplace book can be leveraged by the individual author as well as their community to proliferate knowledge and ideas.

Let's revisit the three layers of the commonplace book in the context of Commonplace Bot.

### Capture

The important evolution to the capture workflow for Commonplace Bot is to leverage embeddings and cached transformations. Basically, captured data is embedded into vector space where it can be combined and organized differently depending on the direction that the data is referenced from. Imagine having 1000 different table of contents, each with its own unique structure. This is the power of embeddings. 

{tk: img of embeddings}

Cached transformations are the idea that the commonplace book can store the results of transformations, so that the author doesn't have to recompute them every time they want to use them. For example, Commonplace Bot transforms every quote into a question with the following prompt:


```
Generate a single question from this quote. The end user cannot see the quote so DO NOT use any abstract concepts like "the speaker" or "the writer" in your question. BE EXPLICIT. DO NOT ASSUME the reader has read the quote. DO NOT use passive voice and do not use passive pronouns like he/she/they/him/her etc. You can use any of who/what/where/when/why. Say nothing else.\n\nQuote:\n\n${highlight}\n\nQ:
```

This question is stored in the row of the database that contains the quote. This transformation is important for the engagement section of the data, which we will be taking a look at next.

## Engage

In Commonplace Bot, the traditional rules of engagement are flipped on their head. Instead of the author engaging with the commonplace book and coming up with different strategies to interact with the same data, the commonplace book engages with the author (or in this case, any user). 

In many semantic search systems, designers stop at the level of embedding the data, tossing up a search bar and calling it a day. I think that this is a faux pas, that embeddings can do so much more. For example, instead of merely performing a search we can use our paired questions to surface three starting points from the dataset for the user to engage with. This greatly decreases the friction of the potential overwhelm from a commonplace set that has potentially tens of thousands of entries.

{tk: img of search}

Once we have a starting point for our search, we can "delve" into the node, and return all of its neighbors, giving the user a local exhaustive search of a concept. This is a great way to explore a concept, to find new ideas that you may not have thought of before, and make connections.

We can "tldr" our data, making it easier to consume. Basically, we can use Commonplace Bot to make the task of interfacing with a large set of curated data engaging from end to end.

{tk: img of tldr}

## Share

The final layer of the commonplace book is sharing. In Commonplace Bot, sharing is the act of alchemizing raw data alongside the context of the user into something new, creating a new medium. For example, drawing. "Draw" extracts the substance of a quote, converts it to an art prompt and then uses a diffusion model to generate a unique image. This image is then stored alongside the quote, and can be shared with the world. Imagine just in time art galleries, visual links to the same data set. 

```
Summarize the following into a theme and create an art prompt from the feel of the text aesthetically along the lines of: 'an abstract of [some unique lesser known art style from history] version of {x}' where x is the feel of the text aesthetically. Just return the art prompt, say nothing else.
```

{tk: img of draw}

## Conclusion

I've really only scratched the surface of the capabities of Commonplace Bot. If you read this far, it would behoove you to join the Discord and try it out yourself! Try typing `/wander`, choose a starting point, and then `/delve` into it. You can also `/draw` and `/tldr` quotes. Finally if you like a quote, you can `/share` it with the world.
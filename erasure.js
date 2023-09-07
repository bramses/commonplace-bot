import { complete } from "./openai_helper.js";

// Given source and poem
const source =
  "One way to more systematically take advantage of the butterfly effect is using the super model of luck surface area, coined by entrepreneur Jason Roberts. You may recall from geometry that the surface area of an object is how much area the surface of an object covers. In the same way that it is a lot easier to catch a fish if you cast a wide net, your personal luck surface area will increase as you interact with more people in more diverse situations. If you want greater luck surface area, you need to relax your rules for how you engage with the world. For example, you might put yourself in more unfamiliar situations: instead of spending the bulk of your time in your house or office, you might socialize more or take a class. As a result, you will make your own luck by meeting more people and finding more opportunities. Thinking of the butterfly effect, you are increasing your chances of influencing a tornado, such as forming a new partnership that ultimately blossoms into a large, positive outcome. You obviously have to be judicious about which events to attend, or you will constantly be running to different places without getting any focused work done. However, saying no to everything also has a negative consequence—it reduces your luck surface area too much. A happy medium has you attending occasional events that expose you to people who can help you advance your goals. Say no often so you can say yes when you might make some new meaningful connections.";

const poem =
  "a set of rules to live by ancient religion, ritual over doctrine moral and ethical guidelines. That was what philosophy was, the creation of one Athenian thinker. The rise of philosophical belief systems, designed to explain the world in its totality.";

  

const poemCreator = async (source) => {
    const poem = await complete(`Erasure (or blackout) poetry is a form of found poetry, wherein you take an existing text and cross out or black out large portions of it. The idea is to create something new from what remains of the initial text, creating a dialogue between the new text and the existing one. This form is great for experimentation as you can use books, magazines, newspapers, anything you can think of. A great example is Doris Cross’ Dictionary Columns. 

    You are a grad student in the literature department and you have a lot of experience twisting the English language into creative poetry, perhaps deriving an entirely new meaning from the source material, a coherent message within the message. Try to erase a good amount. 
    Write a erasure poem from the following source quote. Use only words from the source. No deviations. Return only the poem and nothing else.
    ${source}`);

    console.log(poem);
    return poem;
}

const strikeThrough = (source, poem) => {
  // go through each word in the poem and remove the first instance of it in the source
  // then remove it from the poem
  // when the poem is empty, return the new source
  // ignore punctuation

  // remove any newlines
    poem = poem.replace(/\n/g, " ");
    source = source.replace(/\n/g, " ");
  const poemWords = poem.split(" ").filter((word) => word !== "");
  const sourceWords = source.split(" ").filter((word) => word !== "");

  let poemWordsLower = [];
  let sourceWordsLower = [];

  let run = true;
  // check if all the words in the poem are in the source and if they are not, log and return
    for (let i = 0; i < poemWordsLower.length; i++) {
        if (!sourceWordsLower.includes(poemWordsLower[i])) {
            console.log("The word " + poemWordsLower[i] + " is not in the source.");
            run = false;
        }
    }

    if (!run) {
        return;
    }

  // remove punctuation
  for (let i = 0; i < poemWords.length; i++) {
    poemWordsLower[i] = poemWords[i].replace(/[“”!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "").toLowerCase();
  }

  for (let i = 0; i < sourceWords.length; i++) {
    sourceWordsLower[i] = sourceWords[i].replace(/[“”!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "").toLowerCase();
  }
  let newSource = "";
  let sourceIndex = 0;
  for (let i = 0; i < sourceWordsLower.length; i++) {
    if (sourceWordsLower[i] === poemWordsLower[sourceIndex]) {
        console.log("found a match at " + sourceWords[i] + " at index " + i + " and source index " + sourceIndex);
      sourceIndex++;
        newSource += sourceWords[i] + " ";
    } else {
      newSource += "||" + sourceWords[i] + "||" + " ";
    }
  }
  return newSource;
};

(async () => {
    const poem = await poemCreator(source);
    const newSource = strikeThrough(source, poem);
    console.log(newSource);
})();

// strikeThrough(source, poem);

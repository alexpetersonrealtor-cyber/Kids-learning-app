export const SIGHT_WORDS_PRE_K_K = [
  "cat", "dog", "sun", "run", "big", "red", "hop", "mom", "dad", "yes",
  "no", "go", "up", "in", "on", "see", "the", "a", "I", "and",
];

export const SIGHT_WORDS_FIRST_SECOND = [
  "friend", "because", "would", "little", "many", "before", "again", "which",
  "school", "people", "water", "were", "there", "could", "about", "always",
];

export interface Passage {
  title: string;
  text: string;
  questions: { question: string; choices: string[]; answerIndex: number }[];
}

export const READING_PASSAGES: Passage[] = [
  {
    title: "The Lost Kite",
    text: "Maya flew her red kite in the park. A gust of wind pulled the string from her hand. The kite sailed over the trees and landed in Mr. Chen's garden. Maya knocked on his door and asked politely if she could get it back. Mr. Chen smiled and helped her find it behind his rose bushes.",
    questions: [
      { question: "What color was Maya's kite?", choices: ["Blue", "Red", "Green", "Yellow"], answerIndex: 1 },
      { question: "Where did the kite land?", choices: ["In a tree", "On the roof", "In Mr. Chen's garden", "In the lake"], answerIndex: 2 },
      { question: "How did Maya get her kite back?", choices: ["She climbed a fence", "She asked Mr. Chen politely", "She called her mom", "She left it there"], answerIndex: 1 },
    ],
  },
  {
    title: "The Science Fair",
    text: "Jamal spent two weeks building a volcano for the science fair. He mixed baking soda and vinegar to make it erupt. On the day of the fair, his volcano bubbled over with foam, and everyone clapped. Jamal was proud, but he was even more excited when he saw his friend's robot project.",
    questions: [
      { question: "What did Jamal build?", choices: ["A robot", "A volcano", "A rocket", "A bridge"], answerIndex: 1 },
      { question: "What two things made it erupt?", choices: ["Water and salt", "Baking soda and vinegar", "Sugar and soda", "Sand and glue"], answerIndex: 1 },
      { question: "How long did Jamal work on his project?", choices: ["One day", "One week", "Two weeks", "A month"], answerIndex: 2 },
    ],
  },
];

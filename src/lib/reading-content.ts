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
  {
    title: "The New Kid",
    text: "Priya moved to a new school in October and didn't know anyone. At lunch, she sat alone until a boy named Dev waved her over to his table. He introduced her to his friends and showed her where the library was after school. By the end of the week, Priya had a whole group of friends to sit with.",
    questions: [
      { question: "When did Priya move to her new school?", choices: ["September", "October", "December", "June"], answerIndex: 1 },
      { question: "Who invited Priya to sit with him?", choices: ["Her teacher", "Dev", "Her mom", "The principal"], answerIndex: 1 },
      { question: "What did Dev show Priya after school?", choices: ["The gym", "The cafeteria", "The library", "The playground"], answerIndex: 2 },
    ],
  },
  {
    title: "The Camping Trip",
    text: "The Alvarez family drove three hours to go camping by a lake. They pitched their tent, then Dad taught Sofia how to start a small campfire safely. That night they roasted marshmallows and watched for shooting stars. Sofia counted six before she fell asleep in her sleeping bag.",
    questions: [
      { question: "How long did the family drive?", choices: ["One hour", "Two hours", "Three hours", "Five hours"], answerIndex: 2 },
      { question: "Who taught Sofia to start the campfire?", choices: ["Her mom", "Her dad", "A ranger", "Her brother"], answerIndex: 1 },
      { question: "How many shooting stars did Sofia count?", choices: ["Three", "Four", "Six", "Ten"], answerIndex: 2 },
    ],
  },
  {
    title: "The Missing Library Book",
    text: "Owen couldn't find his library book anywhere and it was due the next day. He searched his backpack, his desk, and under his bed. Finally, his little sister remembered she had borrowed it to look at the pictures. It was hiding under her pillow the whole time.",
    questions: [
      { question: "What was Owen looking for?", choices: ["His shoes", "His library book", "His backpack", "His homework"], answerIndex: 1 },
      { question: "Who had actually taken the book?", choices: ["His mom", "His teacher", "His little sister", "His friend"], answerIndex: 2 },
      { question: "Where was the book found?", choices: ["In the backpack", "Under the desk", "Under her pillow", "In the car"], answerIndex: 2 },
    ],
  },
];

import type { GradeLevel } from "@prisma/client";

export const SIGHT_WORDS_BY_GRADE: Record<"PRE_K" | "K" | "FIRST" | "SECOND", string[]> = {
  PRE_K: ["cat", "dog", "sun", "run", "big", "red", "hop", "mom", "dad", "go"],
  K: ["yes", "no", "up", "in", "on", "see", "the", "and", "is", "it", "at", "we"],
  FIRST: [
    "friend", "water", "again", "before", "about", "many", "little", "would",
    "could", "school", "people", "does",
  ],
  SECOND: [
    "because", "always", "together", "another", "through", "right", "both",
    "better", "animal", "different", "important", "favorite",
  ],
};

export interface Passage {
  grade: "THIRD" | "FOURTH" | "FIFTH";
  title: string;
  text: string;
  questions: { question: string; choices: string[]; answerIndex: number }[];
}

export const READING_PASSAGES: Passage[] = [
  {
    grade: "THIRD",
    title: "The Lost Kite",
    text: "Maya flew her red kite in the park. A gust of wind pulled the string from her hand. The kite sailed over the trees and landed in Mr. Chen's garden. Maya knocked on his door and asked politely if she could get it back. Mr. Chen smiled and helped her find it behind his rose bushes.",
    questions: [
      { question: "What color was Maya's kite?", choices: ["Blue", "Red", "Green", "Yellow"], answerIndex: 1 },
      { question: "Where did the kite land?", choices: ["In a tree", "On the roof", "In Mr. Chen's garden", "In the lake"], answerIndex: 2 },
      { question: "How did Maya get her kite back?", choices: ["She climbed a fence", "She asked Mr. Chen politely", "She called her mom", "She left it there"], answerIndex: 1 },
    ],
  },
  {
    grade: "THIRD",
    title: "The Science Fair",
    text: "Jamal spent two weeks building a volcano for the science fair. He mixed baking soda and vinegar to make it erupt. On the day of the fair, his volcano bubbled over with foam, and everyone clapped. Jamal was proud, but he was even more excited when he saw his friend's robot project.",
    questions: [
      { question: "What did Jamal build?", choices: ["A robot", "A volcano", "A rocket", "A bridge"], answerIndex: 1 },
      { question: "What two things made it erupt?", choices: ["Water and salt", "Baking soda and vinegar", "Sugar and soda", "Sand and glue"], answerIndex: 1 },
      { question: "How long did Jamal work on his project?", choices: ["One day", "One week", "Two weeks", "A month"], answerIndex: 2 },
    ],
  },
  {
    grade: "THIRD",
    title: "The New Kid",
    text: "Priya moved to a new school in October and didn't know anyone. At lunch, she sat alone until a boy named Dev waved her over to his table. He introduced her to his friends and showed her where the library was after school. By the end of the week, Priya had a whole group of friends to sit with.",
    questions: [
      { question: "When did Priya move to her new school?", choices: ["September", "October", "December", "June"], answerIndex: 1 },
      { question: "Who invited Priya to sit with him?", choices: ["Her teacher", "Dev", "Her mom", "The principal"], answerIndex: 1 },
      { question: "What did Dev show Priya after school?", choices: ["The gym", "The cafeteria", "The library", "The playground"], answerIndex: 2 },
    ],
  },
  {
    grade: "THIRD",
    title: "The Camping Trip",
    text: "The Alvarez family drove three hours to go camping by a lake. They pitched their tent, then Dad taught Sofia how to start a small campfire safely. That night they roasted marshmallows and watched for shooting stars. Sofia counted six before she fell asleep in her sleeping bag.",
    questions: [
      { question: "How long did the family drive?", choices: ["One hour", "Two hours", "Three hours", "Five hours"], answerIndex: 2 },
      { question: "Who taught Sofia to start the campfire?", choices: ["Her mom", "Her dad", "A ranger", "Her brother"], answerIndex: 1 },
      { question: "How many shooting stars did Sofia count?", choices: ["Three", "Four", "Six", "Ten"], answerIndex: 2 },
    ],
  },
  {
    grade: "THIRD",
    title: "The Missing Library Book",
    text: "Owen couldn't find his library book anywhere and it was due the next day. He searched his backpack, his desk, and under his bed. Finally, his little sister remembered she had borrowed it to look at the pictures. It was hiding under her pillow the whole time.",
    questions: [
      { question: "What was Owen looking for?", choices: ["His shoes", "His library book", "His backpack", "His homework"], answerIndex: 1 },
      { question: "Who had actually taken the book?", choices: ["His mom", "His teacher", "His little sister", "His friend"], answerIndex: 2 },
      { question: "Where was the book found?", choices: ["In the backpack", "Under the desk", "Under her pillow", "In the car"], answerIndex: 2 },
    ],
  },
  {
    grade: "FOURTH",
    title: "The Robotics Competition",
    text: "Nadia's team had spent three months designing a robot that could sort recycling by material. Two days before the competition, the robot's arm jammed and refused to move. Instead of panicking, Nadia remembered a trick her mentor had taught her: sometimes a stuck motor just needs its gears cleaned. She carefully disassembled the arm, wiped away the dust that had built up inside, and reassembled it. When she tested it again, the arm swung smoothly, sorting a plastic bottle into the correct bin on the first try. At the competition, her team's robot placed second out of twenty teams, and Nadia realized that patience had solved the problem faster than worry ever could have.",
    questions: [
      { question: "What was the robot designed to do?", choices: ["Play music", "Sort recycling by material", "Draw pictures", "Deliver mail"], answerIndex: 1 },
      { question: "What was actually wrong with the robot's arm?", choices: ["A dead battery", "A broken wheel", "Dust in the gears", "A missing screw"], answerIndex: 2 },
      { question: "How did Nadia figure out the fix?", choices: ["She read the manual", "She remembered her mentor's advice", "She guessed randomly", "She asked a judge"], answerIndex: 1 },
      { question: "Where did the team place in the competition?", choices: ["First", "Second", "Last", "They didn't finish"], answerIndex: 1 },
    ],
  },
  {
    grade: "FOURTH",
    title: "The Community Garden",
    text: "When the empty lot next to Marcus's apartment building filled up with trash, the neighbors argued for months about whose job it was to clean it up. Marcus, who was only ten, decided he didn't want to wait for an adult to fix it. He asked his teacher for permission to start a class project, and together his classmates collected trash bags, borrowed shovels from a hardware store, and spent every Saturday for a month turning the lot into a small garden. By summer, tomatoes and sunflowers grew where broken glass used to be, and neighbors who had never spoken to each other were trading vegetables on the sidewalk.",
    questions: [
      { question: "What was the empty lot filled with before the garden?", choices: ["Flowers", "Trash", "Sand", "Water"], answerIndex: 1 },
      { question: "How old was Marcus?", choices: ["Eight", "Ten", "Twelve", "Fifteen"], answerIndex: 1 },
      { question: "Who helped Marcus with the project?", choices: ["His classmates", "The mayor", "A construction company", "No one"], answerIndex: 0 },
      { question: "What effect did the garden have on the neighbors?", choices: ["They argued more", "They moved away", "They started talking to each other", "They ignored it"], answerIndex: 2 },
    ],
  },
  {
    grade: "FIFTH",
    title: "The Lighthouse Keeper's Log",
    text: "For thirty years, Eleanor kept the lighthouse on Gull Point, climbing its spiral staircase twice a day to check the lamp no matter the weather. Most sailors who passed the point never learned her name, but many owed her their lives; on foggy nights, the light's steady rhythm was often the only warning between a ship and the rocks below. When the coast guard announced the lighthouse would be automated, replaced by a small electronic beacon that needed no one to tend it, Eleanor felt an odd mixture of relief and loss. She had earned her rest, yet something about the tower going dark without a human hand to guide it unsettled her. On her last night, she climbed the stairs one final time, not because the light needed her, but because she wanted to remember what it felt like to be needed.",
    questions: [
      { question: "How long had Eleanor kept the lighthouse?", choices: ["Ten years", "Twenty years", "Thirty years", "Forty years"], answerIndex: 2 },
      { question: "Why was the light important to passing sailors?", choices: ["It told them the time", "It warned them away from rocks in fog", "It was decorative", "It powered their ships"], answerIndex: 1 },
      { question: "Why was the lighthouse being automated?", choices: ["Eleanor asked to retire", "A storm destroyed it", "A new beacon needed no keeper", "It was being torn down"], answerIndex: 2 },
      { question: "What best describes how Eleanor felt about leaving?", choices: ["Purely happy", "Purely angry", "A mix of relief and loss", "She felt nothing"], answerIndex: 2 },
      { question: "Why did Eleanor climb the stairs on her last night?", choices: ["The light was broken", "To remember being needed", "Someone ordered her to", "To collect her belongings"], answerIndex: 1 },
    ],
  },
  {
    grade: "FIFTH",
    title: "The Cartographer's Mistake",
    text: "In 1751, a mapmaker named Thomas Hollis was commissioned to chart a stretch of coastline that ships had avoided for decades, wary of reefs no one had properly surveyed. Working from a small boat with only a compass, a sextant, and weeks of patience, Hollis mapped what he believed was an accurate coastline, and his charts were printed and sold across the continent. It was not until nearly a century later that a naval surveyor discovered Hollis had misjudged the position of a single reef by less than a mile, an error small enough to have gone unnoticed for generations, yet large enough to have caused at least three shipwrecks in the intervening years. The story became a favorite example among navigators of how even a tiny, honest mistake, repeated by everyone who trusted the map, could have consequences far larger than the error itself.",
    questions: [
      { question: "What was Thomas Hollis hired to do?", choices: ["Build a lighthouse", "Chart a dangerous coastline", "Command a navy ship", "Write a history book"], answerIndex: 1 },
      { question: "What tools did Hollis use to make his map?", choices: ["A telescope and radio", "A compass and sextant", "A satellite", "A depth sensor"], answerIndex: 1 },
      { question: "How long did it take to discover the error?", choices: ["A few days", "A few years", "Nearly a century", "It was never found"], answerIndex: 2 },
      { question: "How large was the mapping error?", choices: ["Less than a mile", "Ten miles", "A hundred miles", "It was not a distance error"], answerIndex: 0 },
      { question: "What lesson does the story illustrate?", choices: ["Maps are always perfect", "Small errors can have large consequences", "Sailors should not use maps", "Hollis was a poor navigator overall"], answerIndex: 1 },
    ],
  },
];

export function passagesForGrade(grade: GradeLevel): Passage[] {
  const bucket = grade === "THIRD" || grade === "FOURTH" || grade === "FIFTH" ? grade : "THIRD";
  return READING_PASSAGES.filter((p) => p.grade === bucket);
}

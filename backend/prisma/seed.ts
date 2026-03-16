import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@banditos.com" },
    update: {},
    create: {
      email: "admin@banditos.com",
      name: "Trivia Host",
      passwordHash: adminHash,
      role: "admin",
    },
  });
  console.log(`Admin user: ${admin.email} / admin123`);

  // Create test players
  const playerHash = await bcrypt.hash("player123", 10);
  const players = [];
  const playerData = [
    { email: "alice@unc.edu", name: "Alice Johnson" },
    { email: "bob@unc.edu", name: "Bob Smith" },
    { email: "charlie@unc.edu", name: "Charlie Brown" },
    { email: "diana@unc.edu", name: "Diana Prince" },
    { email: "eve@unc.edu", name: "Eve Williams" },
  ];

  for (const p of playerData) {
    const player = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { ...p, passwordHash: playerHash, totalPoints: Math.floor(Math.random() * 500) },
    });
    players.push(player);
  }

  // Create rounds
  const rounds = await Promise.all([
    prisma.round.create({
      data: { name: "Government & Laws", category: "government", order: 1 },
    }),
    prisma.round.create({
      data: { name: "SG History", category: "sg_history", order: 2 },
    }),
    prisma.round.create({
      data: { name: "Past SBPs", category: "past_sbps", order: 3 },
    }),
    prisma.round.create({
      data: { name: "Wildcard", category: "wildcard", order: 4 },
    }),
  ]);

  // Seed questions
  const questions = [
    // Government & Laws (Round 1)
    {
      roundId: rounds[0].id,
      text: "How many branches of the U.S. federal government are there?",
      options: ["2", "3", "4", "5"],
      correctAnswer: 1,
      order: 1,
    },
    {
      roundId: rounds[0].id,
      text: "What is the minimum age to be elected President of the United States?",
      options: ["25", "30", "35", "40"],
      correctAnswer: 2,
      order: 2,
    },
    {
      roundId: rounds[0].id,
      text: "Which amendment to the U.S. Constitution abolished slavery?",
      options: ["12th", "13th", "14th", "15th"],
      correctAnswer: 1,
      order: 3,
    },
    {
      roundId: rounds[0].id,
      text: "How many justices currently serve on the U.S. Supreme Court?",
      options: ["7", "9", "11", "12"],
      correctAnswer: 1,
      order: 4,
    },
    {
      roundId: rounds[0].id,
      text: "What is the term length for a U.S. Senator?",
      options: ["2 years", "4 years", "6 years", "8 years"],
      correctAnswer: 2,
      order: 5,
    },
    {
      roundId: rounds[0].id,
      text: "Which document begins with 'We the People'?",
      options: ["Declaration of Independence", "Bill of Rights", "U.S. Constitution", "Articles of Confederation"],
      correctAnswer: 2,
      order: 6,
    },
    {
      roundId: rounds[0].id,
      text: "What is the supreme law of the land in the United States?",
      options: ["The Bill of Rights", "The Constitution", "Federal Statutes", "Executive Orders"],
      correctAnswer: 1,
      order: 7,
    },

    // SG History (Round 2)
    {
      roundId: rounds[1].id,
      text: "What does 'SG' stand for in campus governance?",
      options: ["Student Group", "Student Government", "School Governance", "Senate Group"],
      correctAnswer: 1,
      order: 1,
    },
    {
      roundId: rounds[1].id,
      text: "In what year was UNC's Student Government founded?",
      options: ["1897", "1904", "1923", "1945"],
      correctAnswer: 1,
      order: 2,
    },
    {
      roundId: rounds[1].id,
      text: "What is the legislative body of UNC Student Government?",
      options: ["Student Senate", "Student Congress", "Student Assembly", "Student Council"],
      correctAnswer: 1,
      order: 3,
    },
    {
      roundId: rounds[1].id,
      text: "Which campus newspaper frequently covers SG elections at UNC?",
      options: ["The Tar Heel Times", "The Daily Tar Heel", "The Carolina Journal", "The Blue Review"],
      correctAnswer: 1,
      order: 4,
    },
    {
      roundId: rounds[1].id,
      text: "How often are UNC Student Body President elections held?",
      options: ["Every semester", "Annually", "Every two years", "Every four years"],
      correctAnswer: 1,
      order: 5,
    },
    {
      roundId: rounds[1].id,
      text: "What color are UNC's school colors?",
      options: ["Blue and Gold", "Carolina Blue and White", "Navy and Silver", "Royal Blue and Red"],
      correctAnswer: 1,
      order: 6,
    },
    {
      roundId: rounds[1].id,
      text: "Where is UNC's Student Government office typically located?",
      options: ["Davis Library", "The Union (Frank Porter Graham Student Union)", "South Building", "Hamilton Hall"],
      correctAnswer: 1,
      order: 7,
    },
    {
      roundId: rounds[1].id,
      text: "What is the UNC Student Government's judiciary branch called?",
      options: ["Student Supreme Court", "Honor Court", "Student Judiciary", "Campus Court"],
      correctAnswer: 0,
      order: 8,
    },

    // Past SBPs (Round 3)
    {
      roundId: rounds[2].id,
      text: "What does SBP stand for?",
      options: ["Student Board President", "Student Body President", "Student Bureau President", "Senate Board President"],
      correctAnswer: 1,
      order: 1,
    },
    {
      roundId: rounds[2].id,
      text: "Approximately how many students vote in typical UNC SBP elections?",
      options: ["500-1,000", "2,000-5,000", "5,000-8,000", "10,000+"],
      correctAnswer: 2,
      order: 2,
    },
    {
      roundId: rounds[2].id,
      text: "What is one common campaign promise in SBP elections?",
      options: ["Free textbooks", "Better mental health resources", "Canceling classes", "Free parking"],
      correctAnswer: 1,
      order: 3,
    },
    {
      roundId: rounds[2].id,
      text: "How long is a UNC Student Body President's term?",
      options: ["One semester", "One year", "Two years", "Until graduation"],
      correctAnswer: 1,
      order: 4,
    },
    {
      roundId: rounds[2].id,
      text: "Can a UNC SBP serve more than one term?",
      options: ["Yes, unlimited terms", "Yes, up to two terms", "No, one term only", "Depends on the year"],
      correctAnswer: 1,
      order: 5,
    },
    {
      roundId: rounds[2].id,
      text: "What building does the SBP traditionally have meetings with the Chancellor?",
      options: ["Wilson Library", "South Building", "The Dean Dome", "Morehead Planetarium"],
      correctAnswer: 1,
      order: 6,
    },

    // Wildcard (Round 4)
    {
      roundId: rounds[3].id,
      text: "What is the name of UNC's mascot?",
      options: ["Rameses", "Brutus", "Bucky", "Smokey"],
      correctAnswer: 0,
      order: 1,
    },
    {
      roundId: rounds[3].id,
      text: "What street is Bandidos Mexican Restaurant located on in Chapel Hill?",
      options: ["Columbia Street", "Franklin Street", "Henderson Street", "Rosemary Street"],
      correctAnswer: 1,
      order: 2,
    },
    {
      roundId: rounds[3].id,
      text: "In what year was UNC Chapel Hill founded?",
      options: ["1776", "1789", "1795", "1801"],
      correctAnswer: 1,
      order: 3,
    },
    {
      roundId: rounds[3].id,
      text: "What is Chapel Hill's nickname?",
      options: ["The Southern Part of Heaven", "The Hill", "Blue City", "Tar Town"],
      correctAnswer: 0,
      order: 4,
    },
    {
      roundId: rounds[3].id,
      text: "How many NCAA Men's Basketball championships has UNC won?",
      options: ["4", "5", "6", "7"],
      correctAnswer: 2,
      order: 5,
    },
    {
      roundId: rounds[3].id,
      text: "What famous alumni of UNC played in the NBA and is considered the GOAT?",
      options: ["LeBron James", "Kobe Bryant", "Michael Jordan", "Vince Carter"],
      correctAnswer: 2,
      order: 6,
    },
    {
      roundId: rounds[3].id,
      text: "What is the traditional cheer at UNC football and basketball games?",
      options: ["Go Pack Go!", "Roll Tide!", "Go Heels!", "Charge On!"],
      correctAnswer: 2,
      order: 7,
    },
  ];

  for (const q of questions) {
    await prisma.question.create({
      data: {
        ...q,
        options: JSON.stringify(q.options),
        timeLimit: 30,
        points: 10,
      },
    });
  }

  console.log(`Seeded ${questions.length} questions across ${rounds.length} rounds`);

  // Create app settings
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      enablePunishments: true,
      punishmentText:
        "Loser must take everyone's dishes to the kitchen and wash them if the manager allows 😂 (optional)",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

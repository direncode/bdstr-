import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Banditos Trivia...");

  // Admin
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@banditos.com" },
    update: {},
    create: { email: "admin@banditos.com", name: "Trivia Host", passwordHash: adminHash, role: "admin" },
  });

  // Demo players
  const playerHash = await bcrypt.hash("player123", 10);
  const names = [
    ["alice@unc.edu", "Alice J"],
    ["bob@unc.edu", "Bob S"],
    ["charlie@unc.edu", "Charlie B"],
    ["diana@unc.edu", "Diana P"],
    ["eve@unc.edu", "Eve W"],
  ];
  for (const [email, name] of names) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash: playerHash, totalPoints: Math.floor(Math.random() * 400 + 50), gamesPlayed: Math.floor(Math.random() * 10 + 1), bestStreak: Math.floor(Math.random() * 6) },
    });
  }

  // Rounds
  const rounds = await Promise.all([
    prisma.round.create({ data: { name: "Government & Laws", category: "government", order: 1 } }),
    prisma.round.create({ data: { name: "SG History", category: "sg_history", order: 2 } }),
    prisma.round.create({ data: { name: "Past SBPs", category: "past_sbps", order: 3 } }),
    prisma.round.create({ data: { name: "Wildcard", category: "wildcard", order: 4 } }),
  ]);

  const allQ = [
    // Government & Laws
    { r: 0, text: "How many branches of the U.S. federal government are there?", opts: ["2", "3", "4", "5"], ans: 1 },
    { r: 0, text: "What is the minimum age to be elected President?", opts: ["25", "30", "35", "40"], ans: 2 },
    { r: 0, text: "Which amendment abolished slavery?", opts: ["12th", "13th", "14th", "15th"], ans: 1 },
    { r: 0, text: "How many justices serve on the U.S. Supreme Court?", opts: ["7", "9", "11", "12"], ans: 1 },
    { r: 0, text: "What is the term length for a U.S. Senator?", opts: ["2 years", "4 years", "6 years", "8 years"], ans: 2 },
    { r: 0, text: "Which document begins with 'We the People'?", opts: ["Declaration of Independence", "Bill of Rights", "U.S. Constitution", "Articles of Confederation"], ans: 2 },
    { r: 0, text: "What is the supreme law of the land?", opts: ["Bill of Rights", "The Constitution", "Federal Statutes", "Executive Orders"], ans: 1 },

    // SG History
    { r: 1, text: "What does 'SG' stand for in campus governance?", opts: ["Student Group", "Student Government", "School Governance", "Senate Group"], ans: 1 },
    { r: 1, text: "In what year was UNC's Student Government founded?", opts: ["1897", "1904", "1923", "1945"], ans: 1 },
    { r: 1, text: "What is the legislative body of UNC Student Government?", opts: ["Student Senate", "Student Congress", "Student Assembly", "Student Council"], ans: 1 },
    { r: 1, text: "Which campus newspaper covers SG elections at UNC?", opts: ["Tar Heel Times", "Daily Tar Heel", "Carolina Journal", "Blue Review"], ans: 1 },
    { r: 1, text: "How often are UNC SBP elections held?", opts: ["Every semester", "Annually", "Every 2 years", "Every 4 years"], ans: 1 },
    { r: 1, text: "What are UNC's school colors?", opts: ["Blue and Gold", "Carolina Blue and White", "Navy and Silver", "Royal Blue and Red"], ans: 1 },
    { r: 1, text: "Where is UNC's SG office located?", opts: ["Davis Library", "Frank Porter Graham Student Union", "South Building", "Hamilton Hall"], ans: 1 },
    { r: 1, text: "What is UNC SG's judiciary branch called?", opts: ["Student Supreme Court", "Honor Court", "Student Judiciary", "Campus Court"], ans: 0 },

    // Past SBPs
    { r: 2, text: "What does SBP stand for?", opts: ["Student Board President", "Student Body President", "Student Bureau President", "Senate Board President"], ans: 1 },
    { r: 2, text: "How many students typically vote in UNC SBP elections?", opts: ["500-1,000", "2,000-5,000", "5,000-8,000", "10,000+"], ans: 2 },
    { r: 2, text: "What is a common SBP campaign promise?", opts: ["Free textbooks", "Better mental health resources", "Canceling classes", "Free parking"], ans: 1 },
    { r: 2, text: "How long is a UNC SBP's term?", opts: ["One semester", "One year", "Two years", "Until graduation"], ans: 1 },
    { r: 2, text: "Can a UNC SBP serve more than one term?", opts: ["Unlimited terms", "Up to two terms", "One term only", "Depends on year"], ans: 1 },
    { r: 2, text: "Where does the SBP meet with the Chancellor?", opts: ["Wilson Library", "South Building", "Dean Dome", "Morehead Planetarium"], ans: 1 },

    // Wildcard
    { r: 3, text: "What is UNC's mascot?", opts: ["Rameses", "Brutus", "Bucky", "Smokey"], ans: 0 },
    { r: 3, text: "What street is Bandidos on in Chapel Hill?", opts: ["Columbia St", "Franklin St", "Henderson St", "Rosemary St"], ans: 1 },
    { r: 3, text: "In what year was UNC Chapel Hill founded?", opts: ["1776", "1789", "1795", "1801"], ans: 1 },
    { r: 3, text: "What is Chapel Hill's nickname?", opts: ["Southern Part of Heaven", "The Hill", "Blue City", "Tar Town"], ans: 0 },
    { r: 3, text: "How many NCAA Men's Basketball championships has UNC won?", opts: ["4", "5", "6", "7"], ans: 2 },
    { r: 3, text: "Which UNC alum is considered the basketball GOAT?", opts: ["LeBron James", "Kobe Bryant", "Michael Jordan", "Vince Carter"], ans: 2 },
    { r: 3, text: "What is the traditional UNC cheer?", opts: ["Go Pack Go!", "Roll Tide!", "Go Heels!", "Charge On!"], ans: 2 },
  ];

  for (let i = 0; i < allQ.length; i++) {
    const q = allQ[i];
    await prisma.question.create({
      data: {
        text: q.text,
        options: JSON.stringify(q.opts),
        correctAnswer: q.ans,
        points: 10,
        roundId: rounds[q.r].id,
        order: i + 1,
      },
    });
  }

  // Init game state
  await prisma.gameState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", isUnlocked: false },
  });

  console.log(`Seeded: ${allQ.length} questions, ${rounds.length} rounds, 6 users`);
  console.log("Admin: admin@banditos.com / admin123");
  console.log("Player: alice@unc.edu / player123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());


import { prisma } from "./lib/prisma.js";

async function main() {
  try {
    const result = await prisma.$queryRaw<
      { database: string }[]
    >`SELECT current_database() AS database`;

    console.log("Database connection successful!");
    console.log(result);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

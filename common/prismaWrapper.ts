import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Pass in Prisma client requests here
// Handles disconnection
export default async function main(callback: Function) {
  callback(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e: any) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

import prismaWrapper from "common/prismaWrapper";
import { PrismaClient } from "@prisma/client";

export default function handler() {
  prismaWrapper(async (prisma: PrismaClient) => {
    await prisma.user.create({
      data: {
        name: "Alice",
        email: "alice@prisma.io",
        posts: {
          create: { title: "Hello World" },
        },
        profile: {
          create: { bio: "I like turtles" },
        },
      },
    });

    const allUsers = await prisma.user.findMany({
      include: {
        posts: true,
        profile: true,
      },
    });
    console.dir(allUsers, { depth: null });
  });
}

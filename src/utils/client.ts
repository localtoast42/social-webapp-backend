import { PrismaClient } from "@prisma/client";

let prisma = new PrismaClient({
  omit: {
    user: {
      hashedPassword: true,
    },
  },
});

export default prisma;

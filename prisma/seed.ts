import config from "config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const adminUsername = config.get<string>("firstAdminUsername");
const adminPassword = config.get<string>("firstAdminPassword");

async function main() {
  const hashedPassword = bcrypt.hashSync(
    adminPassword,
    config.get<number>("saltWorkFactor")
  );

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      hashedPassword: hashedPassword,
      firstName: "Admin",
      lastName: "Admin",
      isAdmin: true,
      isGuest: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

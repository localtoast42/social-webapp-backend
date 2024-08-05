import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { omit } from "lodash";
import prisma from "../utils/client";
import logger from "../utils/logger";

export async function createUser(input: Prisma.UserCreateInput) {
  try {
    return prisma.user.create({
      data: input,
      omit: { hashedPassword: true },
    });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function validatePassword({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  if (!user) {
    return false;
  }

  const isValid = await bcrypt
    .compare(password, user.hashedPassword)
    .catch((e) => false);

  if (!isValid) return false;

  return omit(user, "hashedPassword");
}

export async function findUser(args: Prisma.UserFindUniqueArgs) {
  try {
    return prisma.user.findUnique(args);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findManyUsers(args: Prisma.UserFindManyArgs) {
  try {
    return prisma.user.findMany(args);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findAndUpdateUser(args: Prisma.UserUpdateArgs) {
  try {
    return prisma.user.update(args);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function deleteUser(args: Prisma.UserDeleteArgs) {
  try {
    return prisma.user.delete(args);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

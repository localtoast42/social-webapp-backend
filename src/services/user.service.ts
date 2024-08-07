import config from "config";
import bcrypt from "bcrypt";
import { omit } from "lodash";
import { Prisma } from "@prisma/client";
import prisma from "../utils/client";
import logger from "../utils/logger";
import { CreateUserInput } from "../schemas/user.schema";

export async function createUser(input: CreateUserInput) {
  try {
    const hashedPassword = bcrypt.hashSync(
      input.password,
      config.get<number>("saltWorkFactor")
    );

    const user = {
      ...omit(input, "password"),
      hashedPassword,
    };

    return prisma.user.create({
      data: user,
    });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function createUserAndPosts(
  userInput: CreateUserInput,
  postInput: Prisma.PostCreateWithoutAuthorInput[]
) {
  try {
    const hashedPassword = bcrypt.hashSync(
      userInput.password,
      config.get<number>("saltWorkFactor")
    );

    const user = {
      ...omit(userInput, "password"),
      hashedPassword,
    };

    return prisma.user.create({
      data: {
        ...user,
        posts: {
          create: postInput,
        },
      },
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
    omit: {
      hashedPassword: false,
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

export async function findUser(query: Prisma.UserFindUniqueArgs) {
  try {
    return prisma.user.findUnique(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findUserWithFollowing(
  where: Prisma.UserFindUniqueArgs["where"],
  omit?: Prisma.UserFindUniqueArgs["omit"]
) {
  try {
    return prisma.user.findUnique({
      where: where,
      omit: omit,
      include: {
        following: {
          select: {
            id: true,
          },
        },
      },
    });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findUserWithFollowedBy(
  where: Prisma.UserFindUniqueArgs["where"],
  omit?: Prisma.UserFindUniqueArgs["omit"]
) {
  try {
    return prisma.user.findUnique({
      where: where,
      omit: omit,
      include: {
        followedBy: {
          select: {
            id: true,
          },
        },
      },
    });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findUserWithAllFollows(
  where: Prisma.UserFindUniqueArgs["where"],
  omit?: Prisma.UserFindUniqueArgs["omit"]
) {
  try {
    return prisma.user.findUnique({
      where: where,
      omit: omit,
      include: {
        following: {
          select: {
            id: true,
          },
        },
        followedBy: {
          select: {
            id: true,
          },
        },
      },
    });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findManyUsers(query: Prisma.UserFindManyArgs) {
  try {
    return prisma.user.findMany(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findAndUpdateUser(query: Prisma.UserUpdateArgs) {
  try {
    return prisma.user.update(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function deleteUser(query: Prisma.UserDeleteArgs) {
  try {
    return prisma.user.delete(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export type UserWithAllFollows = ThenArg<
  ReturnType<typeof findUserWithAllFollows>
>;

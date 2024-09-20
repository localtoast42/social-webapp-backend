import config from "config";
import bcrypt from "bcrypt";
import { omit } from "lodash";
import { Prisma } from "@prisma/client";
import prisma from "../utils/client";
import { CreateUserInput } from "../schemas/user.schema";
import { databaseResponseTimeHistogram } from "../utils/metrics";

export async function createUser(input: CreateUserInput) {
  const metricsLabels = {
    operation: "createUser",
  };

  const timer = databaseResponseTimeHistogram.startTimer();

  try {
    const hashedPassword = bcrypt.hashSync(
      input.password,
      config.get<number>("saltWorkFactor")
    );

    const user = {
      ...omit(input, "password"),
      hashedPassword,
    };

    const result = await prisma.user.create({
      data: user,
    });

    timer({ ...metricsLabels, success: "true" });

    return result;
  } catch (e: any) {
    timer({ ...metricsLabels, success: "false" });
    throw e;
  }
}

export async function createUserAndPosts(
  userInput: CreateUserInput,
  postInput: Prisma.PostCreateWithoutAuthorInput[]
) {
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
  return prisma.user.findUnique(query);
}

export async function findUserWithFollowing(
  where: Prisma.UserFindUniqueArgs["where"],
  omit?: Prisma.UserFindUniqueArgs["omit"]
) {
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
}

export async function findUserWithFollowedBy(
  where: Prisma.UserFindUniqueArgs["where"],
  omit?: Prisma.UserFindUniqueArgs["omit"]
) {
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
}

export async function findUserWithAllFollows(
  where: Prisma.UserFindUniqueArgs["where"],
  omit?: Prisma.UserFindUniqueArgs["omit"]
) {
  const metricsLabels = {
    operation: "findUserWithAllFollows",
  };

  const timer = databaseResponseTimeHistogram.startTimer();

  try {
    const result = await prisma.user.findUnique({
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
    timer({ ...metricsLabels, success: "true" });
    return result;
  } catch (e: any) {
    timer({ ...metricsLabels, success: "false" });
    throw new Error(e);
  }
}

export async function findManyUsers(query: Prisma.UserFindManyArgs) {
  return prisma.user.findMany(query);
}

export async function findAndUpdateUser(query: Prisma.UserUpdateArgs) {
  return prisma.user.update(query);
}

export async function deleteUser(userId: string) {
  const deleteSessions = prisma.session.deleteMany({
    where: { userId: userId },
  });

  const deletePosts = prisma.post.deleteMany({
    where: { authorId: userId },
  });

  const deleteUser = prisma.user.delete({
    where: { id: userId },
  });

  return prisma.$transaction([deleteSessions, deletePosts, deleteUser]);
}

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export type UserWithAllFollows = ThenArg<
  ReturnType<typeof findUserWithAllFollows>
>;

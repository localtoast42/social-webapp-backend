import { Prisma } from "@prisma/client";
import prisma from "../utils/client";
import logger from "../utils/logger";
import { databaseResponseTimeHistogram } from "../utils/metrics";

export async function createPost(input: Prisma.PostCreateInput) {
  const metricsLabels = {
    operation: "createPost",
  };

  const timer = databaseResponseTimeHistogram.startTimer();

  try {
    const result = await prisma.post.create({ data: input });
    timer({ ...metricsLabels, success: "true" });
    return result;
  } catch (e: any) {
    timer({ ...metricsLabels, success: "false" });
    logger.error(e);
    throw new Error(e);
  }
}

export async function findPost(query: Prisma.PostFindUniqueArgs) {
  try {
    return prisma.post.findUnique(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findPostWithAuthorAndLikes(
  where: Prisma.PostFindUniqueArgs["where"],
  omit?: Prisma.PostFindUniqueArgs["omit"]
) {
  try {
    return prisma.post.findUnique({
      where: where,
      omit: omit,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            fullName: true,
            imageUrl: true,
            url: true,
          },
        },
        likes: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            children: true,
          },
        },
      },
    });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findManyPosts(query: Prisma.PostFindManyArgs) {
  try {
    return prisma.post.findMany(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findManyPostsWithAuthorAndLikes(
  query: Prisma.PostFindManyArgs
) {
  const metricsLabels = {
    operation: "findManyPostsWithAuthorAndLikes",
  };

  const timer = databaseResponseTimeHistogram.startTimer();

  try {
    const result = await prisma.post.findMany({
      ...query,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            fullName: true,
            imageUrl: true,
            url: true,
          },
        },
        likes: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            children: true,
          },
        },
      },
    });
    timer({ ...metricsLabels, success: "true" });
    return result;
  } catch (e: any) {
    timer({ ...metricsLabels, success: "false" });
    logger.error(e);
    throw new Error(e);
  }
}

export async function findFollowedPosts(
  userId: string,
  take?: number,
  skip?: number
) {
  try {
    const result = await prisma.post.findMany({
      where: {
        isPublic: true,
        parentId: null,
        author: {
          followedBy: {
            some: {
              id: userId,
            },
          },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: take,
      skip: skip,
    });

    return result;
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findAndUpdatePost(query: Prisma.PostUpdateArgs) {
  try {
    return prisma.post.update(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function updatePostWithLikes(
  where: Prisma.PostUpdateArgs["where"],
  data: Prisma.PostUpdateArgs["data"],
  omit?: Prisma.PostUpdateArgs["omit"]
) {
  try {
    return prisma.post.update({
      where: where,
      omit: omit,
      data: data,
      include: {
        likes: {
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

export async function deletePost(postId: string) {
  try {
    return prisma.post.delete({
      where: { id: postId },
    });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function deleteManyPosts(query: Prisma.PostDeleteManyArgs) {
  try {
    return prisma.post.deleteMany(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

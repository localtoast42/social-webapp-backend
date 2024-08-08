import { Prisma } from "@prisma/client";
import prisma from "../utils/client";
import logger from "../utils/logger";

export async function createPost(input: Prisma.PostCreateInput) {
  try {
    return prisma.post.create({ data: input });
  } catch (e: any) {
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

export async function findManyPosts(query: Prisma.PostFindManyArgs) {
  try {
    return prisma.post.findMany(query);
  } catch (e: any) {
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

import { Prisma } from "@prisma/client";
import prisma from "../utils/client";
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
    throw new Error(e);
  }
}

export async function findPost(query: Prisma.PostFindUniqueArgs) {
  return prisma.post.findUnique(query);
}

export async function findPostWithAuthorAndLikes(
  where: Prisma.PostFindUniqueArgs["where"],
  omit?: Prisma.PostFindUniqueArgs["omit"]
) {
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
}

export async function findManyPosts(query: Prisma.PostFindManyArgs) {
  return prisma.post.findMany(query);
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
    throw new Error(e);
  }
}

export async function findFollowedPosts(
  userId: string,
  take?: number,
  skip?: number
) {
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
}

export async function findAndUpdatePost(query: Prisma.PostUpdateArgs) {
  return prisma.post.update(query);
}

export async function updatePostWithLikes(
  where: Prisma.PostUpdateArgs["where"],
  data: Prisma.PostUpdateArgs["data"],
  omit?: Prisma.PostUpdateArgs["omit"]
) {
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
}

export async function deletePost(postId: string) {
  return prisma.post.delete({
    where: { id: postId },
  });
}

export async function deleteManyPosts(query: Prisma.PostDeleteManyArgs) {
  return prisma.post.deleteMany(query);
}

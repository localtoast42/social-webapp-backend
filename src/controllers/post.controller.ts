import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreatePostRequest,
  ReadPostRequest,
  UpdatePostRequest,
  DeletePostRequest,
  ReadPostByUserRequest,
  LikePostRequest,
} from "../schemas/post.schema";
import {
  createPost,
  findPost,
  findAndUpdatePost,
  findManyPosts,
  findFollowedPosts,
  archivePost,
} from "../services/post.service";
import { UserWithAllFollows } from "../services/user.service";

export async function createPostHandler(
  req: Request<CreatePostRequest["params"], {}, CreatePostRequest["body"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;

  if (!user) {
    return res.sendStatus(403);
  }

  const body = req.body;

  const input: Prisma.PostCreateInput = {
    ...body,
    isPublic: !user.isGuest,
    author: { connect: { id: user.id } },
  };

  if (req.params.postId) {
    input.parent = { connect: { id: req.params.postId } };
  }

  const post = await createPost(input);

  return res.status(201).json(post);
}

export async function getPostHandler(
  req: Request<ReadPostRequest["params"]>,
  res: Response
) {
  const postId = req.params.postId;

  const post = await findPost({
    where: {
      id: postId,
      isArchived: false,
    },
  });

  if (!post) {
    return res.sendStatus(404);
  }

  return res.json(post);
}

export async function getChildPostsHandler(
  req: Request<ReadPostRequest["params"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;
  const postId = req.params.postId;

  if (!user) {
    return res.sendStatus(403);
  }

  const query: Prisma.PostFindManyArgs = {
    where: {
      isArchived: false,
      parentId: postId,
      OR: [{ authorId: user.id }, { isPublic: true }],
    },
    orderBy: { createdAt: "asc" },
  };

  const posts = await findManyPosts(query);

  return res.json({ data: posts });
}

export async function getRecentPostsHandler(
  req: Request,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;

  if (!user) {
    return res.sendStatus(403);
  }

  const query: Prisma.PostFindManyArgs = {
    where: {
      isArchived: false,
      parentId: null,
      OR: [{ authorId: user.id }, { isPublic: true }],
    },
    orderBy: { createdAt: "desc" },
  };

  if (req.query.limit) {
    query.take = parseInt(req.query.limit as string);
  }

  if (req.query.skip) {
    query.skip = parseInt(req.query.skip as string);
  }

  const posts = await findManyPosts(query);

  if (!posts) {
    return res.sendStatus(404);
  }

  return res.json({ data: posts });
}

export async function getFollowedPostsHandler(
  req: Request,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;

  if (!user) {
    return res.sendStatus(403);
  }

  const take = req.query.limit
    ? parseInt(req.query.limit as string)
    : undefined;

  const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;

  const posts = await findFollowedPosts(user.id, take, skip);

  if (!posts) {
    return res.sendStatus(404);
  }

  return res.json({ data: posts });
}

export async function getPostsByUserHandler(
  req: Request<ReadPostByUserRequest["params"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const requestingUser = res.locals.user;
  const targetUserId = req.params.userId;

  if (!requestingUser) {
    return res.sendStatus(403);
  }

  const query: Prisma.PostFindManyArgs = {
    where: {
      isArchived: false,
      parentId: null,
      authorId: targetUserId,
      OR: [
        { isPublic: true },
        { isPublic: targetUserId !== requestingUser.id },
      ],
    },
    orderBy: { createdAt: "desc" },
  };

  const posts = await findManyPosts(query);

  if (!posts) {
    return res.sendStatus(404);
  }

  return res.json({ data: posts });
}

export async function updatePostHandler(
  req: Request<UpdatePostRequest["params"], {}, UpdatePostRequest["body"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;
  const postId = req.params.postId;

  if (!user) {
    return res.sendStatus(403);
  }

  const post = await findPost({
    where: {
      id: postId,
      isArchived: false,
    },
  });

  if (!post) {
    return res.sendStatus(404);
  }

  if (user.id !== post.authorId) {
    return res.sendStatus(403);
  }

  const updatedPost = await findAndUpdatePost({
    where: { id: postId },
    data: { ...req.body },
  });

  return res.json(updatedPost);
}

export async function likePostHandler(
  req: Request<LikePostRequest["params"], {}, LikePostRequest["body"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;
  const postId = req.params.postId;
  const like: boolean = JSON.parse(req.body.like);

  if (!user) {
    return res.sendStatus(403);
  }

  const post = await findPost({
    where: {
      id: postId,
      isArchived: false,
    },
  });

  if (!post) {
    return res.sendStatus(404);
  }

  const update = like
    ? { connect: { id: user.id } }
    : { disconnect: { id: user.id } };

  const updatedPost = await findAndUpdatePost({
    where: { id: postId },
    data: { likes: update },
    include: { likes: { select: { id: true } } },
  });

  return res.json(updatedPost);
}

export async function deletePostHandler(
  req: Request<DeletePostRequest["params"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;
  const postId = req.params.postId;

  if (!user) {
    return res.sendStatus(403);
  }

  const post = await findPost({
    where: {
      id: postId,
      isArchived: false,
    },
  });

  if (!post) {
    return res.sendStatus(404);
  }

  if (user.id !== post.authorId) {
    return res.sendStatus(403);
  }

  const archivedPost = await archivePost(postId);

  return res.json(archivedPost);
}

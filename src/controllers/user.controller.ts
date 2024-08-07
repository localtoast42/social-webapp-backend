import { Request, Response } from "express";
import config from "config";
import { Prisma } from "@prisma/client";
import logger from "../utils/logger";
import {
  createUser,
  findUser,
  findManyUsers,
  findAndUpdateUser,
  deleteUser,
  findUserWithFollowing,
  UserWithAllFollows,
} from "../services/user.service";
import {
  CreateUserRequest,
  DeleteUserRequest,
  FollowUserRequest,
  PopulateUsersRequest,
  ReadUserRequest,
  UpdateUserRequest,
} from "../schemas/user.schema";
import {
  createRandomPost,
  createRandomUser,
  createRandomUserAndPosts,
} from "../utils/populateDatabase";

export async function createUserHandler(
  req: Request<{}, {}, CreateUserRequest["body"]>,
  res: Response
) {
  req.body.isGuest = !config.get<boolean>("allowNewPublicUsers");

  try {
    const user = await createUser(req.body);
    logger.info(`User ${user.username} created`);
    return res.send(user);
  } catch (e: any) {
    logger.error(e);
    return res.status(409).json(e.message);
  }
}

export async function getUserHandler(
  req: Request<ReadUserRequest["params"]>,
  res: Response
) {
  // const requestingUser = res.locals.user;
  // const requestingUserId = requestingUser.id;
  const userId = req.params.userId;

  const user = await findUser({
    where: { id: userId },
  });

  if (!user) {
    return res.sendStatus(404);
  }

  // user.followedByMe = user.followedBy.includes(requestingUserId);

  return res.json(user);
}

export async function getSelfHandler(req: Request, res: Response) {
  const user: UserWithAllFollows = res.locals.user;

  return res.json(user);
}

export async function getUserListHandler(
  req: Request,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const user = res.locals.user;

  if (!user) {
    return res.sendStatus(403);
  }

  const queryTerms: object[] = [];

  if (req.query.q) {
    const queryString = req.query.q as string;
    queryTerms.push({
      OR: [
        { firstName: { contains: queryString } },
        { lastName: { contains: queryString } },
      ],
    });
  }

  const query: Prisma.UserFindManyArgs = {
    select: {
      username: true,
      firstName: true,
      lastName: true,
      city: true,
      state: true,
      country: true,
      imageUrl: true,
    },
    where: {
      AND: [{ id: { not: user.id } }, { isGuest: false }, ...queryTerms],
    },
    orderBy: { lastName: "asc" },
  };

  const users = await findManyUsers(query);

  return res.json({ data: users });
}

export async function updateUserHandler(
  req: Request<UpdateUserRequest["params"], {}, UpdateUserRequest["body"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const requestingUser = res.locals.user;
  const userId = req.params.userId;

  if (!requestingUser) {
    return res.sendStatus(403);
  }

  const user = await findUser({ where: { id: userId } });

  if (!user) {
    return res.sendStatus(404);
  }

  if (user.id !== requestingUser.id) {
    return res.sendStatus(403);
  }

  const update = req.body;

  const query: Prisma.UserUpdateArgs = {
    where: { id: userId },
    data: { ...update },
  };

  const updatedUser = await findAndUpdateUser(query);

  return res.json(updatedUser);
}

export async function deleteUserHandler(
  req: Request<DeleteUserRequest["params"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const requestingUser = res.locals.user;
  const userId = req.params.userId;

  if (!requestingUser) {
    return res.sendStatus(403);
  }

  const user = await findUser({ where: { id: userId } });

  if (!user) {
    return res.sendStatus(404);
  }

  if (user.id !== requestingUser.id) {
    return res.sendStatus(403);
  }

  const result = await deleteUser({ where: { id: userId } });

  return res.json({
    ...result,
    accessToken: null,
    refreshToken: null,
  });
}

export async function getUserFollowsHandler(
  req: Request<ReadUserRequest["params"]>,
  res: Response
) {
  const userId = req.params.userId;

  const userFollows = await findUserWithFollowing({ id: userId });

  if (userFollows === null) {
    return res.sendStatus(404);
  }

  return res.json(userFollows);
}

export async function followUserHandler(
  req: Request<FollowUserRequest["params"], {}, FollowUserRequest["body"]>,
  res: Response<{}, { user: UserWithAllFollows }>
) {
  const requestingUser = res.locals.user;
  const targetUserId = req.params.userId;
  const follow: boolean = JSON.parse(req.body.follow);

  if (!requestingUser) {
    return res.sendStatus(403);
  }

  const targetUser = await findUser({ where: { id: targetUserId } });

  if (!targetUser) {
    return res.sendStatus(404);
  }

  const update = follow
    ? { connect: { id: targetUserId } }
    : { disconnect: { id: targetUserId } };

  const updatedUser = await findAndUpdateUser({
    where: { id: requestingUser.id },
    data: { followedBy: update },
  });

  return res.json(updatedUser);
}

export async function populateUsers(
  req: Request<{}, {}, PopulateUsersRequest["body"]>,
  res: Response
) {
  const userCount = req.body.userCount;
  const postCount = req.body.postCount;

  const users = [];

  for (let i = 0; i < userCount; i++) {
    let user = await createRandomUserAndPosts(postCount);
    users.push(user);
  }

  res.status(201).json({ data: users });
}

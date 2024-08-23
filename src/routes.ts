import { Express, Request, Response } from "express";
import validateResource from "./middleware/validateResource";
import requireUser from "./middleware/requireUser";
import requireAdmin from "./middleware/requireAdmin";
import { createGuest } from "./middleware/createGuest";
import { createSessionSchema } from "./schemas/session.schema";
import {
  createUserSchema,
  deleteUserSchema,
  followUserSchema,
  getUserSchema,
  populateUsersSchema,
  updateUserSchema,
} from "./schemas/user.schema";
import {
  createPostSchema,
  deletePostSchema,
  getPostByUserSchema,
  getPostSchema,
  likePostSchema,
  updatePostSchema,
} from "./schemas/post.schema";
import {
  createUserSessionHandler,
  deleteUserSessionHandler,
  getUserSessionsHandler,
} from "./controllers/session.controller";
import {
  createUserHandler,
  deleteUserHandler,
  followUserHandler,
  getSelfHandler,
  getUserFollowsHandler,
  getUserHandler,
  getUserListHandler,
  populateUsers,
  updateUserHandler,
} from "./controllers/user.controller";
import {
  createPostHandler,
  deletePostHandler,
  getChildPostsHandler,
  getFollowedPostsHandler,
  getPostHandler,
  getPostsByUserHandler,
  getRecentPostsHandler,
  likePostHandler,
  updatePostHandler,
} from "./controllers/post.controller";

function routes(app: Express) {
  app.get("/healthcheck", (req: Request, res: Response) => res.sendStatus(200));

  app.get("/authcheck", requireUser, (req: Request, res: Response) =>
    res.sendStatus(200)
  );

  // Session Routes
  app.post(
    "/api/v2/sessions",
    validateResource(createSessionSchema),
    createUserSessionHandler
  );

  app.get("/api/v2/sessions", requireUser, getUserSessionsHandler);

  app.delete("/api/v2/sessions", requireUser, deleteUserSessionHandler);

  // Guest Routes
  app.post(
    "/api/v2/guest",
    [createGuest, validateResource(createSessionSchema)],
    createUserSessionHandler
  );

  // User Routes
  app.post(
    "/api/v2/users",
    validateResource(createUserSchema),
    createUserHandler
  );

  app.get("/api/v2/users", requireUser, getUserListHandler);

  app.get("/api/v2/users/self", requireUser, getSelfHandler);

  app.post(
    "/api/v2/users/populate",
    [requireAdmin, validateResource(populateUsersSchema)],
    populateUsers
  );

  app.get(
    "/api/v2/users/:userId",
    [requireUser, validateResource(getUserSchema)],
    getUserHandler
  );

  app.put(
    "/api/v2/users/:userId",
    [requireUser, validateResource(updateUserSchema)],
    updateUserHandler
  );

  app.delete(
    "/api/v2/users/:userId",
    [requireUser, validateResource(deleteUserSchema)],
    deleteUserHandler
  );

  app.get(
    "/api/v2/users/:userId/posts",
    [requireUser, validateResource(getPostByUserSchema)],
    getPostsByUserHandler
  );

  app.get(
    "/api/v2/users/:userId/following",
    [requireUser, validateResource(getUserSchema)],
    getUserFollowsHandler
  );

  app.post(
    "/api/v2/users/:userId/follow",
    [requireUser, validateResource(followUserSchema)],
    followUserHandler
  );

  // Post Routes
  app.post(
    "/api/v2/posts",
    [requireUser, validateResource(createPostSchema)],
    createPostHandler
  );

  app.get("/api/v2/posts", requireUser, getRecentPostsHandler);

  app.get("/api/v2/posts/following", requireUser, getFollowedPostsHandler);

  app.get(
    "/api/v2/posts/:postId",
    [requireUser, validateResource(getPostSchema)],
    getPostHandler
  );

  app.put(
    "/api/v2/posts/:postId",
    [requireUser, validateResource(updatePostSchema)],
    updatePostHandler
  );

  app.post(
    "/api/v2/posts/:postId/like",
    [requireUser, validateResource(likePostSchema)],
    likePostHandler
  );

  app.delete(
    "/api/v2/posts/:postId",
    [requireUser, validateResource(deletePostSchema)],
    deletePostHandler
  );

  // Comment Routes
  app.post(
    "/api/v2/posts/:postId/comments",
    [requireUser, validateResource(createPostSchema)],
    createPostHandler
  );

  app.get(
    "/api/v2/posts/:postId/comments",
    [requireUser, validateResource(getPostSchema)],
    getChildPostsHandler
  );
}

export default routes;

import { object, string, enum as enum_, TypeOf } from "zod";

const params = object({
  postId: string({
    required_error: "postId is required",
  }),
  userId: string({
    required_error: "userId is required",
  }),
});

const payload = {
  body: object({
    text: string({
      required_error: "Text is required",
    }).min(1, { message: "Post must not be empty" }),
  }),
};

const like = object({
  like: enum_(["true", "false"], { message: "Like must be true or false" }),
});

export const createPostSchema = object({
  params: object({ postId: string().optional() }),
  ...payload,
});

export const getPostSchema = object({
  params: params.pick({ postId: true }),
});

export const getPostByUserSchema = object({
  params: params.pick({ userId: true }),
});

export const updatePostSchema = object({
  ...payload,
  params: params.pick({ postId: true }),
});

export const likePostSchema = object({
  params: params.pick({ postId: true }),
  body: like,
});

export const deletePostSchema = object({
  params: params.pick({ postId: true }),
});

export type CreatePostRequest = TypeOf<typeof createPostSchema>;
export type ReadPostRequest = TypeOf<typeof getPostSchema>;
export type ReadPostByUserRequest = TypeOf<typeof getPostByUserSchema>;
export type UpdatePostRequest = TypeOf<typeof updatePostSchema>;
export type LikePostRequest = TypeOf<typeof likePostSchema>;
export type DeletePostRequest = TypeOf<typeof deletePostSchema>;

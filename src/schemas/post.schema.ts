import { object, string, enum as enum_, TypeOf } from "zod";

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

const params = object({
  postId: string({
    required_error: "postId is required",
  }),
  userId: string({
    required_error: "userId is required",
  }),
});

export const createPostSchema = object({
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

export type CreatePostInput = TypeOf<typeof createPostSchema>;
export type ReadPostInput = TypeOf<typeof getPostSchema>;
export type ReadPostByUserInput = TypeOf<typeof getPostByUserSchema>;
export type UpdatePostInput = TypeOf<typeof updatePostSchema>;
export type LikePostInput = TypeOf<typeof likePostSchema>;
export type DeletePostInput = TypeOf<typeof deletePostSchema>;

import { object, string, enum as enum_, TypeOf } from "zod";

const payload = {
  body: object({
    text: string({
      required_error: "Text is required",
    }).min(1, { message: "Comment must not be empty" }),
  }),
};

const like = object({
  like: enum_(["true", "false"], { message: "Like must be true or false" }),
});

const params = object({
  postId: string({
    required_error: "postId is required",
  }),
  commentId: string({
    required_error: "commentId is required",
  }),
});

export const createCommentSchema = object({
  params: params.pick({ postId: true }),
  ...payload,
});

export const getCommentSchema = object({
  params: params.pick({ commentId: true }),
});

export const getCommentsByPostSchema = object({
  params: params.pick({ postId: true }),
});

export const updateCommentSchema = object({
  ...payload,
  params: params.pick({ commentId: true }),
});

export const likeCommentSchema = object({
  params: params.pick({ commentId: true }),
  body: like,
});

export const deleteCommentSchema = object({
  params: params.pick({ commentId: true }),
});

export type CreateCommentInput = TypeOf<typeof createCommentSchema>;
export type ReadCommentInput = TypeOf<typeof getCommentSchema>;
export type ReadCommentsByPostInput = TypeOf<typeof getCommentsByPostSchema>;
export type UpdateCommentInput = TypeOf<typeof updateCommentSchema>;
export type LikeCommentInput = TypeOf<typeof likeCommentSchema>;
export type DeleteCommentInput = TypeOf<typeof deleteCommentSchema>;

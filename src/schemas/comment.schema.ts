import { object, string, TypeOf } from 'zod';

const payload = {
  body: object({
    text: string({
      required_error: 'Comment must not be empty',
    }),
  }),
};

const params = {
  params: object({
    postId: string({
      required_error: 'postId is required',
    }),
    commentId: string({
      required_error: 'commentId is required',
    }),
  }),
};

export const createCommentSchema = object({
  ...payload,
  ...params,
});

export const getCommentSchema = object({
  ...params,
});

export const updateCommentSchema = object({
  ...payload,
  ...params,
});

export const deleteCommentSchema = object({
  ...params,
});

export type CreateCommentInput = TypeOf<typeof createCommentSchema>
export type ReadCommentInput = TypeOf<typeof getCommentSchema>
export type UpdateCommentInput = TypeOf<typeof updateCommentSchema>
export type DeleteCommentInput = TypeOf<typeof deleteCommentSchema>
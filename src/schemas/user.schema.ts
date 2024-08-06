import { isValidObjectId } from "mongoose";
import { boolean, number, object, string, enum as enum_, TypeOf } from "zod";

const params = {
  params: object({
    userId: string({
      required_error: "userId is required",
    }),
  }).refine((data) => isValidObjectId(data.userId), {
    message: "Invalid userId",
    path: ["userId"],
  }),
};

const userBase = object({
  firstName: string({
    required_error: "First name must be provided",
  }).min(1, { message: "First name must not be empty" }),
  lastName: string({
    required_error: "Last name must be provided",
  }).min(1, { message: "Last name must not be empty" }),
});

const userUpdate = userBase.extend({
  city: string().optional(),
  state: string().optional(),
  country: string().optional(),
  imageUrl: string().optional(),
  isGuest: boolean().optional(),
});

const userCreate = userUpdate.extend({
  username: string({
    required_error: "Username must be provided",
  }),
  password: string({
    required_error: "Password must be provided",
  }).min(6, "Password must be at least 6 characters long"),
});

const follow = object({
  follow: enum_(["true", "false"], {
    message: "Follow must be true or false",
  }),
});

export const createUserSchema = object({
  body: userCreate
    .extend({
      passwordConfirmation: string({
        required_error: "Password confirmation must be provided",
      }),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: "Passwords do not match",
      path: ["passwordConfirmation"],
    }),
});

export const getUserSchema = object({
  ...params,
});

export const followUserSchema = object({
  ...params,
  body: follow,
});

export const updateUserSchema = object({
  ...params,
  body: userUpdate,
});

export const deleteUserSchema = object({
  ...params,
});

export const populateUsersSchema = object({
  body: object({
    userCount: number({
      required_error: "User count must be provided",
    }).max(25, { message: "No more than 25 users can be created at a time" }),
    postCount: number({
      required_error: "Post count must be provided",
    }).max(10, {
      message: "No more than 10 posts per user can be created at a time",
    }),
  }),
});

export type CreateUserInput = TypeOf<typeof userCreate>;
export type CreateUserRequest = TypeOf<typeof createUserSchema>;
export type ReadUserRequest = TypeOf<typeof getUserSchema>;
export type FollowUserRequest = TypeOf<typeof followUserSchema>;
export type UpdateUserInput = TypeOf<typeof userUpdate>;
export type UpdateUserRequest = TypeOf<typeof updateUserSchema>;
export type DeleteUserRequest = TypeOf<typeof deleteUserSchema>;
export type PopulateUsersRequest = TypeOf<typeof populateUsersSchema>;

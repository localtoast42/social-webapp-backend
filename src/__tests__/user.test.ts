import supertest from "supertest";
import config from "config";
import { omit } from "lodash";
import createServer from "../utils/server";
import { signJwt } from "../utils/jwt.utils";
import * as UserService from "../services/user.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

jest.mock("../utils/logger");

const app = createServer();

const allowNewPublicUsers = config.get<boolean>("allowNewPublicUsers");

const userId = "testId";
const otherUserId = "otherUserTestId";

const userInput = {
  username: "testuser",
  firstName: "first",
  lastName: "last",
  password: "testpwd",
  passwordConfirmation: "testpwd",
  city: "",
  state: "",
  country: "",
  imageUrl: "",
};

const updateUserInput = {
  username: "testuser",
  firstName: "first_new",
  lastName: "last_new",
  password: "testpwd",
  city: "newcity",
  state: "newstate",
  country: "newcountry",
  imageUrl: "newurl",
};

const userPayload = {
  id: userId,
  username: "testuser",
  firstName: "first",
  lastName: "last",
  city: "",
  state: "",
  country: "",
  imageUrl: "",
  isAdmin: false,
  isGuest: false,
  createdAt: new Date(Date.now()),
  updatedAt: new Date(Date.now()),
  fullName: "first last",
  url: `/users/${userId}`,
};

const otherUserPayload = {
  id: otherUserId,
  username: "otheruser",
  firstName: "other",
  lastName: "user",
  city: "",
  state: "",
  country: "",
  imageUrl: "",
  isAdmin: false,
  isGuest: false,
  createdAt: new Date(Date.now()),
  updatedAt: new Date(Date.now()),
  fullName: "other user",
  url: `/users/${otherUserId}`,
};

const userResponse = {
  ...userPayload,
  createdAt: userPayload.createdAt.toJSON(),
  updatedAt: userPayload.updatedAt.toJSON(),
};

const otherUserResponse = {
  ...otherUserPayload,
  createdAt: otherUserPayload.createdAt.toJSON(),
  updatedAt: otherUserPayload.updatedAt.toJSON(),
};

const userWithAllFollows: UserService.UserWithAllFollows = {
  ...userPayload,
  following: [],
  followedBy: [],
};

const jwt = signJwt(userPayload, "accessTokenSecret");
const adminJwt = signJwt(
  {
    ...userPayload,
    isAdmin: true,
  },
  "accessTokenSecret"
);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2024, 8, 1));
});

afterAll(() => {
  jest.useRealTimers();
});

describe("user", () => {
  describe("create user route", () => {
    describe("given the username and password are valid", () => {
      it("should return the user payload", async () => {
        const createUserServiceMock = jest
          .spyOn(UserService, "createUser")
          .mockResolvedValueOnce(userPayload);

        const { statusCode, body } = await supertest(app)
          .post("/api/v2/users")
          .send(userInput);

        expect(statusCode).toBe(200);
        expect(body).toEqual(userResponse);
        expect(createUserServiceMock).toHaveBeenCalledWith({
          ...omit(userInput, "passwordConfirmation"),
          isGuest: !allowNewPublicUsers,
        });
      });
    });

    describe("given the passwords do not match", () => {
      it("should return a 400", async () => {
        const createUserServiceMock = jest
          .spyOn(UserService, "createUser")
          .mockResolvedValueOnce(userPayload);

        const { statusCode } = await supertest(app)
          .post("/api/v2/users")
          .send({ ...userInput, passwordConfirmation: "doesnotmatch" });

        expect(statusCode).toBe(400);
        expect(createUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the user service throws on failed unique constraint", () => {
      it("should return a 409", async () => {
        const createUserServiceMock = jest
          .spyOn(UserService, "createUser")
          .mockRejectedValueOnce(
            new PrismaClientKnownRequestError("error", {
              code: "P2002",
              clientVersion: "",
            })
          );

        const { statusCode } = await supertest(app)
          .post("/api/v2/users")
          .send(userInput);

        expect(statusCode).toBe(409);
        expect(createUserServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe("get user route", () => {
    beforeEach(() => {
      userWithAllFollows.following = [];
      userWithAllFollows.followedBy = [];
    });

    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).get(
          `/api/v2/users/${otherUserId}`
        );

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(null);

        const { statusCode } = await supertest(app)
          .get(`/api/v2/users/${otherUserId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
      });
    });

    describe("given the user does exist", () => {
      it("should return a 200 status and the user", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(otherUserPayload);

        const { body, statusCode } = await supertest(app)
          .get(`/api/v2/users/${otherUserId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...otherUserResponse,
          followedByMe: false,
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
      });

      it("should return followedByMe as true if requestor follows the user", async () => {
        userWithAllFollows.following.push({ id: otherUserId });

        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(otherUserPayload);

        const { body, statusCode } = await supertest(app)
          .get(`/api/v2/users/${otherUserId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...otherUserResponse,
          followedByMe: true,
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
      });
    });
  });

  describe("get self route", () => {
    beforeEach(() => {
      userWithAllFollows.following = [];
      userWithAllFollows.followedBy = [];
    });

    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).get(`/api/v2/users/self`);

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user does exist", () => {
      it("should return a 200 status and the user", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const { body, statusCode } = await supertest(app)
          .get(`/api/v2/users/self`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...userWithAllFollows,
          createdAt: userWithAllFollows.createdAt.toJSON(),
          updatedAt: userWithAllFollows.updatedAt.toJSON(),
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
      });
    });
  });

  describe("get user list route", () => {
    beforeEach(() => {
      userWithAllFollows.following = [];
      userWithAllFollows.followedBy = [];
    });

    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).get("/api/v2/users");

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user is logged in", () => {
      describe("given no query is provided", () => {
        it("should return 200 and a list of all users", async () => {
          const findUserWithAllFollowsServiceMock = jest
            .spyOn(UserService, "findUserWithAllFollows")
            .mockResolvedValueOnce(userWithAllFollows);

          const findManyUsersServiceMock = jest
            .spyOn(UserService, "findManyUsers")
            .mockResolvedValueOnce([otherUserPayload]);

          const { statusCode, body } = await supertest(app)
            .get("/api/v2/users")
            .set("Authorization", `Bearer ${jwt}`);

          expect(statusCode).toBe(200);
          expect(body).toEqual({ data: [otherUserResponse] });
          expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
            id: userId,
          });
          expect(findManyUsersServiceMock).toHaveBeenCalled();
        });
      });

      describe("given a query is provided", () => {
        it("should return 200 and a list users filtered by name", async () => {
          const findUserWithAllFollowsServiceMock = jest
            .spyOn(UserService, "findUserWithAllFollows")
            .mockResolvedValueOnce(userWithAllFollows);

          const findManyUsersServiceMock = jest
            .spyOn(UserService, "findManyUsers")
            .mockResolvedValueOnce([]);

          const query = "xz";

          const { statusCode, body } = await supertest(app)
            .get(`/api/v2/users?q=${query}`)
            .set("Authorization", `Bearer ${jwt}`);

          expect(statusCode).toBe(200);
          expect(body).toEqual({ data: [] });
          expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
            id: userId,
          });
          expect(findManyUsersServiceMock).toHaveBeenCalled();
        });
      });
    });
  });

  describe("update user route", () => {
    beforeEach(() => {
      userWithAllFollows.following = [];
      userWithAllFollows.followedBy = [];
    });

    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app)
          .put(`/api/v2/users/${userId}`)
          .send(updateUserInput);

        expect(statusCode).toBe(401);
      });
    });

    describe("given the request is bad", () => {
      describe("because the firstName field is empty", () => {
        it("should return a 400 with error message", async () => {
          const findUserWithAllFollowsServiceMock = jest
            .spyOn(UserService, "findUserWithAllFollows")
            .mockResolvedValueOnce(userWithAllFollows);

          const findUserServiceMock = jest
            .spyOn(UserService, "findUser")
            .mockResolvedValueOnce(userPayload);

          const updateUserServiceMock = jest
            .spyOn(UserService, "findAndUpdateUser")
            .mockResolvedValueOnce({
              ...userPayload,
              ...updateUserInput,
            });

          const { statusCode, body } = await supertest(app)
            .put(`/api/v2/users/${userId}`)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
              ...updateUserInput,
              firstName: "",
            });

          expect(statusCode).toBe(400);
          expect(body[0].message).toEqual("First name must not be empty");
          expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
            id: userId,
          });
          expect(findUserServiceMock).not.toHaveBeenCalled();
          expect(updateUserServiceMock).not.toHaveBeenCalled();
        });
      });

      describe("because the lastName field is empty", () => {
        it("should return a 400 with error message", async () => {
          const findUserWithAllFollowsServiceMock = jest
            .spyOn(UserService, "findUserWithAllFollows")
            .mockResolvedValueOnce(userWithAllFollows);

          const findUserServiceMock = jest
            .spyOn(UserService, "findUser")
            .mockResolvedValueOnce(userPayload);

          const updateUserServiceMock = jest
            .spyOn(UserService, "findAndUpdateUser")
            .mockResolvedValueOnce({
              ...userPayload,
              ...updateUserInput,
            });

          const { statusCode, body } = await supertest(app)
            .put(`/api/v2/users/${userId}`)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
              ...updateUserInput,
              lastName: "",
            });

          expect(statusCode).toBe(400);
          expect(body[0].message).toEqual("Last name must not be empty");
          expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
            id: userId,
          });
          expect(findUserServiceMock).not.toHaveBeenCalled();
          expect(updateUserServiceMock).not.toHaveBeenCalled();
        });
      });
    });

    describe("given the user does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(null);

        const updateUserServiceMock = jest
          .spyOn(UserService, "findAndUpdateUser")
          .mockResolvedValueOnce({
            ...userPayload,
            ...updateUserInput,
          });

        const { statusCode } = await supertest(app)
          .put(`/api/v2/users/${userId}`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(updateUserInput);

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: userId },
        });
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the requesting user is not the target user", () => {
      it("should return a 403", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(otherUserPayload);

        const updateUserServiceMock = jest
          .spyOn(UserService, "findAndUpdateUser")
          .mockResolvedValueOnce({
            ...userPayload,
            ...updateUserInput,
          });

        const { statusCode } = await supertest(app)
          .put(`/api/v2/users/${otherUserId}`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(updateUserInput);

        expect(statusCode).toBe(403);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the request is good", () => {
      it("should return a 200 and the updated user", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(userPayload);

        const updateUserServiceMock = jest
          .spyOn(UserService, "findAndUpdateUser")
          .mockResolvedValueOnce({
            ...userPayload,
            ...updateUserInput,
          });

        const { statusCode, body } = await supertest(app)
          .put(`/api/v2/users/${userId}`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(updateUserInput);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...userResponse,
          ...updateUserInput,
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: userId },
        });
        expect(updateUserServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe("delete user route", () => {
    beforeEach(() => {
      userWithAllFollows.following = [];
      userWithAllFollows.followedBy = [];
    });

    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).delete(
          `/api/v2/users/${userId}`
        );

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(null);

        const deleteUserServiceMock = jest
          .spyOn(UserService, "deleteUser")
          .mockResolvedValueOnce([{ count: 0 }, { count: 0 }, userPayload]);

        const { statusCode } = await supertest(app)
          .delete(`/api/v2/users/${userId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: userId },
        });
        expect(deleteUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the requesting user is not the target user", () => {
      it("should return a 403", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(otherUserPayload);

        const deleteUserServiceMock = jest
          .spyOn(UserService, "deleteUser")
          .mockResolvedValueOnce([{ count: 0 }, { count: 0 }, userPayload]);

        const { statusCode } = await supertest(app)
          .delete(`/api/v2/users/${otherUserId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(403);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
        expect(deleteUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the request is valid", () => {
      it("should delete the user, return a 200 and null tokens", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(userPayload);

        const deleteUserServiceMock = jest
          .spyOn(UserService, "deleteUser")
          .mockResolvedValueOnce([{ count: 0 }, { count: 0 }, userPayload]);

        const { statusCode, body } = await supertest(app)
          .delete(`/api/v2/users/${userId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          deletedSessionCount: 0,
          deletedPostsCount: 0,
          deletedUser: userResponse,
          accessToken: null,
          refreshToken: null,
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: userId },
        });
        expect(deleteUserServiceMock).toHaveBeenCalledWith(userId);
      });
    });
  });

  describe("get user follows route", () => {
    beforeEach(() => {
      userWithAllFollows.following = [];
      userWithAllFollows.followedBy = [];
    });

    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).get(
          `/api/v2/users/${otherUserId}/following`
        );

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserWithFollowingServiceMock = jest
          .spyOn(UserService, "findUserWithFollowing")
          .mockResolvedValueOnce(null);

        const { statusCode } = await supertest(app)
          .get(`/api/v2/users/${otherUserId}/following`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserWithFollowingServiceMock).toHaveBeenCalledWith({
          id: otherUserId,
        });
      });
    });

    describe("given the user does exist", () => {
      it("should return a 200 status and the array of user follows", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserWithFollowingServiceMock = jest
          .spyOn(UserService, "findUserWithFollowing")
          .mockResolvedValueOnce({
            ...otherUserPayload,
            following: [{ id: userId }],
          });

        const { body, statusCode } = await supertest(app)
          .get(`/api/v2/users/${otherUserId}/following`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          id: otherUserId,
          data: [{ id: userId }],
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserWithFollowingServiceMock).toHaveBeenCalledWith({
          id: otherUserId,
        });
      });
    });
  });

  describe("follow user route", () => {
    beforeEach(() => {
      userWithAllFollows.following = [];
      userWithAllFollows.followedBy = [];
    });

    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app)
          .post(`/api/v2/users/${otherUserId}/follow`)
          .send({ follow: "true" });

        expect(statusCode).toBe(401);
      });
    });

    describe("given follow input is invalid", () => {
      it("should return a 400 with error message", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(otherUserPayload);

        const updateUserServiceMock = jest
          .spyOn(UserService, "findAndUpdateUser")
          .mockResolvedValueOnce({
            ...userPayload,
            // @ts-ignore
            following: [{ id: otherUserId }],
          });

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/users/${otherUserId}/follow`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ follow: "yes" });

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Follow must be true or false");
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).not.toHaveBeenCalled();
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the user does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(null);

        const updateUserServiceMock = jest
          .spyOn(UserService, "findAndUpdateUser")
          .mockResolvedValueOnce({
            ...userPayload,
            // @ts-ignore
            following: [{ id: otherUserId }],
          });

        const { statusCode } = await supertest(app)
          .post(`/api/v2/users/${otherUserId}/follow`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ follow: "true" });

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given follow=true and the user has not previously followed the target", () => {
      it("should update both users and return a 200", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(otherUserPayload);

        const updateUserServiceMock = jest
          .spyOn(UserService, "findAndUpdateUser")
          .mockResolvedValueOnce({
            ...userPayload,
            // @ts-ignore
            following: [{ id: otherUserId }],
          });

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/users/${otherUserId}/follow`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ follow: "true" });

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...userResponse,
          following: [{ id: otherUserId }],
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
        expect(updateUserServiceMock).toHaveBeenCalled();
      });
    });

    describe("given follow=false and the user has previously followed the target", () => {
      it("should update both users and return a 200", async () => {
        userWithAllFollows.following.push({ id: otherUserId });

        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(otherUserPayload);

        const updateUserServiceMock = jest
          .spyOn(UserService, "findAndUpdateUser")
          .mockResolvedValueOnce({
            ...userPayload,
            // @ts-ignore
            following: [],
          });

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/users/${otherUserId}/follow`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ follow: "false" });

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...userResponse,
          following: [],
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: otherUserId },
        });
        expect(updateUserServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe("populate user route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).post(
          "/api/v2/users/populate"
        );

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user is not an admin", () => {
      it("should return a 403", async () => {
        const { statusCode } = await supertest(app)
          .post("/api/v2/users/populate")
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(403);
      });
    });

    describe("given required fields are not included in request body", () => {
      it("should return a 400 with error message", async () => {
        const createUserAndPostsServiceMock = jest
          .spyOn(UserService, "createUserAndPosts")
          .mockResolvedValue(userPayload);

        const { statusCode, body } = await supertest(app)
          .post("/api/v2/users/populate")
          .set("Authorization", `Bearer ${adminJwt}`)
          .send({});

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("User count must be provided");
        expect(body[1].message).toEqual("Post count must be provided");
        expect(createUserAndPostsServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given request seeks to create more than 25 users", () => {
      it("should return a 400 with error message", async () => {
        const createUserAndPostsServiceMock = jest
          .spyOn(UserService, "createUserAndPosts")
          .mockResolvedValue(userPayload);

        const { statusCode, body } = await supertest(app)
          .post("/api/v2/users/populate")
          .set("Authorization", `Bearer ${adminJwt}`)
          .send({
            userCount: 30,
            postCount: 3,
          });

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual(
          "No more than 25 users can be created at a time"
        );
        expect(createUserAndPostsServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given request seeks to create more than 10 posts per user", () => {
      it("should return a 400 with error message", async () => {
        const createUserAndPostsServiceMock = jest
          .spyOn(UserService, "createUserAndPosts")
          .mockResolvedValue(userPayload);

        const { statusCode, body } = await supertest(app)
          .post("/api/v2/users/populate")
          .set("Authorization", `Bearer ${adminJwt}`)
          .send({
            userCount: 3,
            postCount: 15,
          });

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual(
          "No more than 10 posts per user can be created at a time"
        );
        expect(createUserAndPostsServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the request is good", () => {
      it("should create the requested documents and return a 201", async () => {
        const createUserAndPostsServiceMock = jest
          .spyOn(UserService, "createUserAndPosts")
          .mockResolvedValue(userPayload);

        const { statusCode } = await supertest(app)
          .post("/api/v2/users/populate")
          .set("Authorization", `Bearer ${adminJwt}`)
          .send({
            userCount: 2,
            postCount: 3,
          });

        expect(statusCode).toBe(201);
        expect(createUserAndPostsServiceMock).toHaveBeenCalledTimes(2);
      });
    });
  });
});

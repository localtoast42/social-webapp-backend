import supertest from "supertest";
import config from "config";
import createServer from "../utils/server";
import prisma from "../utils/client";
import * as UserService from "../services/user.service";
import * as SessionService from "../services/session.service";
import { createUserSessionHandler } from "../controllers/session.controller";
import * as JwtUtils from "../utils/jwt.utils";

const app = createServer();

const userId = "testId";

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

const userWithAllFollows: UserService.UserWithAllFollows = {
  ...userPayload,
  following: [],
  followedBy: [],
};

const sessionPayload = {
  id: 1234,
  userId: userId,
  valid: true,
  userAgent: "PostmanRuntime/7.39.0",
  createdAt: new Date(Date.now()),
  updatedAt: new Date(Date.now()),
};

const sessionResponse = {
  ...sessionPayload,
  createdAt: sessionPayload.createdAt.toJSON(),
  updatedAt: sessionPayload.updatedAt.toJSON(),
};

const jwtPayload = {
  ...userPayload,
  session: sessionPayload.id,
};

const jwt = JwtUtils.signJwt(jwtPayload, "accessTokenSecret");

const expiredJwt = JwtUtils.signJwt(jwtPayload, "accessTokenSecret", {
  expiresIn: "0",
});

const refreshJwt = JwtUtils.signJwt(jwtPayload, "refreshTokenSecret");

describe("session", () => {
  describe("re-issue expired access token", () => {
    describe("given access token is expired and no refresh token is provided", () => {
      it("should return a 401 without sending a new access token", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const { statusCode, headers } = await supertest(app)
          .get("/authcheck")
          .set("Authorization", `Bearer ${expiredJwt}`);

        expect(statusCode).toBe(401);
        expect(headers["x-access-token"]).not.toBeDefined();
        expect(findUserWithAllFollowsServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given access token is expired and an invalid refresh token is provided", () => {
      it("should return a 401 without sending a new access token", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const { statusCode, headers } = await supertest(app)
          .get("/authcheck")
          .set("Authorization", `Bearer ${expiredJwt}`)
          .set("X-Refresh", ``);

        expect(statusCode).toBe(401);
        expect(headers["x-access-token"]).not.toBeDefined();
        expect(findUserWithAllFollowsServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given access token is expired and valid refresh token is provided", () => {
      it("should return a 200 and a new access token", async () => {
        const findSessionMock = jest
          .spyOn(prisma.session, "findUnique")
          .mockResolvedValueOnce(sessionPayload);

        const findUserServiceMock = jest
          .spyOn(UserService, "findUser")
          .mockResolvedValueOnce(userPayload);

        const signJwtMock = jest
          .spyOn(JwtUtils, "signJwt")
          .mockReturnValueOnce(jwt);

        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const { statusCode, headers } = await supertest(app)
          .get("/authcheck")
          .set("Authorization", `Bearer ${expiredJwt}`)
          .set("X-Refresh", `${refreshJwt}`);

        expect(statusCode).toBe(200);
        expect(headers["x-access-token"]).toEqual(expect.any(String));
        expect(findUserServiceMock).toHaveBeenCalledWith({
          where: { id: userId },
        });
        expect(findSessionMock).toHaveBeenCalledWith({
          where: { id: sessionPayload.id },
        });
        expect(signJwtMock).toHaveBeenCalledWith(
          { ...userPayload, session: sessionPayload.id },
          "accessTokenSecret",
          { expiresIn: config.get<string>("accessTokenTtl") }
        );
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe("create session route", () => {
    describe("given required fields are not included in request body", () => {
      it("should return a 400 with error message", async () => {
        const validatePasswordServiceMock = jest
          .spyOn(UserService, "validatePassword")
          .mockResolvedValueOnce(userPayload);

        const createSessionServiceMock = jest
          .spyOn(SessionService, "createSession")
          .mockResolvedValueOnce(sessionPayload);

        const { statusCode, body } = await supertest(app)
          .post("/api/v2/sessions")
          .send({});

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Username is required");
        expect(body[1].message).toEqual("Password is required");
        expect(validatePasswordServiceMock).not.toHaveBeenCalled();
        expect(createSessionServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given validatePassword returns false", () => {
      it("should return a 401 with error message", async () => {
        const validatePasswordServiceMock = jest
          .spyOn(UserService, "validatePassword")
          .mockResolvedValueOnce(false);

        const createSessionServiceMock = jest
          .spyOn(SessionService, "createSession")
          .mockResolvedValueOnce(sessionPayload);

        const { statusCode } = await supertest(app)
          .post("/api/v2/sessions")
          .send({
            username: "",
            password: "",
          });

        expect(statusCode).toBe(401);
        expect(validatePasswordServiceMock).toHaveBeenCalled();
        expect(createSessionServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the username and password are valid", () => {
      it("should return a signed accessToken and refreshToken", async () => {
        jest
          .spyOn(UserService, "validatePassword")
          // @ts-ignore
          .mockResolvedValueOnce(userPayload);

        jest
          .spyOn(SessionService, "createSession")
          .mockResolvedValueOnce(sessionPayload);

        const req = {
          get: () => {
            return "a user agent";
          },
          body: {
            username: userInput.username,
            password: userInput.password,
          },
        };

        const json = jest.fn();

        const res = {
          json,
        };

        // @ts-ignore
        await createUserSessionHandler(req, res);

        expect(json).toHaveBeenCalledWith({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });
      });
    });
  });

  describe("get sessions route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).get("/api/v2/sessions");

        expect(statusCode).toBe(401);
      });
    });

    describe("given the request is good", () => {
      it("should return a 200 and the array of user sessions", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findSessionsServiceMock = jest
          .spyOn(SessionService, "findSessions")
          .mockResolvedValueOnce([sessionPayload]);

        const { body, statusCode } = await supertest(app)
          .get("/api/v2/sessions")
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          data: [sessionResponse],
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findSessionsServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe("delete sessions route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).delete("/api/v2/sessions");

        expect(statusCode).toBe(401);
      });
    });

    describe("given the request is good", () => {
      it("should return a 200 and null tokens", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const updateSessionServiceMock = jest
          .spyOn(SessionService, "findAndUpdateSession")
          .mockResolvedValueOnce({ ...sessionPayload, valid: false });

        const { body, statusCode } = await supertest(app)
          .delete("/api/v2/sessions")
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          session: {
            ...sessionResponse,
            valid: false,
          },
          accessToken: null,
          refreshToken: null,
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(updateSessionServiceMock).toHaveBeenCalled();
      });
    });
  });
});

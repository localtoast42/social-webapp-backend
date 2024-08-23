import supertest from "supertest";
import { DateTime } from "luxon";
import * as UserService from "../services/user.service";
import * as PostService from "../services/post.service";
import createServer from "../utils/server";
import { signJwt } from "../utils/jwt.utils";

jest.mock("../utils/logger");

const app = createServer();

const userId = "userTestId";
const otherUserId = "otherUserTestId";

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

const userResponse = {
  ...userPayload,
  createdAt: userPayload.createdAt.toJSON(),
  updatedAt: userPayload.updatedAt.toJSON(),
};

const userWithAllFollows: UserService.UserWithAllFollows = {
  ...userPayload,
  following: [],
  followedBy: [],
};

const postId = "postTestId";

const postInput = {
  text: "Test post",
};

const updatePostInput = {
  text: "Test post (updated)",
};

const postCreateDate = new Date(Date.now());

const postPayload = {
  id: postId,
  text: "Test post",
  isPublic: true,
  authorId: userId,
  parentId: null,
  url: `/posts/${postId}`,
  createdAt: postCreateDate,
  updatedAt: postCreateDate,
  createDateFormatted: DateTime.fromJSDate(postCreateDate).toLocaleString(
    DateTime.DATE_MED
  ),
};

const postResponse = {
  ...postPayload,
  createdAt: postPayload.createdAt.toJSON(),
  updatedAt: postPayload.updatedAt.toJSON(),
};

const jwt = signJwt(userPayload, "accessTokenSecret");

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2024, 8, 1));
});

afterAll(() => {
  jest.useRealTimers();
});

describe("post", () => {
  describe("get post route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).get(
          `/api/v2/posts/${postId}`
        );

        expect(statusCode).toBe(401);
      });
    });

    describe("given the post does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostWithAuthorAndLikesServiceMock = jest
          .spyOn(PostService, "findPostWithAuthorAndLikes")
          .mockResolvedValueOnce(null);

        const { statusCode } = await supertest(app)
          .get(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostWithAuthorAndLikesServiceMock).toHaveBeenCalledWith({
          id: postId,
        });
      });
    });

    describe("given the post does exist", () => {
      it("should return a 200 status and the post", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostWithAuthorAndLikesServiceMock = jest
          .spyOn(PostService, "findPostWithAuthorAndLikes")
          .mockResolvedValueOnce({
            ...postPayload,
            author: userPayload,
            likes: [],
            _count: { likes: 0, children: 0 },
          });

        const { body, statusCode } = await supertest(app)
          .get(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...postResponse,
          author: userResponse,
          likes: [],
          _count: { likes: 0, children: 0 },
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostWithAuthorAndLikesServiceMock).toHaveBeenCalledWith({
          id: postId,
        });
      });
    });
  });

  describe("create post route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app)
          .post("/api/v2/posts")
          .send(postInput);

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user is logged in and sends empty text", () => {
      it("should return a 400 with error message", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const createPostServiceMock = jest
          .spyOn(PostService, "createPost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode, body } = await supertest(app)
          .post("/api/v2/posts")
          .set("Authorization", `Bearer ${jwt}`)
          .send({ text: "" });

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Post must not be empty");
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(createPostServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the request is good and no parent postID is provided", () => {
      it("should return a 201 and create the post", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const createPostServiceMock = jest
          .spyOn(PostService, "createPost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/posts/`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(postInput);

        expect(statusCode).toBe(201);
        expect(body).toEqual(postResponse);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(createPostServiceMock).toHaveBeenCalled();
      });
    });

    describe("given the request is good and a parent postID is provided", () => {
      it("should return a 201 and create the comment", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const createPostServiceMock = jest
          .spyOn(PostService, "createPost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/posts/${postId}/comments`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(postInput);

        expect(statusCode).toBe(201);
        expect(body).toEqual(postResponse);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(createPostServiceMock).toHaveBeenCalledWith({
          ...postInput,
          isPublic: !userWithAllFollows.isGuest,
          author: { connect: { id: userId } },
          parent: { connect: { id: postId } },
        });
      });
    });
  });

  describe("update post route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app)
          .put(`/api/v2/posts/${postId}`)
          .send(updatePostInput);

        expect(statusCode).toBe(401);
      });
    });

    describe("given the user sends empty text", () => {
      it("should return a 400 with error message", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(postPayload);

        const updatePostServiceMock = jest
          .spyOn(PostService, "findAndUpdatePost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode, body } = await supertest(app)
          .put(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ text: "" });

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Post must not be empty");
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).not.toHaveBeenCalled();
        expect(updatePostServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the post does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(null);

        const updatePostServiceMock = jest
          .spyOn(PostService, "findAndUpdatePost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode } = await supertest(app)
          .put(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(updatePostInput);

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(updatePostServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the user is not the post author", () => {
      it("should return a 403", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce({
            ...postPayload,
            authorId: otherUserId,
          });

        const updatePostServiceMock = jest
          .spyOn(PostService, "findAndUpdatePost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode } = await supertest(app)
          .put(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(updatePostInput);

        expect(statusCode).toBe(403);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(updatePostServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the user is logged in", () => {
      it("should return a 200 and the updated post", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(postPayload);

        const updatePostServiceMock = jest
          .spyOn(PostService, "findAndUpdatePost")
          .mockResolvedValueOnce({
            ...postPayload,
            text: updatePostInput.text,
          });

        const { statusCode, body } = await supertest(app)
          .put(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`)
          .send(updatePostInput);

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...postResponse,
          text: updatePostInput.text,
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(updatePostServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe("like post route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app)
          .post(`/api/v2/posts/${postId}/like`)
          .send({ like: "true" });

        expect(statusCode).toBe(401);
      });
    });

    describe("given like input is invalid", () => {
      it("should return a 400 with error message", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(postPayload);

        const updatePostWithLikesServiceMock = jest
          .spyOn(PostService, "updatePostWithLikes")
          .mockResolvedValueOnce({
            ...postPayload,
            likes: [],
          });

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/posts/${postId}/like`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ like: "yes" });

        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Like must be true or false");
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).not.toHaveBeenCalled();
        expect(updatePostWithLikesServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the post does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(null);

        const updatePostWithLikesServiceMock = jest
          .spyOn(PostService, "updatePostWithLikes")
          .mockResolvedValueOnce({
            ...postPayload,
            likes: [],
          });

        const { statusCode } = await supertest(app)
          .post(`/api/v2/posts/${postId}/like`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ like: "true" });

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(updatePostWithLikesServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given like=true and the user has not previously liked the post", () => {
      it("should add the user to likes and return the updated post", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(postPayload);

        const updatePostWithLikesServiceMock = jest
          .spyOn(PostService, "updatePostWithLikes")
          .mockResolvedValueOnce({
            ...postPayload,
            likes: [{ id: userId }],
          });

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/posts/${postId}/like`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ like: "true" });

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...postResponse,
          likes: [userId],
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(updatePostWithLikesServiceMock).toHaveBeenCalled();
      });
    });

    describe("given like=false and the user has previously liked the post", () => {
      it("should remove the user from likes and return the updated post", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(postPayload);

        const updatePostWithLikesServiceMock = jest
          .spyOn(PostService, "updatePostWithLikes")
          .mockResolvedValueOnce({
            ...postPayload,
            likes: [{ id: userId }],
          });

        const { statusCode, body } = await supertest(app)
          .post(`/api/v2/posts/${postId}/like`)
          .set("Authorization", `Bearer ${jwt}`)
          .send({ like: "false" });

        expect(statusCode).toBe(200);
        expect(body).toEqual({
          ...postResponse,
          likes: [userId],
        });
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(updatePostWithLikesServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe("delete post route", () => {
    describe("given the user is not logged in", () => {
      it("should return a 401", async () => {
        const { statusCode } = await supertest(app).delete(
          `/api/v2/posts/${postId}`
        );

        expect(statusCode).toBe(401);
      });
    });

    describe("given the post does not exist", () => {
      it("should return a 404", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(null);

        const deletePostServiceMock = jest
          .spyOn(PostService, "deletePost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode } = await supertest(app)
          .delete(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(404);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(deletePostServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given the user is not the post author", () => {
      it("should return a 403", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce({
            ...postPayload,
            authorId: otherUserId,
          });

        const deletePostServiceMock = jest
          .spyOn(PostService, "deletePost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode } = await supertest(app)
          .delete(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(403);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(deletePostServiceMock).not.toHaveBeenCalled();
      });
    });

    describe("given user is logged in and request is valid", () => {
      it("should delete the post and comments and return number deleted", async () => {
        const findUserWithAllFollowsServiceMock = jest
          .spyOn(UserService, "findUserWithAllFollows")
          .mockResolvedValueOnce(userWithAllFollows);

        const findPostServiceMock = jest
          .spyOn(PostService, "findPost")
          .mockResolvedValueOnce(postPayload);

        const deletePostServiceMock = jest
          .spyOn(PostService, "deletePost")
          .mockResolvedValueOnce(postPayload);

        const { statusCode, body } = await supertest(app)
          .delete(`/api/v2/posts/${postId}`)
          .set("Authorization", `Bearer ${jwt}`);

        expect(statusCode).toBe(200);
        expect(body).toEqual(postResponse);
        expect(findUserWithAllFollowsServiceMock).toHaveBeenCalledWith({
          id: userId,
        });
        expect(findPostServiceMock).toHaveBeenCalledWith({
          where: { id: postId },
        });
        expect(deletePostServiceMock).toHaveBeenCalledWith(postId);
      });
    });
  });
});

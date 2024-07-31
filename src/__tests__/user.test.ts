import supertest from 'supertest';
import config from 'config';
import mongoose from 'mongoose';
import createServer from '../utils/server';
import { signJwt } from '../utils/jwt.utils';
import UserModel from '../models/user.model';
import * as UserService from '../services/user.service';

jest.mock('../utils/logger');

const app = createServer();

const allowNewPublicUsers = config.get<boolean>('allowNewPublicUsers');

const userObjectId = new mongoose.Types.ObjectId();
const userId = userObjectId.toString();

const otherUserObjectId = new mongoose.Types.ObjectId();
const otherUserId = otherUserObjectId.toString();

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
  _id: userObjectId,
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
  followers: [],
  following: [],
};

const otherUserPayload = {
  _id: otherUserObjectId,
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
  followers: [],
  following: [],
};

const userDocument = new UserModel(userPayload);

const updatedUserDocument = new UserModel({
  ...userPayload,
  ...updateUserInput
});

const otherUserDocument = new UserModel(otherUserPayload);

const userResponse = {
  ...userDocument.toJSON(),
  "_id": userId,
  "followedByMe": false,
};

const sessionPayload = {
  _id: new mongoose.Types.ObjectId(),
  user: userId,
  valid: true,
  userAgent: "PostmanRuntime/7.39.0",
};

const jwt = signJwt(userPayload, 'accessTokenSecret');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2024, 8, 1));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('user', () => {
  describe('create user route', () => {
    describe('given the username and password are valid', () => {
      it('should return the user payload', async () => {
        const createUserServiceMock = jest
          .spyOn(UserService, 'createUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument.toJSON());

        const { statusCode, body } = await supertest(app)
          .post('/api/v1/users')
          .send(userInput);

        expect(statusCode).toBe(200);
        expect(body).toEqual(userResponse);
        expect(createUserServiceMock).toHaveBeenCalledWith({
          ...userInput,
          isGuest: !allowNewPublicUsers,
        });
      });
    });

    describe('given the passwords do not match', () => {
      it('should return a 400', async () => {
        const createUserServiceMock = jest
          .spyOn(UserService, 'createUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument.toJSON());
        
        const { statusCode } = await supertest(app)
          .post('/api/v1/users')
          .send({ ...userInput, passwordConfirmation: "doesnotmatch" });

        expect(statusCode).toBe(400);
        expect(createUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the user service throws', () => {
      it('should return a 409', async () => {
        const createUserServiceMock = jest
          .spyOn(UserService, 'createUser')
          // @ts-ignore
          .mockRejectedValueOnce("did not work");

        const { statusCode } = await supertest(app)
          .post('/api/v1/users')
          .send(userInput);

        expect(statusCode).toBe(409);
        expect(createUserServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe('get user route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}`);
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the userId is not a valid ObjectId', () => {
      it('should return a 400 with error message', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(userDocument);
  
        const { statusCode, body } = await supertest(app)
          .get(`/api/v1/users/not_valid_id`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Invalid userId");
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('given the user does not exist', () => {
      it('should return a 404', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(null);

        const { statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(404);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('given the user does exist', () => {
      it('should return a 200 status and the user', async () => { 
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(userDocument);

        const { body, statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(body).toEqual(userResponse);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
      });

      it('should return followedByMe as true if requestor follows the user', async () => { 
        const userDocumentWithFollows = new UserModel(userPayload);

        userDocumentWithFollows.followers.push(userObjectId);

        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(userDocumentWithFollows);

        const { body, statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(body.followedByMe).toBe(true);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('get self route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .get(`/api/v1/users/self`);
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the user does exist', () => {
      it('should return a 200 status and the user', async () => { 
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument);

        const { body, statusCode } = await supertest(app)
          .get(`/api/v1/users/self`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(body).toEqual(userResponse);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
      });
    });
  });

  describe('get user list route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .get('/api/v1/users');
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the user is logged in', () => {
      describe('given no query is provided', () => {
        it('should return 200 and a list of all users', async () => {   
          const findUserServiceMock = jest
            .spyOn(UserService, 'findUser')
            // @ts-ignore
            .mockReturnValueOnce(userDocument);

          const findManyUsersServiceMock = jest
            .spyOn(UserService, 'findManyUsers')
            // @ts-ignore
            .mockReturnValueOnce(userDocument);

          const { statusCode, body } = await supertest(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${jwt}`);
            
          expect(statusCode).toBe(200);
          expect(body).toEqual(userResponse);
          expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
          expect(findManyUsersServiceMock).toHaveBeenCalled();
        });
      });

      describe('given a query is provided', () => {
        it('should return 200 and a list users filtered by name', async () => {   
          const findUserServiceMock = jest
            .spyOn(UserService, 'findUser')
            // @ts-ignore
            .mockReturnValueOnce(userDocument);

          const findManyUsersServiceMock = jest
            .spyOn(UserService, 'findManyUsers')
            // @ts-ignore
            .mockReturnValueOnce(null);

          const query = "xz";

          const { statusCode, body } = await supertest(app)
            .get(`/api/v1/users?q=${query}`)
            .set('Authorization', `Bearer ${jwt}`);
            
          expect(statusCode).toBe(200);
          expect(body).toEqual(null);
          expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
          expect(findManyUsersServiceMock).toHaveBeenCalled();
        });
      });
    });
  });

  describe('update user route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .put(`/api/v1/users/${userId}`)
          .send(updateUserInput);
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the request is bad', () => {
      describe('because the userId is not a valid ObjectId', () => {
        it('should return a 400 with error message', async () => {
          const findUserServiceMock = jest
            .spyOn(UserService, 'findUser')
            // @ts-ignore
            .mockReturnValueOnce(userDocument)
            // @ts-ignore
            .mockReturnValueOnce(userDocument);
  
          const updateUserServiceMock = jest
            .spyOn(UserService, 'findAndUpdateUser')
            // @ts-ignore
            .mockReturnValueOnce(updatedUserDocument);
    
          const { statusCode, body } = await supertest(app)
            .put(`/api/v1/users/not_valid_id`)
            .set('Authorization', `Bearer ${jwt}`)
            .send(updateUserInput);
          
          expect(statusCode).toBe(400);
          expect(body[0].message).toEqual("Invalid userId");
          expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
          expect(findUserServiceMock).toHaveBeenCalledTimes(1);
          expect(updateUserServiceMock).not.toHaveBeenCalled();
        });
      });

      describe('because the firstName field is empty', () => {
        it('should return a 400 with error message', async () => {
          const findUserServiceMock = jest
            .spyOn(UserService, 'findUser')
            // @ts-ignore
            .mockReturnValueOnce(userDocument)
            // @ts-ignore
            .mockReturnValueOnce(userDocument);
  
          const updateUserServiceMock = jest
            .spyOn(UserService, 'findAndUpdateUser')
            // @ts-ignore
            .mockReturnValueOnce(updatedUserDocument);
    
          const { statusCode, body } = await supertest(app)
            .put(`/api/v1/users/${userId}`)
            .set('Authorization', `Bearer ${jwt}`)
            .send({
              ...updateUserInput,
              firstName: "",
            });
          
          expect(statusCode).toBe(400);
          expect(body[0].message).toEqual("First name must not be empty");
          expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
          expect(findUserServiceMock).toHaveBeenCalledTimes(1);
          expect(updateUserServiceMock).not.toHaveBeenCalled();
        });
      });

      describe('because the lastName field is empty', () => {
        it('should return a 400 with error message', async () => {
          const findUserServiceMock = jest
            .spyOn(UserService, 'findUser')
            // @ts-ignore
            .mockReturnValueOnce(userDocument)
            // @ts-ignore
            .mockReturnValueOnce(userDocument);
  
          const updateUserServiceMock = jest
            .spyOn(UserService, 'findAndUpdateUser')
            // @ts-ignore
            .mockReturnValueOnce(updatedUserDocument);
    
          const { statusCode, body } = await supertest(app)
            .put(`/api/v1/users/${userId}`)
            .set('Authorization', `Bearer ${jwt}`)
            .send({
              ...updateUserInput,
              lastName: "",
            });
          
          expect(statusCode).toBe(400);
          expect(body[0].message).toEqual("Last name must not be empty");
          expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
          expect(findUserServiceMock).toHaveBeenCalledTimes(1);
          expect(updateUserServiceMock).not.toHaveBeenCalled();
        });
      });
    });

    describe('given the user does not exist', () => {
      it('should return a 404', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(null);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce({
            ...userDocument,
            ...updateUserInput
          });

        const { statusCode } = await supertest(app)
          .put(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`)
          .send(updateUserInput);
        
        expect(statusCode).toBe(404);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the requesting user is not the target user', () => {
      it('should return a 403', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(updatedUserDocument);

        const { statusCode } = await supertest(app)
          .put(`/api/v1/users/${otherUserId}`)
          .set('Authorization', `Bearer ${jwt}`)
          .send(updateUserInput);
        
        expect(statusCode).toBe(403);
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the request is good', () => {
      it('should return a 200 and the updated user', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(userDocument);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(updatedUserDocument);

        const { statusCode, body } = await supertest(app)
          .put(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`)
          .send(updateUserInput);
        
        expect(statusCode).toBe(200);
        expect(body).toEqual(updatedUserDocument.toJSON());
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(updateUserServiceMock).toHaveBeenCalled();
      });
    });
  });

  describe('delete user route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .delete(`/api/v1/users/${userId}`);
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the request is bad', () => {
      describe('because the userId is not a valid ObjectId', () => {
        it('should return a 400 with error message', async () => {
          const findUserServiceMock = jest
            .spyOn(UserService, 'findUser')
            // @ts-ignore
            .mockReturnValueOnce(userDocument)
            // @ts-ignore
            .mockReturnValueOnce(userDocument);
  
          const deleteUserServiceMock = jest
            .spyOn(UserService, 'deleteUser')
            // @ts-ignore
            .mockReturnValueOnce({ deletedCount: 1 });
    
          const { statusCode, body } = await supertest(app)
            .put(`/api/v1/users/not_valid_id`)
            .set('Authorization', `Bearer ${jwt}`);
          
          expect(statusCode).toBe(400);
          expect(body[0].message).toEqual("Invalid userId");
          expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
          expect(findUserServiceMock).toHaveBeenCalledTimes(1);
          expect(deleteUserServiceMock).not.toHaveBeenCalled();
        });
      });
    });

    describe('given the user does not exist', () => {
      it('should return a 404', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(null);

        const deleteUserServiceMock = jest
          .spyOn(UserService, 'deleteUser')
          // @ts-ignore
          .mockReturnValueOnce({ deletedCount: 1 });

        const { statusCode } = await supertest(app)
          .delete(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(404);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(deleteUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the requesting user is not the target user', () => {
      it('should return a 403', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const deleteUserServiceMock = jest
          .spyOn(UserService, 'deleteUser')
          // @ts-ignore
          .mockReturnValueOnce({ deletedCount: 1 });

        const { statusCode } = await supertest(app)
          .delete(`/api/v1/users/${otherUserId}`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(403);
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(deleteUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the request is valid', () => {
      it('should delete the user and return a 200', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(userDocument);

        const deleteUserServiceMock = jest
          .spyOn(UserService, 'deleteUser')
          // @ts-ignore
          .mockReturnValueOnce({ deletedCount: 1 });

        const { statusCode } = await supertest(app)
          .delete(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(deleteUserServiceMock).toHaveBeenCalledWith({ _id: userId });
      });
    });
  });

  describe('get user follows route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}/following`);
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the userId is not a valid ObjectId', () => {
      it('should return a 400 with error message', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce({
            // @ts-ignore
            following: [ userObjectId ],
          });
  
        const { statusCode, body } = await supertest(app)
          .get(`/api/v1/users/not_valid_id/following`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Invalid userId");
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('given the user does not exist', () => {
      it('should return a 404', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(null);

        const { statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}/following`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(404);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('given the user does exist', () => {
      it('should return a 200 status and the array of user follows', async () => { 
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          .mockReturnValueOnce({
            // @ts-ignore
            following: [ userObjectId ],
          });

        const { body, statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}/following`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(body).toEqual({ following: [ userId ] });
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('follow user route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .post(`/api/v1/users/${otherUserId}/follow`);
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the userId is not a valid ObjectId', () => {
      it('should return a 400 with error message', async () => {
        const userDocumentWithFollows = new UserModel(userPayload);
        userDocumentWithFollows.following.push(otherUserObjectId);

        const otherUserDocumentWithFollowers = new UserModel(otherUserPayload);
        otherUserDocumentWithFollowers.followers.push(userObjectId);

        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocumentWithFollows)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocumentWithFollowers);
  
        const { statusCode, body } = await supertest(app)
          .post(`/api/v1/users/not_valid_id/follow`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Invalid userId");
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(1);
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the user does not exist', () => {
      it('should return a 404', async () => {
        const userDocumentWithFollows = new UserModel(userPayload);
        userDocumentWithFollows.following.push(otherUserObjectId);

        const otherUserDocumentWithFollowers = new UserModel(otherUserPayload);
        otherUserDocumentWithFollowers.followers.push(userObjectId);

        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(null);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocumentWithFollows)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocumentWithFollowers);

        const { statusCode } = await supertest(app)
          .post(`/api/v1/users/${otherUserId}/follow`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(404);
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the request is good', () => {
      it('should update both users and return a 200', async () => {
        const userDocumentWithFollows = new UserModel(userPayload);
        userDocumentWithFollows.following.push(otherUserObjectId);

        const otherUserDocumentWithFollowers = new UserModel(otherUserPayload);
        otherUserDocumentWithFollowers.followers.push(userObjectId);
        
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocumentWithFollows)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocumentWithFollowers);

        const { statusCode } = await supertest(app)
          .post(`/api/v1/users/${otherUserId}/follow`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(updateUserServiceMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('unfollow user route', () => {
    describe('given the user is not logged in', () => {
      it('should return a 401', async () => {   
        const { statusCode } = await supertest(app)
          .delete(`/api/v1/users/${otherUserId}/follow`);
          
        expect(statusCode).toBe(401);
      });
    });

    describe('given the userId is not a valid ObjectId', () => {
      it('should return a 400 with error message', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);
  
        const { statusCode, body } = await supertest(app)
          .delete(`/api/v1/users/not_valid_id/follow`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(400);
        expect(body[0].message).toEqual("Invalid userId");
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(1);
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the user does not exist', () => {
      it('should return a 404', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(null);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const { statusCode } = await supertest(app)
          .delete(`/api/v1/users/${otherUserId}/follow`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(404);
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(updateUserServiceMock).not.toHaveBeenCalled();
      });
    });

    describe('given the request is good', () => {
      it('should update both users and return a 200', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const updateUserServiceMock = jest
          .spyOn(UserService, 'findAndUpdateUser')
          // @ts-ignore
          .mockReturnValueOnce(userDocument)
          // @ts-ignore
          .mockReturnValueOnce(otherUserDocument);

        const { statusCode } = await supertest(app)
          .delete(`/api/v1/users/${otherUserId}/follow`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
        expect(updateUserServiceMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('populate user route', () => {

  });
});
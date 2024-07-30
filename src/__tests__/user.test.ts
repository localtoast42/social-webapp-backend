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

const userDocument = new UserModel(userPayload);

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
          .mockReturnValueOnce(userPayload)
          // @ts-ignore
          .mockReturnValueOnce(userPayload);
  
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
          .mockReturnValueOnce(userPayload)
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
          .mockReturnValueOnce(userPayload)
          // @ts-ignore
          .mockReturnValueOnce(userDocument.toJSON());

        const { body, statusCode } = await supertest(app)
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(body).toEqual(userResponse);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
      });

      it('should return followedByMe as true if requestor follows the user', async () => { 
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userPayload)
          .mockReturnValueOnce({
            ...userDocument.toJSON(),
            // @ts-ignore
            followers: [ userObjectId ],
          });

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

    describe('given the user does not exist', () => {
      it('should return a 404', async () => {
        const findUserServiceMock = jest
          .spyOn(UserService, 'findUser')
          // @ts-ignore
          .mockReturnValueOnce(userPayload)
          // @ts-ignore
          .mockReturnValueOnce(null);

        const { statusCode } = await supertest(app)
          .get(`/api/v1/users/self`)
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
          .mockReturnValueOnce(userPayload)
          // @ts-ignore
          .mockReturnValueOnce(userDocument.toJSON());

        const { body, statusCode } = await supertest(app)
          .get(`/api/v1/users/self`)
          .set('Authorization', `Bearer ${jwt}`);
        
        expect(statusCode).toBe(200);
        expect(body).toEqual(userResponse);
        expect(findUserServiceMock).toHaveBeenCalledWith({ _id: userId });
        expect(findUserServiceMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('get user list route', () => {

  });

  describe('update user route', () => {

  });

  describe('delete user route', () => {

  });

  describe('get user follows route', () => {

  });

  describe('follow user route', () => {

  });

  describe('unfollow user route', () => {

  });

  describe('populate user route', () => {

  });
});
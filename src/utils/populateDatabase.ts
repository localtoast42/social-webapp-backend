import { Prisma } from "@prisma/client";
import { fakerEN_US as faker } from "@faker-js/faker";
import { createUser, createUserAndPosts } from "../services/user.service";
import { createPost } from "../services/post.service";
import { CreateUserInput } from "../schemas/user.schema";

export function createRandomUserInput() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const password = firstName.concat("", lastName);
  const username = faker.internet.userName({
    firstName: firstName,
    lastName: lastName,
  });

  const input: CreateUserInput = {
    username: username,
    password: password,
    firstName: firstName,
    lastName: lastName,
    city: faker.location.city(),
    state: faker.location.state(),
    country: "United States",
    imageUrl: faker.image.avatarGitHub(),
    isGuest: false,
  };

  return input;
}

export async function createRandomUser() {
  const input = createRandomUserInput();
  try {
    const user = await createUser(input);
    return user;
  } catch (e: any) {
    throw new Error(e);
  }
}

export function createRandomPostInput(userId: string) {
  const input: Prisma.PostCreateInput = {
    text: faker.lorem.paragraph({ min: 1, max: 4 }),
    isPublic: true,
    author: { connect: { id: userId } },
  };

  return input;
}

export async function createRandomPost(userId: string) {
  const input = createRandomPostInput(userId);

  try {
    const post = await createPost(input);
    return post;
  } catch (e: any) {
    throw new Error(e);
  }
}

export async function createRandomUserAndPosts(postCount: number) {
  const userInput = createRandomUserInput();

  const posts = [];

  for (let i = 0; i < postCount; i++) {
    posts.push({
      text: faker.lorem.paragraph({ min: 1, max: 4 }),
      isPublic: true,
    });
  }

  try {
    const newUser = await createUserAndPosts(userInput, posts);
    return newUser;
  } catch (e: any) {
    throw new Error(e);
  }
}

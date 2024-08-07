import { PrismaClient } from "@prisma/client";

const prismaBase = new PrismaClient({
  omit: {
    user: {
      hashedPassword: true,
    },
  },
});

const prisma = prismaBase.$extends({
  result: {
    user: {
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user) {
          return `${user.firstName} ${user.lastName}`;
        },
      },
      url: {
        needs: { id: true },
        compute(user) {
          return `/users/${user.id}`;
        },
      },
    },
    post: {
      url: {
        needs: { id: true },
        compute(post) {
          return `/posts/${post.id}`;
        },
      },
    },
  },
});

export default prisma;

import config from "config";
import { get } from "lodash";
import { Prisma } from "@prisma/client";
import prisma from "../utils/client";
import { findUser } from "./user.service";
import logger from "../utils/logger";
import { signJwt, verifyJwt } from "../utils/jwt.utils";

export async function createSession(input: Prisma.SessionCreateInput) {
  try {
    return prisma.session.create({ data: input });
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findSessions(query: Prisma.SessionFindManyArgs) {
  try {
    return prisma.session.findMany(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function findAndUpdateSession(query: Prisma.SessionUpdateArgs) {
  try {
    return prisma.session.update(query);
  } catch (e: any) {
    logger.error(e);
    throw new Error(e);
  }
}

export async function reIssueAccessToken({
  refreshToken,
}: {
  refreshToken: string;
}) {
  const { decoded } = verifyJwt(refreshToken, "refreshTokenSecret");

  if (!decoded || !get(decoded, "id")) return "";

  const session = await prisma.session.findUnique({
    where: {
      id: get(decoded, "session"),
    },
  });

  if (!session || !session.valid) return "";

  const user = await findUser({
    where: {
      id: session.userId,
    },
  });

  if (!user) return "";

  const accessToken = signJwt(
    { ...user, session: session.id },
    "accessTokenSecret",
    { expiresIn: config.get<string>("accessTokenTtl") }
  );

  return accessToken;
}

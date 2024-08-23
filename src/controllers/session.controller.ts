import { Request, Response } from "express";
import config from "config";
import { signJwt } from "../utils/jwt.utils";
import { UserWithAllFollows, validatePassword } from "../services/user.service";
import {
  createSession,
  findAndUpdateSession,
  findSessions,
} from "../services/session.service";
import { CreateSessionRequest } from "../schemas/session.schema";

export async function createUserSessionHandler(
  req: Request<{}, {}, CreateSessionRequest["body"]>,
  res: Response
) {
  const user = await validatePassword(req.body);

  if (!user) {
    return res.status(401).send("Invalid username or password");
  }

  const session = await createSession({
    user: { connect: { id: user.id } },
    userAgent: req.get("user-agent") || "",
  });

  const accessToken = signJwt(
    { ...user, session: session.id },
    "accessTokenSecret",
    { expiresIn: config.get<string>("accessTokenTtl") }
  );

  const refreshToken = signJwt(
    { ...user, session: session.id },
    "refreshTokenSecret",
    { expiresIn: config.get<string>("refreshTokenTtl") }
  );

  return res.json({ accessToken, refreshToken });
}

export async function getUserSessionsHandler(req: Request, res: Response) {
  const user: NonNullable<UserWithAllFollows> = res.locals.user;

  const sessions = await findSessions({
    where: {
      userId: user.id,
      valid: true,
    },
  });

  return res.json({
    data: sessions,
  });
}

export async function deleteUserSessionHandler(req: Request, res: Response) {
  const sessionId: number = res.locals.session;

  const updatedSession = await findAndUpdateSession({
    where: { id: sessionId },
    data: { valid: false },
  });

  return res.json({
    session: updatedSession,
    accessToken: null,
    refreshToken: null,
  });
}

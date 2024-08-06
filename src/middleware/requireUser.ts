import { Request, Response, NextFunction } from "express";
import { findUserWithAllFollows } from "../services/user.service";

const requireUser = async (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user;

  if (!user) {
    return res.sendStatus(401);
  }

  const result = await findUserWithAllFollows({ id: user.id });

  if (!result) {
    return res.sendStatus(404);
  }

  res.locals.user = result;

  return next();
};

export default requireUser;

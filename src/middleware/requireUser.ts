import { Request, Response, NextFunction } from "express";
import { findUser } from "../services/user.service";

const requireUser = async (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user;

  if (!user) {
    return res.sendStatus(401);
  }

  res.locals.user = await findUser({
    where: { id: user.id },
  });

  if (!res.locals.user) {
    return res.sendStatus(404);
  }

  return next();
};

export default requireUser;

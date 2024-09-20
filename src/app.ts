import "dotenv/config";
import config from "config";
import { Request, Response, NextFunction } from "express";
import createServer from "./utils/server";
import logger from "./utils/logger";
import prisma from "./utils/client";
import { startMetricsServer } from "./utils/metrics";

const app = createServer();

const port = config.get<number>("port");

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.sendStatus(500);
});

app.listen(port, async () => {
  logger.info(`App is running at http://localhost:${port}`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Successfully connected to DB");
  } catch (e) {
    logger.error("Failed to connect to DB");
    process.exit(1);
  }

  startMetricsServer();
});

export default app;

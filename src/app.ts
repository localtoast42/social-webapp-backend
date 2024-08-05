import config from "config";
import createServer from "./utils/server";
import logger from "./utils/logger";
import prisma from "./utils/client";

const app = createServer();

const port = config.get<number>("port");

app.listen(port, async () => {
  logger.info(`App is running at http://localhost:${port}`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Successfully connected to DB");
  } catch (e) {
    logger.error("Failed to connect to DB");
    process.exit(1);
  }
});

export default app;

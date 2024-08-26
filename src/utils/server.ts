import express, { Request, Response } from "express";
import config from "config";
import morgan from "morgan";
import cors from "cors";
import compression from "compression";
import responseTime from "response-time";
import routes from "../routes";
import deserializeUser from "../middleware/deserializeUser";
import { restResponseTimeHistogram } from "./metrics";

function createServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const corsOptions = {
    credentials: true,
    origin: config.get<string>("frontendUrl"),
  };

  app.use(cors(corsOptions));
  app.use(compression());

  if (config.get<boolean>("logRequests")) {
    app.use(morgan(config.get<string>("logFormat")));
  }

  app.use(
    responseTime((req: Request, res: Response, time: number) => {
      if (req?.route?.path) {
        restResponseTimeHistogram.observe(
          {
            method: req.method,
            route: req.route.path,
            status_code: res.statusCode,
          },
          time * 1000
        );
      }
    })
  );

  app.use(deserializeUser);

  routes(app);

  return app;
}

export default createServer;

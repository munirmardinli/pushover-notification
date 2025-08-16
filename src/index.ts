import express from "express";
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import "dotenv/config";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { PushoverService } from "./pushover.js";

export class App {
 private app: express.Application;
 private readonly port: number;
 private pushoverService: PushoverService;

 constructor(port: number, dataFile: string) {
  this.app = express();
  this.port = port;

  this.pushoverService = new PushoverService({
   userKey: process.env.PUSHOVER_USER_KEY || "",
   apiToken: process.env.PUSHOVER_API_TOKEN || "",
   dataFile,
  });
  this.initializeMiddlewares();
  this.initializeRoutes();
 }

 private initializeMiddlewares(): void {
  this.app.use(cors());
  this.app.use(bodyParser.json());

  const apiLimiter: RateLimitRequestHandler = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 100,
   standardHeaders: true,
   legacyHeaders: false,
   message: "Too many requests from this IP, please try again later",
  });
  this.app.use("/notifications", apiLimiter);
  this.app.use("/health", apiLimiter);
  this.app.use((req, _res, next) => {
   console.log(`${req.method} ${req.path}`);
   next();
  });
 }

 private initializeRoutes(): void {
  this.app.post("/notifications", (req, res) =>
   this.pushoverService.handleCreateNotification(req, res),
  );
  this.app.get("/notifications/:recipient", (req, res) =>
   this.pushoverService.handleGetNotifications(req, res),
  );
  this.app.get("/notifications/single/:id", (req, res) =>
   this.pushoverService.handleGetNotification(req, res),
  );
  this.app.patch("/notifications/:id/read", (req, res) =>
   this.pushoverService.handleUpdateNotificationStatus(req, res),
  );
  this.app.delete("/notifications/:id", (req, res) =>
   this.pushoverService.handleDeleteNotification(req, res),
  );

  this.app.get("/health", (req, res) => {
   try {
    fs.accessSync(
     this.pushoverService.dataFile,
     fs.constants.R_OK | fs.constants.W_OK,
    );
    res.status(200).json({
     status: "ok",
     storage: "accessible",
    });
   } catch (err) {
    res.status(500).json({
     status: "error",
     error: "Storage inaccessible",
     details: (err as Error).message,
    });
   }
  });
 }

 public start(): void {
  this.app.listen(this.port, () => {
   console.log(`Server running on port ${this.port}`);
   console.log(
    `Pushover service ${this.pushoverService.isEnabled() ? "enabled" : "disabled"}`,
   );
  });
 }
}

// Application bootstrap
const PORT = parseInt(process.env.PORT || "9095");
const DATA_FILE = path.join(process.cwd(), "assets", "notifications.yaml");

const app = new App(PORT, DATA_FILE);
app.start();

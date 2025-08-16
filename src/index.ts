import express from "express";
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import "dotenv/config";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";

import { PushoverService } from "./pushover.js";

export class App extends PushoverService {
 private app: express.Application;
 private readonly port: number;

 constructor() {
  super({
   userKey: process.env.PUSHOVER_USER_KEY!,
   apiToken: process.env.PUSHOVER_API_TOKEN!,
   dataFile: path.join(process.cwd(), "assets", "notifications.yaml"),
  });
  this.app = express();
  this.port = parseInt(process.env.PORT || "9095");
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
   this.handleCreateNotification(req, res),
  );
  this.app.get("/notifications/:recipient", (req, res) =>
   this.handleGetNotifications(req, res),
  );
  this.app.get("/notifications/single/:id", (req, res) =>
   this.handleGetNotification(req, res),
  );
  this.app.patch("/notifications/:id/read", (req, res) =>
   this.handleUpdateNotificationStatus(req, res),
  );
  this.app.delete("/notifications/:id", (req, res) =>
   this.handleDeleteNotification(req, res),
  );

  this.app.get("/health", (req, res) => {
   try {
    fs.accessSync(this.dataFile, fs.constants.R_OK | fs.constants.W_OK);
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
   console.log(`Pushover service ${this.isEnabled() ? "enabled" : "disabled"}`);
  });
 }
}

new App().start();

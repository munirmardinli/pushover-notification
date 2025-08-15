/**
 * @file Notification Service API
 * @module NotificationService
 * @description Complete notification management system with Pushover integration, YAML storage, and REST API
 * @see {@link https://expressjs.com/|Express Framework}
 * @author Munir Mardinli {@link https://linktr.ee/munirmardinli}
 * @version 0.0.1
 * @license MIT
 * @since 0.0.1
 */
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import yaml from "yamljs";
import path from "path";
import { PushoverService } from "./services/pushover.service.js";
import { type NotificationData, type PushoverConfig } from "./types/globals.js";

/**
 * @class NotificationStore
 * @classdesc Persistent notification storage with YAML backend and Pushover integration
 * @de Benachrichtigungsspeicher
 * @de Notification Management System
 *
 * @example
 * const store = new NotificationStore('./data/notifications.yaml', {
 *   userKey: 'pushover-user-key',
 *   apiToken: 'pushover-api-token'
 * });
 */
export class NotificationStore {
 private notifications: NotificationData[];
 private readonly dataFile: string;
 private pushoverService: PushoverService;

 /**
  * @constructor
  * @param {string} dataFile - Path to YAML storage file
  * @param {PushoverConfig} [pushoverConfig] - Optional Pushover configuration
  */
 constructor(dataFile: string, pushoverConfig?: PushoverConfig) {
  this.dataFile = dataFile;
  try {
   this.ensureDataFileExists();
   this.notifications = this.loadNotifications(); // First call
  } catch (err) {
   console.error("Initialization error:", err);
   this.notifications = [];
  }
  this.notifications = this.loadNotifications(); // Second call (remove this)
  this.pushoverService = new PushoverService(
   pushoverConfig ?? { userKey: "", apiToken: "" },
  );
 }

 /**
  * @method ensureDataFileExists
  * @private
  * @description Ensures the YAML data file exists, creates it if not
  */
 private ensureDataFileExists(): void {
  try {
   const dataDir = path.dirname(this.dataFile);

   // Korrekte Syntax für existsSync Prüfung
   if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
   }

   // Überprüfen ob der Pfad ein Verzeichnis ist
   if (fs.existsSync(this.dataFile)) {
    const stats = fs.statSync(this.dataFile);
    if (stats.isDirectory()) {
     throw new Error(`Path ${this.dataFile} is a directory, expected a file`);
    }
   } else {
    fs.writeFileSync(this.dataFile, yaml.stringify([]));
   }
  } catch (err) {
   console.error("Error ensuring data file exists:", err);
   throw err;
  }
 }
 /**
  * @method loadNotifications
  * @private
  * @description Loads notifications from YAML storage file
  * @returns {NotificationData[]} Array of loaded notifications
  */
 private loadNotifications(): NotificationData[] {
  try {
   if (fs.existsSync(this.dataFile)) {
    const loadedData = yaml.load(this.dataFile);
    if (Array.isArray(loadedData)) {
     return loadedData as NotificationData[];
    }
   }
   return [];
  } catch (err) {
   console.error("Error loading notifications:", err);
   return [];
  }
 }

 /**
  * @method saveNotifications
  * @private
  * @description Persists notifications to YAML storage file
  */
 private saveNotifications(): void {
  try {
   const dataDir = path.dirname(this.dataFile);
   if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
   }
   fs.writeFileSync(this.dataFile, yaml.stringify(this.notifications, 4));
  } catch (err) {
   console.error("Error saving notifications:", err);
  }
 }

 /**
  * @method create
  * @description Creates new notification with optional Pushover delivery
  * @param {Omit<NotificationData, 'id'|'read'|'createdAt'|'pushoverSent'|'pushoverReceipt'>} notification - Notification data
  * @returns {Promise<NotificationData>} Created notification with system fields
  *
  * @example
  * await store.create({
  *   title: 'New Message',
  *   message: 'You have a new notification',
  *   recipient: 'user@example.com'
  * });
  */
 public async create(
  notification: Omit<
   NotificationData,
   "id" | "read" | "createdAt" | "pushoverSent" | "pushoverReceipt"
  >,
 ): Promise<NotificationData> {
  const newNotification: NotificationData = {
   id: Date.now().toString(),
   ...notification,
   read: false,
   createdAt: new Date().toISOString(),
   pushoverSent: false,
   pushoverReceipt: null,
  };

  if (this.pushoverService.isEnabled()) {
   try {
    const pushoverMessage = {
     title: newNotification.title,
     message: newNotification.message,
     sound: "magic",
     priority: 1,
    };

    const receipt =
     await this.pushoverService.sendNotification(pushoverMessage);
    newNotification.pushoverSent = true;
    newNotification.pushoverReceipt = receipt;
   } catch (error) {
    console.error("Pushover notification failed:", error);
   }
  }

  this.notifications.push(newNotification);
  this.saveNotifications();
  return newNotification;
 }

 /**
  * @method getAll
  * @description Retrieves all notifications for a recipient (sorted by date)
  * @param {string} recipient - Target recipient identifier
  * @returns {NotificationData[]} Filtered notifications array
  */
 public getAll(recipient: string): NotificationData[] {
  return this.notifications
   .filter((n) => n.recipient === recipient)
   .sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
   );
 }

 /**
  * @method getById
  * @description Finds notification by ID
  * @param {string} id - Notification ID
  * @returns {NotificationData|undefined} Found notification or undefined
  */
 public getById(id: string): NotificationData | undefined {
  return this.notifications.find((n) => n.id === id);
 }

 /**
  * @method markAsRead
  * @description Updates notification read status
  * @param {string} id - Notification ID
  * @returns {NotificationData|undefined} Updated notification or undefined
  */
 public markAsRead(id: string): NotificationData | undefined {
  const notification = this.notifications.find((n) => n.id === id);
  if (notification) {
   notification.read = true;
   this.saveNotifications();
  }
  return notification;
 }

 /**
  * @method delete
  * @description Removes notification by ID
  * @param {string} id - Notification ID
  * @returns {boolean} Deletion success status
  */
 public delete(id: string): boolean {
  const index = this.notifications.findIndex((n) => n.id === id);
  if (index !== -1) {
   this.notifications.splice(index, 1);
   this.saveNotifications();
   return true;
  }
  return false;
 }

 /**
  * @method clearAll
  * @description Clears all notifications from storage
  */
 public clearAll(): void {
  this.notifications = [];
  this.saveNotifications();
 }
}

/**
 * @class NotificationController
 * @classdesc Express REST API controller for notification operations
 * @de API Controller
 * @de REST Schnittstelle
 */
export class NotificationController {
 private readonly notificationStore: NotificationStore;

 constructor(notificationStore: NotificationStore) {
  this.notificationStore = notificationStore;
 }

 /**
  * @method createNotification
  * @description REST endpoint for creating notifications
  * @param {Request} req - Express request object
  * @param {Response} res - Express response object
  */
 public createNotification(req: Request, res: Response): void {
  try {
   const { title, message, recipient } = req.body;

   if (!title || !message || !recipient) {
    res
     .status(400)
     .json({ error: "Title, message and recipient are required" });
    return;
   }

   this.notificationStore
    .create({ title, message, recipient })
    .then((notification) => res.status(201).json(notification))
    .catch(() => res.status(500).json({ error: "Internal server error" }));
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 /**
  * @method getNotifications
  * @description REST endpoint for retrieving recipient's notifications
  * @param {Request} req - Express request object
  * @param {Response} res - Express response object
  */
 public getNotifications(req: Request, res: Response): void {
  try {
   const recipient = req.params["recipient"];
   if (!recipient) {
    res.status(400).json({ error: "Recipient is required" });
    return;
   }
   const notifications = this.notificationStore.getAll(recipient);
   res.json(notifications);
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 /**
  * @method getNotification
  * @description REST endpoint for single notification retrieval
  * @param {Request} req - Express request object
  * @param {Response} res - Express response object
  */
 public getNotification(req: Request, res: Response): void {
  try {
   const id = req.params["id"];
   if (!id) {
    res.status(400).json({ error: "ID is required" });
    return;
   }
   const notification = this.notificationStore.getById(id);
   if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
   }
   res.json(notification);
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 /**
  * @method updateNotificationStatus
  * @description REST endpoint for marking notifications as read
  * @param {Request} req - Express request object
  * @param {Response} res - Express response object
  */
 public updateNotificationStatus(req: Request, res: Response): void {
  try {
   const id = req.params["id"];
   if (!id) {
    res.status(400).json({ error: "ID is required" });
    return;
   }
   const notification = this.notificationStore.markAsRead(id);
   if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
   }
   res.json(notification);
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 /**
  * @method deleteNotification
  * @description REST endpoint for notification deletion
  * @param {Request} req - Express request object
  * @param {Response} res - Express response object
  */

 public deleteNotification(req: Request, res: Response): void {
  try {
   const id = req.params["id"];
   if (!id) {
    res.status(400).json({ error: "ID is required" });
    return;
   }
   const success = this.notificationStore.delete(id);
   if (!success) {
    res.status(404).json({ error: "Notification not found" });
    return;
   }
   res.status(204).send();
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }
}

/**
 * @class App
 * @classdesc Main application class configuring Express server
 * @de Hauptanwendung
 * @de Server Konfiguration
 */
export class App {
 private app: express.Application;
 private readonly port: number;
 private notificationStore: NotificationStore;
 private notificationController: NotificationController;

 /**
  * @constructor
  * @param {number} port - Server port number
  * @param {string} dataFile - Path to YAML storage file
  */
 constructor(port: number, dataFile: string) {
  this.app = express();
  this.port = port;

  const pushoverConfig = this.getPushoverConfig();
  this.notificationStore = new NotificationStore(dataFile, pushoverConfig);
  this.notificationController = new NotificationController(
   this.notificationStore,
  );

  this.initializeMiddlewares();
  this.initializeRoutes();
 }

 /**
  * @method getPushoverConfig
  * @private
  * @description Loads Pushover configuration from environment
  * @returns {PushoverConfig} Pushover credentials
  */
 private getPushoverConfig(): PushoverConfig {
  const userKey = process.env.PUSHOVER_USER_KEY || "";
  const apiToken = process.env.PUSHOVER_API_TOKEN || "";

  if (!userKey || !apiToken) {
   console.warn("Pushover credentials not fully configured");
  }

  return { userKey, apiToken };
 }

 /**
  * @method initializeMiddlewares
  * @private
  * @description Configures Express middleware stack
  */
 private initializeMiddlewares(): void {
  this.app.use(cors());
  this.app.use(bodyParser.json());

  const apiLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 100,
   standardHeaders: true,
   legacyHeaders: false,
   message: "Too many requests from this IP, please try again later",
  });
  this.app.use("/notifications", apiLimiter);
  this.app.use("/health", apiLimiter);
  this.app.use((req, res, next) => {
   console.log(`${req.method} ${req.path}`);
   next();
  });
 }

 /**
  * @method initializeRoutes
  * @private
  * @description Sets up API routes and handlers
  */
 private initializeRoutes(): void {
  this.app.post("/notifications", (req, res) =>
   this.notificationController.createNotification(req, res),
  );
  this.app.get("/notifications/:recipient", (req, res) =>
   this.notificationController.getNotifications(req, res),
  );
  this.app.get("/notifications/single/:id", (req, res) =>
   this.notificationController.getNotification(req, res),
  );
  this.app.patch("/notifications/:id/read", (req, res) =>
   this.notificationController.updateNotificationStatus(req, res),
  );
  this.app.delete("/notifications/:id", (req, res) =>
   this.notificationController.deleteNotification(req, res),
  );

  this.app.get("/health", (req, res) => {
   try {
    fs.accessSync(DATA_FILE, fs.constants.R_OK | fs.constants.W_OK);
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

 /**
  * @method start
  * @description Starts the Express server
  */
 public start(): void {
  this.app.listen(this.port, () => {
   console.log(`Server running on port ${this.port}`);
   console.log(
    `Pushover service ${this.notificationStore["pushoverService"].isEnabled() ? "enabled" : "disabled"}`,
   );
  });
 }
}

// Application bootstrap
const PORT = parseInt(process.env.PORT || "9095");
const DATA_FILE = path.join(process.cwd(), "assets", "notifications.yaml");

const app = new App(PORT, DATA_FILE);
app.start();

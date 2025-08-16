/**
 * @file PushoverService - Robust notification service for Pushover API
 * @module PushoverService
 * @description Handles mobile & desktop notifications via Pushover API with error handling and status tracking
 * @see {@link https://pushover.net/api|Pushover API Documentation}
 * @author Munir Mardinli {@link https://linktr.ee/munirmardinli}
 * @version 0.0.1
 * @license MIT
 * @since 0.0.1
 */
import fs from "node:fs";
import path from "node:path";
import {
 request as httpRequest,
 type RequestOptions,
 IncomingMessage,
} from "node:http";
import { randomBytes } from 'node:crypto';
import https, { request as httpsRequest } from "node:https";
import { parse as parseUrl } from "node:url";
import { stringify, parse as parseQuery } from "node:querystring";
import yaml from "yamljs";
import type * as PushoverTypes from "pushover-types";
import { type Request, type Response } from "express";

export class PushoverService {
 private boundary: string;
 private token: string;
 private user: string;
 private debug?: boolean;
 private onerror?: (err: Error | string, res?: IncomingMessage) => void;
 private httpOptions?: PushoverTypes.Options["httpOptions"];
 private sounds?: PushoverTypes.SoundMap;
 private enabled: boolean = false;
 private notifications: PushoverTypes.NotificationData[] = [];
 public readonly dataFile: string;
 private static readonly API_URL = "https://api.pushover.net/1/messages.json";

 /**
  * Creates a new PushoverService instance
  * @param {PushoverTypes.BaseConfig & { dataFile?: string }} config - Pushover configuration
  */
 constructor(config: PushoverTypes.BaseConfig & { dataFile?: string }) {
  this.boundary = "--" + randomBytes(16).toString('hex');
  this.token = config.apiToken;
  this.user = config.userKey;
  this.dataFile =
   config.dataFile || path.join(process.cwd(), "assets", "notifications.yaml");

  if (config.userKey && config.apiToken) {
   this.enabled = true;
   console.log("Pushover service initialized");
  } else {
   console.warn("Pushover credentials missing - service disabled");
  }

  // Default notification sounds
  this.sounds = {
   pushover: "Pushover (default)",
   bike: "Bike",
   bugle: "Bugle",
   cashregister: "Cash Register",
   classical: "Classical",
   cosmic: "Cosmic",
   falling: "Falling",
   gamelan: "Gamelan",
   incoming: "Incoming",
   intermission: "Intermission",
   magic: "Magic",
   mechanical: "Mechanical",
   pianobar: "Piano Bar",
   siren: "Siren",
   spacealarm: "Space Alarm",
   tugboat: "Tug Boat",
   alien: "Alien Alarm (long)",
   climb: "Climb (long)",
   persistent: "Persistent (long)",
   echo: "Pushover Echo (long)",
   updown: "Up Down (long)",
   none: "None (silent)",
  };

  try {
   this.ensureDataFileExists();
   this.notifications = this.loadNotifications();
  } catch (err) {
   console.error("Initialization error:", err);
   this.notifications = [];
  }
 }

 /* Core Pushover functionality */
 private setDefaults(
  payload: PushoverTypes.MessagePayload,
 ): PushoverTypes.MessagePayload {
  const obj: PushoverTypes.MessagePayload = { ...payload };

  const stringDefaults: Partial<
   Pick<
    PushoverTypes.MessagePayload,
    "device" | "title" | "url" | "url_title" | "sound"
   >
  > = {
   device: "",
   title: "",
   url: "",
   url_title: "",
   sound: "",
  };

  for (const key in stringDefaults) {
   if (obj[key as keyof typeof stringDefaults] === undefined) {
    obj[key as keyof typeof stringDefaults] =
     stringDefaults[key as keyof typeof stringDefaults]!;
   }
  }

  const numberDefaults: Partial<
   Pick<PushoverTypes.MessagePayload, "priority" | "timestamp">
  > = {
   priority: 0,
   timestamp: 0,
  };

  for (const key in numberDefaults) {
   if (obj[key as keyof typeof numberDefaults] === undefined) {
    obj[key as keyof typeof numberDefaults] =
     numberDefaults[key as keyof typeof numberDefaults]!;
   }
  }

  return obj;
 }

 private loadImage(filePath: string): PushoverTypes.ImageFile {
  return {
   name: path.basename(filePath),
   data: fs.readFileSync(filePath),
  };
 }

 private buildMultipartForm(
  reqStr: string,
  boundary: string,
  image?: PushoverTypes.ImageFile,
 ): Buffer {
  const parts: string[] = [];
  const parsed = parseQuery(reqStr);

  for (const [key, value] of Object.entries(parsed)) {
   if (value !== "") {
    parts.push(`--${boundary}`);
    parts.push(
     `Content-Disposition: form-data; name="${key}"`,
     "",
     value as string,
    );
   }
  }

  if (image) {
   parts.push(`--${boundary}`);
   parts.push(
    `Content-Disposition: form-data; name="attachment"; filename="${image.name}"`,
   );
   parts.push(
    `Content-Type: ${image.type ?? "application/octet-stream"}`,
    "",
    "",
   );
  }

  let buffer = Buffer.from(parts.join("\r\n") + "\r\n", "utf8");

  if (image) {
   buffer = Buffer.concat([
    buffer,
    Buffer.from(image.data),
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
   ]);
  } else {
   buffer = Buffer.concat([buffer, Buffer.from(`--${boundary}--\r\n`, "utf8")]);
  }

  return buffer;
 }

 private handleErrors(data: string | object, res?: IncomingMessage): void {
  let parsed: any = data;
  if (typeof data === "string") {
   try {
    parsed = JSON.parse(data);
   } catch (err) {
    this.onerror?.(err as Error, res);
    return;
   }
  }

  if (parsed?.errors) {
   const errorMsg = parsed.errors[0];
   if (this.onerror) {
    this.onerror(errorMsg, res);
   } else {
    throw new Error(errorMsg);
   }
  }
 }

 private updateSounds(): void {
  const soundUrl = `https://api.pushover.net/1/sounds.json?token=${this.token}`;
  const requestOptions = parseUrl(soundUrl);

  const req = https.request(requestOptions, (res) => {
   let data = "";
   res.on("data", (chunk) => (data += chunk));
   res.on("end", () => {
    try {
     const json = JSON.parse(data);
     this.handleErrors(json, res);
     this.sounds = json.sounds;
    } catch {
     this.handleErrors("Pushover: parsing sound data failed", res);
    }
   });
  });

  req.on("error", (err) => {
   this.onerror?.(err);
  });

  req.end();
 }

 /**
  * Retrieves available notification sounds
  * @returns {PushoverTypes.SoundMap|undefined} Mapping of sound identifiers to display names
  */
 public getSounds(): PushoverTypes.SoundMap | undefined {
  return this.sounds;
 }

 /**
  * Checks if service is enabled
  * @returns {boolean} Service status
  */
 public isEnabled(): boolean {
  return this.enabled;
 }

 /**
  * Sends a notification through Pushover API
  * @param {PushoverTypes.Message} message - Notification payload
  * @returns {Promise<string|null>} Receipt ID or null
  */
 public async sendNotification(
  message: PushoverTypes.Message,
 ): Promise<string | null> {
  if (!this.enabled) {
   console.warn("Pushover service not enabled");
   return null;
  }

  return new Promise((resolve, reject) => {
   this.send(message, (err?: Error, body?: string) => {
    if (err) {
     console.error("Pushover error:", err);
     return reject(err);
    }

    try {
     const result: PushoverTypes.Response = body ? JSON.parse(body) : {};
     console.log("Pushover notification sent:", result);
     resolve(result.receipt || null);
    } catch (parseError) {
     console.error("Failed to parse Pushover response:", parseError);
     reject(new Error("Invalid Pushover API response"));
    }
   });
  });
 }

 /**
  * Sends notification via Pushover API
  * @param {PushoverTypes.MessagePayload} payload - Notification content
  * @param {Function} [callback] - Result callback (err, body, res)
  */
 public send(
  payload: PushoverTypes.MessagePayload,
  callback?: (err?: Error, body?: string, res?: IncomingMessage) => void,
 ): void {
  const form = this.setDefaults(payload);

  const { file, ...requestData }: PushoverTypes.MessagePayload = {
   token: this.token,
   user: this.user,
   ...form,
  };

  const reqStr = stringify(requestData as Record<string, string | number>);
  const image =
   typeof form.file === "string" ? this.loadImage(form.file) : form.file;
  const body = this.buildMultipartForm(reqStr, this.boundary, image);

  const parsedUrl = parseUrl(PushoverService.API_URL);
  const options: RequestOptions = {
   ...parsedUrl,
   method: "POST",
   headers: {
    "Content-Type": `multipart/form-data; boundary=${this.boundary}`,
    "Content-Length": body.length,
   },
  };

  if (this.httpOptions) {
   for (const [key, value] of Object.entries(this.httpOptions)) {
    if (key !== "proxy") {
     (options as any)[key] = value;
    }
   }

   if (this.httpOptions.proxy) {
    const proxyUrl = parseUrl(this.httpOptions.proxy);
    options.hostname = proxyUrl.hostname ?? options.hostname;
    options.protocol = proxyUrl.protocol ?? options.protocol;
    options.headers = {
     ...(options.headers ?? {}),
     Host: parsedUrl.host ?? "",
    };
   }
  }

  const requester =
   options.protocol?.startsWith("http:") || this.httpOptions?.proxy
    ? httpRequest
    : httpsRequest;

  const req = requester(options, (res) => {
   let data = "";
   res.on("data", (chunk) => (data += chunk));
   res.on("end", () => {
    this.handleErrors(data, res);
    callback?.(undefined, data, res);
   });
  });

  req.on("error", (err) => {
   callback?.(err);
  });

  if (this.debug) {
   console.log(reqStr.replace(this.token, "XXXXX").replace(this.user, "XXXXX"));
  }

  req.write(body);
  req.end();
 }

 /* Notification Store functionality */
 private ensureDataFileExists(): void {
  try {
   const dataDir = path.dirname(this.dataFile);

   if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
   }

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

 private loadNotifications(): PushoverTypes.NotificationData[] {
  try {
   if (fs.existsSync(this.dataFile)) {
    const loadedData = yaml.load(this.dataFile);
    if (Array.isArray(loadedData)) {
     return loadedData as PushoverTypes.NotificationData[];
    }
   }
   return [];
  } catch (err) {
   console.error("Error loading notifications:", err);
   return [];
  }
 }

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
  * Creates new notification with optional Pushover delivery
  * @param {Omit<NotificationData, 'id'|'read'|'createdAt'|'pushoverSent'|'pushoverReceipt'>} notification - Notification data
  * @returns {Promise<NotificationData>} Created notification with system fields
  */
 public async createNotification(
  notification: Omit<
   PushoverTypes.NotificationData,
   "id" | "read" | "createdAt" | "pushoverSent" | "pushoverReceipt"
  >,
 ): Promise<PushoverTypes.NotificationData> {
  const newNotification: PushoverTypes.NotificationData = {
   id: Date.now().toString(),
   ...notification,
   read: false,
   createdAt: new Date().toISOString(),
   pushoverSent: false,
   pushoverReceipt: null,
  };

  if (this.isEnabled()) {
   try {
    const pushoverMessage = {
     title: newNotification.title,
     message: newNotification.message,
     sound: "magic",
     priority: 1,
    };

    const receipt = await this.sendNotification(pushoverMessage);
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
  * Retrieves all notifications for a recipient (sorted by date)
  * @param {string} recipient - Target recipient identifier
  * @returns {NotificationData[]} Filtered notifications array
  */
 public getNotifications(recipient: string): PushoverTypes.NotificationData[] {
  return this.notifications
   .filter((n) => n.recipient === recipient)
   .sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
   );
 }

 /**
  * Finds notification by ID
  * @param {string} id - Notification ID
  * @returns {NotificationData|undefined} Found notification or undefined
  */
 public getNotificationById(
  id: string,
 ): PushoverTypes.NotificationData | undefined {
  return this.notifications.find((n) => n.id === id);
 }

 /**
  * Updates notification read status
  * @param {string} id - Notification ID
  * @returns {NotificationData|undefined} Updated notification or undefined
  */
 public markNotificationAsRead(
  id: string,
 ): PushoverTypes.NotificationData | undefined {
  const notification = this.notifications.find((n) => n.id === id);
  if (notification) {
   notification.read = true;
   this.saveNotifications();
  }
  return notification;
 }

 /**
  * Removes notification by ID
  * @param {string} id - Notification ID
  * @returns {boolean} Deletion success status
  */
 public deleteNotification(id: string): boolean {
  const index = this.notifications.findIndex((n) => n.id === id);
  if (index !== -1) {
   this.notifications.splice(index, 1);
   this.saveNotifications();
   return true;
  }
  return false;
 }

 /**
  * Clears all notifications from storage
  */
 public clearAllNotifications(): void {
  this.notifications = [];
  this.saveNotifications();
 }

 /* Express Controller Methods */
 public handleCreateNotification(req: Request, res: Response): void {
  try {
   const { title, message, recipient } = req.body;

   if (!title || !message || !recipient) {
    res
     .status(400)
     .json({ error: "Title, message and recipient are required" });
    return;
   }

   this.createNotification({ title, message, recipient })
    .then((notification) => res.status(201).json(notification))
    .catch(() => res.status(500).json({ error: "Internal server error" }));
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 public handleGetNotifications(req: Request, res: Response): void {
  try {
   const recipient = req.params["recipient"];
   if (!recipient) {
    res.status(400).json({ error: "Recipient is required" });
    return;
   }
   const notifications = this.getNotifications(recipient);
   res.json(notifications);
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 public handleGetNotification(req: Request, res: Response): void {
  try {
   const id = req.params["id"];
   if (!id) {
    res.status(400).json({ error: "ID is required" });
    return;
   }
   const notification = this.getNotificationById(id);
   if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
   }
   res.json(notification);
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 public handleUpdateNotificationStatus(req: Request, res: Response): void {
  try {
   const id = req.params["id"];
   if (!id) {
    res.status(400).json({ error: "ID is required" });
    return;
   }
   const notification = this.markNotificationAsRead(id);
   if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
   }
   res.json(notification);
  } catch (err) {
   res.status(500).json({ error: "Internal server error" });
  }
 }

 public handleDeleteNotification(req: Request, res: Response): void {
  try {
   const id = req.params["id"];
   if (!id) {
    res.status(400).json({ error: "ID is required" });
    return;
   }
   const success = this.deleteNotification(id);
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

import fs from "node:fs";
import path from "node:path";
import {
  createServer,
  request as httpRequest,
  type RequestOptions,
  IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { stringify, parse as parseQuery } from "node:querystring";

import type { Pushover as PT } from "./types.js";

export type { Pushover } from "./types.js";

export class App {
  protected static readonly CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  } as const;

  private static readonly RATE_WINDOW_MS = 15 * 60 * 1000;
  private static readonly RATE_MAX = 100;
  private static readonly rateBuckets = new Map<
    string,
    { reset: number; count: number }
  >();

  static {
    App.loadDotenvFile();
  }

  private readonly port: number;
  private boundary: string;
  private token: string;
  private user: string;
  private debug?: boolean;
  private onerror?: (err: Error | string, res?: IncomingMessage) => void;
  private httpOptions?: PT.HttpOptions;
  private sounds?: PT.SoundMap;
  private enabled: boolean = false;
  private notifications: PT.NotificationData[] = [];
  public readonly dataFile: string;
  private static readonly API_URL = "https://api.pushover.net/1/messages.json";

  constructor() {
    this.boundary = randomBytes(16).toString("hex");
    this.token = process.env.PUSHOVER_API_TOKEN!;
    this.user = process.env.PUSHOVER_USER_KEY!;
    this.dataFile =
      process.env.ASSETS_DIR || path.join(process.cwd(), "assets", "notifications.json");
    this.port = parseInt(process.env.PORT!, 10);

    if (process.env.PUSHOVER_USER_KEY && process.env.PUSHOVER_API_TOKEN) {
      this.enabled = true;
      console.log("Pushover service initialized");
    } else {
      console.warn("Pushover credentials missing - service disabled");
    }

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

  private static loadDotenvFile(
    dotenvPath = path.join(process.cwd(), ".env"),
  ): void {
    try {
      const raw = fs.readFileSync(dotenvPath, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        if (!key) continue;
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    } catch {
    }
  }

  private yamlParseScalar(v: string): unknown {
    const s = v.trim();
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "null" || s === "~") return null;
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      return s.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) {
      return Number(s);
    }
    return s;
  }

  private yamlTakeKeyValue(
    current: Record<string, unknown> | null,
    segment: string,
  ): void {
    const colon = segment.indexOf(":");
    if (colon === -1 || !current) return;
    const key = segment.slice(0, colon).trim();
    if (!key) return;
    const rest = segment.slice(colon + 1).trim();
    current[key] = this.yamlParseScalar(rest);
  }

  private setDefaults(
    payload: PT.MessagePayload,
  ): PT.MessagePayload {
    const obj: PT.MessagePayload = { ...payload };

    const stringDefaults: Partial<
      Pick<
        PT.MessagePayload,
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
      Pick<PT.MessagePayload, "priority" | "timestamp">
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

  private loadImage(filePath: string): PT.ImageFile {
    return {
      name: path.basename(filePath),
      data: fs.readFileSync(filePath),
    };
  }

  private buildMultipartForm(
    reqStr: string,
    boundary: string,
    image?: PT.ImageFile,
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

  /**
   * Retrieves available notification sounds
   * @returns {PT.SoundMap|undefined} Mapping of sound identifiers to display names
   */
  public getSounds(): PT.SoundMap | undefined {
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
   * @param message Pushover-Nachricht
   * @returns {Promise<string|null>} Receipt ID or null
   */
  public async sendNotification(
    message: PT.PushoverMessage,
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
          const result: PT.PushoverApiResponse = body ? JSON.parse(body) : {};
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
   * @param {PT.MessagePayload} payload - Notification content
   * @param {Function} [callback] - Result callback (err, body, res)
   */
  public send(
    payload: PT.MessagePayload,
    callback?: (err?: Error, body?: string, res?: IncomingMessage) => void,
  ): void {
    const form = this.setDefaults(payload);

    const { file, ...requestData }: PT.MessagePayload = {
      token: this.token,
      user: this.user,
      ...form,
    };

    const reqStr = stringify(requestData as Record<string, string | number>);
    const image =
      typeof form.file === "string" ? this.loadImage(form.file) : form.file;
    const body = this.buildMultipartForm(reqStr, this.boundary, image);

    const apiUrl = new URL(App.API_URL);
    const options: RequestOptions = {
      protocol: apiUrl.protocol,
      hostname: apiUrl.hostname,
      port: apiUrl.port || undefined,
      path: `${apiUrl.pathname}${apiUrl.search}`,
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
        const proxyUrl = new URL(this.httpOptions.proxy);
        options.hostname = proxyUrl.hostname;
        options.port = proxyUrl.port || undefined;
        options.protocol = proxyUrl.protocol;
        options.headers = {
          ...(options.headers ?? {}),
          Host: apiUrl.host,
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

  private sendJson(res: ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      ...App.CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(payload, "utf8"),
    });
    res.end(payload);
  }

  private sendNoContent(res: ServerResponse): void {
    res.writeHead(204, { ...App.CORS_HEADERS });
    res.end();
  }

  private sendCorsOnly(res: ServerResponse, status: number): void {
    res.writeHead(status, { ...App.CORS_HEADERS });
    res.end();
  }

  private tryParseNotificationsJson(
    raw: string,
  ): PT.NotificationData[] | null {
    try {
      const loadedData: unknown = JSON.parse(raw);
      if (Array.isArray(loadedData)) {
        return loadedData as PT.NotificationData[];
      }
      return [];
    } catch {
      return null;
    }
  }

  /**
   * Parses legacy YAML notifications
   * @param {string} raw - Raw YAML string
   * @returns {PT.NotificationData[]|null} Parsed notifications or null
   */
  private parseLegacyYamlNotifications(
    raw: string,
  ): PT.NotificationData[] | null {
    let text = raw.replace(/^\uFEFF/, "");
    if (text.trimStart().startsWith("---")) {
      text = text.replace(/^\s*---\s*(?:\r?\n|\s*$)/, "");
    }
    const trimmed = text.trim();
    if (!trimmed.startsWith("-")) {
      return null;
    }

    type MutableRow = Record<string, unknown>;
    const items: MutableRow[] = [];
    let current: MutableRow | null = null;
    let listItemIndent: number | null = null;
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const noTrail = line.replace(/\s+$/u, "");
      if (!noTrail.trim()) continue;

      const dash = /^(\s*)-\s*(.*)$/.exec(noTrail);
      if (dash) {
        const lead = dash[1]!.length;
        const after = dash[2]!.trim();
        if (listItemIndent === null) {
          listItemIndent = lead;
        }
        if (current) {
          items.push(current);
        }
        current = {};
        if (after.includes(":")) {
          this.yamlTakeKeyValue(current, after);
        }
        continue;
      }

      if (!current || listItemIndent === null) continue;
      const indent = /^(\s*)(.+)$/.exec(noTrail);
      if (!indent) continue;
      const nSpace = indent[1]!.length;
      const rest = indent[2]!;
      if (nSpace <= listItemIndent) continue;
      if (rest.includes(":")) {
        this.yamlTakeKeyValue(current, rest);
      }
    }

    if (current) {
      items.push(current);
    }

    return items.length > 0
      ? (items as unknown as PT.NotificationData[])
      : [];
  }

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
        fs.writeFileSync(this.dataFile, JSON.stringify([], null, 4));
      }
    } catch (err) {
      console.error("Error ensuring data file exists:", err);
      throw err;
    }
  }

  private loadNotifications(): PT.NotificationData[] {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return [];
      }
      const raw = fs.readFileSync(this.dataFile, "utf8");
      const trimmed = raw.trim();
      if (!trimmed) {
        return [];
      }

      const fromJson = this.tryParseNotificationsJson(trimmed);
      if (fromJson !== null) {
        return fromJson;
      }

      const fromYaml = this.parseLegacyYamlNotifications(raw);
      if (fromYaml !== null) {
        console.warn(
          "Alte YAML-Benachrichtigungsdatei erkannt; migriere einmalig nach JSON.",
        );
        fs.writeFileSync(
          this.dataFile,
          JSON.stringify(fromYaml as unknown[], null, 4),
        );
        return fromYaml;
      }

      console.error(
        "Benachrichtigungsdatei weder gültiges JSON noch erkanntes YAML-Listenformat.",
      );
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
      fs.writeFileSync(
        this.dataFile,
        JSON.stringify(this.notifications as unknown[], null, 4),
      );
    } catch (err) {
      console.error("Error saving notifications:", err);
    }
  }

  /**
   * Creates new notification with optional Pushover delivery
   * @param {Omit<PT.NotificationData, 'id'|'read'|'createdAt'|'pushoverSent'|'pushoverReceipt'>} notification - Notification data
   * @returns {Promise<PT.NotificationData>} Created notification with system fields
   */
  public async createNotification(
    notification: Omit<
      PT.NotificationData,
      "id" | "read" | "createdAt" | "pushoverSent" | "pushoverReceipt"
    >,
  ): Promise<PT.NotificationData> {
    const newNotification: PT.NotificationData = {
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
   * @returns {PT.NotificationData[]} Filtered notifications array
   */
  public getNotifications(recipient: string): PT.NotificationData[] {
    return this.notifications
      .filter((n) => n.recipient === recipient)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Finds notification by ID
   * @param {string} id - Notification ID
   * @returns {PT.NotificationData|undefined} Found notification or undefined
   */
  public getNotificationById(
    id: string,
  ): PT.NotificationData | undefined {
    return this.notifications.find((n) => n.id === id);
  }

  /**
   * Updates notification read status
   * @param {string} id - Notification ID
   * @returns {PT.NotificationData|undefined} Updated notification or undefined
   */
  public markNotificationAsRead(
    id: string,
  ): PT.NotificationData | undefined {
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

  public handleHealth(res: ServerResponse): void {
    try {
      fs.accessSync(this.dataFile, fs.constants.R_OK | fs.constants.W_OK);
      this.sendJson(res, 200, {
        status: "ok",
        storage: "accessible",
      });
    } catch (err) {
      this.sendJson(res, 500, {
        status: "error",
        error: "Storage inaccessible",
        details: (err as Error).message,
      });
    }
  }

  public handleCreateNotification(req: PT.HttpApiRequest, res: ServerResponse): void {
    try {
      const { title, message, recipient } = req.body;

      if (
        typeof title !== "string" ||
        typeof message !== "string" ||
        typeof recipient !== "string" ||
        !title ||
        !message ||
        !recipient
      ) {
        this.sendJson(res, 400, {
          error: "Title, message and recipient are required",
        });
        return;
      }

      this.createNotification({ title, message, recipient })
        .then((notification) => this.sendJson(res, 201, notification))
        .catch(() => this.sendJson(res, 500, { error: "Internal server error" }));
    } catch {
      this.sendJson(res, 500, { error: "Internal server error" });
    }
  }

  public handleGetNotifications(req: PT.HttpApiRequest, res: ServerResponse): void {
    try {
      const recipient = req.params["recipient"];
      if (!recipient) {
        this.sendJson(res, 400, { error: "Recipient is required" });
        return;
      }
      const notifications = this.getNotifications(recipient);
      this.sendJson(res, 200, notifications);
    } catch {
      this.sendJson(res, 500, { error: "Internal server error" });
    }
  }

  public handleGetNotification(req: PT.HttpApiRequest, res: ServerResponse): void {
    try {
      const id = req.params["id"];
      if (!id) {
        this.sendJson(res, 400, { error: "ID is required" });
        return;
      }
      const notification = this.getNotificationById(id);
      if (!notification) {
        this.sendJson(res, 404, { error: "Notification not found" });
        return;
      }
      this.sendJson(res, 200, notification);
    } catch {
      this.sendJson(res, 500, { error: "Internal server error" });
    }
  }

  public handleUpdateNotificationStatus(
    req: PT.HttpApiRequest,
    res: ServerResponse,
  ): void {
    try {
      const id = req.params["id"];
      if (!id) {
        this.sendJson(res, 400, { error: "ID is required" });
        return;
      }
      const notification = this.markNotificationAsRead(id);
      if (!notification) {
        this.sendJson(res, 404, { error: "Notification not found" });
        return;
      }
      this.sendJson(res, 200, notification);
    } catch {
      this.sendJson(res, 500, { error: "Internal server error" });
    }
  }

  public handleDeleteNotification(req: PT.HttpApiRequest, res: ServerResponse): void {
    try {
      const id = req.params["id"];
      if (!id) {
        this.sendJson(res, 400, { error: "ID is required" });
        return;
      }
      const success = this.deleteNotification(id);
      if (!success) {
        this.sendJson(res, 404, { error: "Notification not found" });
        return;
      }
      this.sendNoContent(res);
    } catch {
      this.sendJson(res, 500, { error: "Internal server error" });
    }
  }

  private getClientIp(req: IncomingMessage): string {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string") {
      return xff.split(",")[0]?.trim() ?? "unknown";
    }
    if (Array.isArray(xff)) {
      return xff[0]?.split(",")[0]?.trim() ?? "unknown";
    }
    return req.socket.remoteAddress ?? "unknown";
  }

  private isRateLimited(ip: string): boolean {
    const now = Date.now();
    let b = App.rateBuckets.get(ip);
    if (!b || now >= b.reset) {
      b = { reset: now + App.RATE_WINDOW_MS, count: 1 };
      App.rateBuckets.set(ip, b);
      return false;
    }
    b.count += 1;
    return b.count > App.RATE_MAX;
  }

  private pathNeedsRateLimit(pathname: string): boolean {
    if (pathname === "/health") return true;
    return pathname === "/notifications" || pathname.startsWith("/notifications/");
  }

  private sendRateLimit(res: ServerResponse): void {
    this.sendJson(res, 429, {
      message: "Too many requests from this IP, please try again later",
    });
  }

  private sendNotFound(res: ServerResponse): void {
    this.sendJson(res, 404, { error: "Not found" });
  }

  private async readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new SyntaxError("Body must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  }

  private async handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const requestUrl = new URL(req.url ?? "/", "http://localhost");
      const pathname = requestUrl.pathname;
      const method = req.method ?? "GET";

      if (method === "OPTIONS") {
        this.sendCorsOnly(res, 204);
        return;
      }

      console.log(`${method} ${pathname}`);

      if (this.pathNeedsRateLimit(pathname) && this.isRateLimited(this.getClientIp(req))) {
        this.sendRateLimit(res);
        return;
      }

      const segments = pathname.split("/").filter(Boolean);

      if (method === "GET" && segments.length === 1 && segments[0] === "health") {
        this.handleHealth(res);
        return;
      }

      let body: Record<string, unknown> = {};
      if (method === "POST" || method === "PATCH" || method === "PUT") {
        try {
          body = await this.readJsonBody(req);
        } catch {
          const errBody = JSON.stringify({ error: "Invalid JSON body" });
          res.writeHead(400, {
            ...App.CORS_HEADERS,
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(errBody, "utf8"),
          });
          res.end(errBody);
          return;
        }
      }

      if (method === "POST" && segments.length === 1 && segments[0] === "notifications") {
        this.handleCreateNotification({ body, params: {} }, res);
        return;
      }

      if (
        method === "GET" &&
        segments.length === 3 &&
        segments[0] === "notifications" &&
        segments[1] === "single"
      ) {
        this.handleGetNotification({ body, params: { id: segments[2] } }, res);
        return;
      }

      if (
        method === "PATCH" &&
        segments.length === 3 &&
        segments[0] === "notifications" &&
        segments[2] === "read"
      ) {
        this.handleUpdateNotificationStatus(
          { body, params: { id: segments[1] } },
          res,
        );
        return;
      }

      if (method === "DELETE" && segments.length === 2 && segments[0] === "notifications") {
        this.handleDeleteNotification({ body, params: { id: segments[1] } }, res);
        return;
      }

      if (method === "GET" && segments.length === 2 && segments[0] === "notifications") {
        this.handleGetNotifications(
          { body, params: { recipient: segments[1] } },
          res,
        );
        return;
      }

      this.sendNotFound(res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        this.sendJson(res, 500, { error: "Internal server error" });
      }
    }
  }

  public start(): void {
    const server = createServer((req, res) => {
      void this.handleHttp(req, res);
    });
    server.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
      console.log(`Pushover service ${this.isEnabled() ? "enabled" : "disabled"}`);
    });
  }
}

new App().start();

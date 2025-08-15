/**
 * @file Pushover API Client
 * @module Pushover
 * @description Official Node.js client for Pushover API with file attachments, sound management, and error handling
 * @see {@link https://pushover.net/api|Pushover API Documentation}
 * @author Munir Mardinli {@link https://linktr.ee/munirmardinli}
 * @version 0.0.1
 * @license MIT
 * @since 0.0.1
 */
import fs from "fs";
import path from "path";
import https from "https";
import { IncomingMessage } from "http";
import { request as httpRequest, type RequestOptions } from "http";
import { request as httpsRequest } from "https";
import { parse as parseUrl } from "url";
import { stringify, parse as parseQuery } from "querystring";
import {
 type PushoverOptions,
 type MessagePayload,
 type ImageFile,
 type SoundMap,
} from "../types/globals.js";

/**
 * @class Pushover
 * @classdesc Node.js implementation of Pushover API with advanced features
 * @de Pushover Benachrichtigungsdienst
 * @de Mobile Alert System
 *
 * @example
 * const pushover = new Pushover({
 *   token: 'your_api_token',
 *   user: 'your_user_key',
 *   debug: true
 * });
 *
 * pushover.send({
 *   message: 'Server backup completed',
 *   title: 'Backup Status',
 *   sound: 'cashregister'
 * }, (err, result) => {
 *   if (err) console.error(err);
 *   else console.log('Notification sent:', result);
 * });
 */
export class Pushover {
 private boundary: string;
 private token: string;
 private user: string;
 private debug?: boolean;
 private onerror?: (err: Error | string, res?: IncomingMessage) => void;
 private httpOptions?: PushoverOptions["httpOptions"];
 private sounds?: SoundMap;
 /** @constant {string} API_URL - Pushover API endpoint */
 private static readonly API_URL = "https://api.pushover.net/1/messages.json";

 /**
  * @constructor
  * @param {PushoverOptions} opts - Client configuration
  * @param {string} opts.token - Application API token (required)
  * @param {string} opts.user - User/group key (required)
  * @param {boolean} [opts.debug=false] - Enable debug logging
  * @param {Function} [opts.onerror] - Custom error handler
  * @param {Object} [opts.httpOptions] - HTTP request options
  * @param {string} [opts.httpOptions.proxy] - Proxy server URL
  * @param {boolean} [opts.update_sounds=false] - Auto-update sound list
  *
  * @example
  * // Basic initialization
  * new Pushover({ token: 'app123', user: 'user456' });
  *
  * @example
  * // Advanced configuration
  * new Pushover({
  *   token: 'app123',
  *   user: 'user456',
  *   debug: true,
  *   httpOptions: { timeout: 5000 },
  *   update_sounds: true
  * });
  */
 constructor(opts: PushoverOptions) {
  this.boundary = "--" + Math.random().toString(36).substring(2);
  this.token = opts.apiToken;
  this.user = opts.userKey;
  this.debug = opts.debug;
  this.onerror = opts.onerror;
  this.httpOptions = opts.httpOptions;
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

  if (opts.update_sounds) {
   this.updateSounds();
   setInterval(() => this.updateSounds(), 86400000); // Daily updates
  }
 }

 /**
  * @method setDefaults
  * @private
  * @description Applies default values to message payload
  * @param {MessagePayload} payload - Original message payload
  * @returns {MessagePayload} Normalized payload with defaults
  */
 private setDefaults(payload: MessagePayload): MessagePayload {
  const obj: MessagePayload = { ...payload };

  const stringDefaults: Partial<
   Pick<MessagePayload, "device" | "title" | "url" | "url_title" | "sound">
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
   Pick<MessagePayload, "priority" | "timestamp">
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

 /**
  * @method loadImage
  * @private
  * @description Loads image file from disk for attachment
  * @param {string} filePath - Path to image file
  * @returns {ImageFile} Prepared image attachment
  * @throws {Error} When file cannot be read
  */
 private loadImage(filePath: string): ImageFile {
  return {
   name: path.basename(filePath),
   data: fs.readFileSync(filePath),
  };
 }
 /**
  * @method buildMultipartForm
  * @private
  * @description Constructs multipart form data for API request
  * @param {string} reqStr - URL-encoded request parameters
  * @param {string} boundary - Multipart boundary string
  * @param {ImageFile} [image] - Optional image attachment
  * @returns {Buffer} Prepared form data buffer
  */
 private buildMultipartForm(
  reqStr: string,
  boundary: string,
  image?: ImageFile,
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

 /**
  * @method handleErrors
  * @private
  * @description Processes API error responses
  * @param {string|object} data - Error response data
  * @param {IncomingMessage} [res] - HTTP response object
  */
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
  * @method updateSounds
  * @private
  * @description Fetches latest sound list from Pushover API
  */
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
  * @method getSounds
  * @description Retrieves available notification sounds
  * @returns {SoundMap|undefined} Mapping of sound identifiers to display names
  *
  * @example
  * const sounds = pushover.getSounds();
  * console.log('Available sounds:', sounds);
  */
 public getSounds(): SoundMap | undefined {
  return this.sounds;
 }

 /**
  * @method send
  * @description Sends notification via Pushover API
  * @param {MessagePayload} payload - Notification content
  * @param {Function} [callback] - Result callback (err, body, res)
  *
  * @example
  * // Basic notification
  * pushover.send({
  *   message: 'New order received',
  *   title: 'Order Alert'
  * });
  *
  * @example
  * // Priority notification with callback
  * pushover.send({
  *   message: 'SERVER DOWN!',
  *   title: 'CRITICAL',
  *   priority: 2,
  *   sound: 'siren'
  * }, (err, result) => {
  *   if (err) console.error(err);
  *   else console.log('Sent:', result);
  * });
  *
  * @example
  * // With image attachment
  * pushover.send({
  *   message: 'Security alert triggered',
  *   file: '/path/to/screenshot.jpg'
  * });
  */
 public send(
  payload: MessagePayload,
  callback?: (err?: Error, body?: string, res?: IncomingMessage) => void,
 ): void {
  const form = this.setDefaults(payload);

  const { file, ...requestData }: MessagePayload = {
   token: this.token,
   user: this.user,
   ...form,
  };

  const reqStr = stringify(requestData as Record<string, string | number>);
  const image =
   typeof form.file === "string" ? this.loadImage(form.file) : form.file;
  const body = this.buildMultipartForm(reqStr, this.boundary, image);

  const parsedUrl = parseUrl(Pushover.API_URL);
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
}

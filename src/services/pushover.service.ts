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
import { Pushover } from "./pushover.js";
import {
 type PushoverConfig,
 type PushoverMessage,
 type PushoverOptions,
 type PushoverResponse,
} from "../types/globals.js";

/**
 * @class PushoverService
 * @classdesc Service layer for Pushover notifications with configurable enable/disable state
 * @de DevOps Notification Tool
 * @de Alert Management System
 *
 * @example
 * const pushover = new PushoverService({
 *   userKey: 'YOUR_USER_KEY',
 *   apiToken: 'YOUR_API_TOKEN'
 * });
 *
 * await pushover.sendNotification({
 *   message: 'Server downtime alert!',
 *   title: 'Critical Alert'
 * });
 */
export class PushoverService {
 private readonly pushover: Pushover | null = null;
 private enabled: boolean = false;
 /**
  * @constructor
  * @param {PushoverConfig} config - Configuration object for Pushover API
  * @param {string} [config.userKey] - Pushover user key (required for enabling service)
  * @param {string} [config.apiToken] - Pushover API token (required for enabling service)
  *
  * @example
  * // Creates enabled service
  * new PushoverService({ userKey: 'user123', apiToken: 'token456' });
  *
  * @example
  * // Creates disabled service (missing credentials)
  * new PushoverService({});
  */
 constructor(config: PushoverConfig) {
  if (config.userKey && config.apiToken) {
   const options: PushoverOptions = {
    apiToken: config.apiToken,
    userKey: config.userKey,
   };
   this.pushover = new Pushover(options);
   this.enabled = true;
   console.log("Pushover service initialized");
  } else {
   this.pushover = null;
   this.enabled = false;
   console.warn("Pushover credentials missing - service disabled");
  }
 }

 /**
  * @method sendNotification
  * @description Sends notification through Pushover API
  * @async
  * @param {PushoverMessage} message - Notification payload
  * @param {string} message.message - The message body (required)
  * @param {string} [message.title] - The message title
  * @param {string} [message.url] - Supplementary URL
  * @param {string} [message.url_title] - URL title
  * @param {number} [message.priority] - Priority level (-2 to 2)
  * @param {string} [message.sound] - Notification sound
  * @returns {Promise<string|null>} Receipt ID for high-priority messages or null
  * @throws {Error} When API request fails
  *
  * @example
  * await pushover.sendNotification({
  *   message: 'Database backup completed',
  *   title: 'Backup Status',
  *   priority: 1
  * });
  */
 public async sendNotification(
  message: PushoverMessage,
 ): Promise<string | null> {
  if (!this.enabled) {
   console.warn("Pushover service not enabled");
   return null;
  }

  return new Promise((resolve, reject) => {
   this.pushover!.send(message, (err?: Error, body?: string) => {
    if (err) {
     console.error("Pushover error:", err);
     reject(err);
     return;
    }

    try {
     const result: PushoverResponse = body ? JSON.parse(body) : {};
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
  * @method isEnabled
  * @description Checks if service is properly configured and enabled
  * @returns {boolean} Service activation status
  *
  * @example
  * if (pushover.isEnabled()) {
  *   // Send notifications
  * }
  */
 public isEnabled(): boolean {
  return this.enabled;
 }
}

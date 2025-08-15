/**
 * @file Pushover Type Definitions
 * @module PushoverTypes
 * @description Core interfaces and types for Pushover API integration
 * @see {@link https://pushover.net/api|Pushover API Documentation}
 * @author Munir Mardinli {@link https://linktr.ee/munirmardinli}
 * @version 0.0.2
 * @license MIT
 * @since 0.0.1
 */
import { IncomingMessage, type RequestOptions } from "http";

/**
 * @interface PushoverBaseConfig
 * @description Base configuration required for Pushover operations
 */
interface PushoverBaseConfig {
 userKey: string;
 apiToken: string;
}

/**
 * @interface PushoverConfig
 * @extends PushoverBaseConfig
 * @description Configuration required to initialize Pushover service
 */
export interface PushoverConfig extends PushoverBaseConfig {}

/**
 * @interface PushoverMessageBase
 * @description Core notification message structure
 */
interface PushoverMessageBase {
 message: string;
 title: string;
}

/**
 * @interface PushoverMessage
 * @extends PushoverMessageBase
 * @description Extended notification message with optional fields
 */
export interface PushoverMessage extends PushoverMessageBase {
 sound?: string;
 priority?: number;
 timestamp?: number;
}

/**
 * @interface NotificationDataBase
 * @description Base notification tracking structure
 */
interface NotificationDataBase {
 id: string;
 title: string;
 message: string;
}

/**
 * @interface NotificationData
 * @extends NotificationDataBase
 * @description Extended notification tracking structure
 */
export interface NotificationData extends NotificationDataBase {
 recipient: string;
 read: boolean;
 createdAt: string;
 pushoverSent?: boolean;
 pushoverReceipt?: string | null;
}

/**
 * @interface PushoverOptions
 * @extends PushoverBaseConfig
 * @description Advanced Pushover client configuration
 */
export interface PushoverOptions extends PushoverBaseConfig {
 debug?: boolean;
 onerror?: (err: Error | string, res?: IncomingMessage) => void;
 httpOptions?: Partial<RequestOptions> & {
  proxy?: string;
 };
 update_sounds?: boolean;
}

/**
 * @interface MessagePayload
 * @extends PushoverMessageBase
 * @description Complete Pushover API message payload
 */
export interface MessagePayload extends PushoverMessageBase {
 token?: string;
 user?: string;
 device?: string;
 url?: string;
 url_title?: string;
 priority?: number;
 timestamp?: number;
 sound?: string;
 file?: string | ImageFile;
}

/**
 * @interface ImageFile
 * @description Image attachment specification
 */
export interface ImageFile {
 name: string;
 data: Buffer;
 type?: string;
}

/**
 * @interface SoundMap
 * @description Mapping of available Pushover notification sounds
 */
export interface SoundMap {
 [key: string]: string;
}

export interface PushoverResponse {
 status?: number;
 request?: string;
 receipt?: string;
 errors?: string[];
 [key: string]: unknown;
}

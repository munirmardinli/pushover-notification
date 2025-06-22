/**
 * @file Pushover Type Definitions
 * @module PushoverTypes
 * @description Core interfaces and types for Pushover API integration
 * @see {@link https://pushover.net/api|Pushover API Documentation}
 * @author Munir Mardinli {@link https://linktr.ee/munirmardinli}
 * @version 0.0.1
 * @license MIT
 * @since 0.0.1
 */
import { IncomingMessage,type RequestOptions } from 'http'

/**
 * @interface PushoverConfig
 * @description Configuration required to initialize Pushover service
 * @de Pushover Einrichtung
 * @de Benachrichtigungskonfiguration
 *
 * @property {string} userKey - Pushover user/group key (32 characters)
 * @property {string} apiToken - Application API token (30 characters)
 *
 * @example
 * const config: PushoverConfig = {
 *   userKey: 'user12345678901234567890123456789',
 *   apiToken: 'app1234567890123456789012345678'
 * };
 */
export interface PushoverConfig {
	userKey: string;
	apiToken: string;
}

/**
 * @interface PushoverMessage
 * @description Core notification message structure
 * @de Pushover Nachricht
 * @de Benachrichtigungsinhalt
 *
 * @property {string} message - The message body (required, 1024 chars max)
 * @property {string} title - Message title (250 chars max)
 * @property {string} [sound] - Notification sound (see Pushover sound list)
 * @property {number} [priority] - Priority (-2 to 2, default 0)
 * @property {number} [timestamp] - UNIX timestamp for message dating
 *
 * @example
 * const alert: PushoverMessage = {
 *   message: 'Server CPU at 95% load',
 *   title: 'High Resource Alert',
 *   priority: 1,
 *   sound: 'siren'
 * };
 */
export interface PushoverMessage {
	message: string;
	title: string;
	sound?: string;
	priority?: number;
	timestamp?: number;
}

/**
 * @interface NotificationData
 * @description Extended notification tracking structure
 * @de Benachrichtigungsverfolgung
 * @de Pushover Status
 *
 * @property {string} id - Unique notification ID
 * @property {string} title - Notification title
 * @property {string} message - Notification content
 * @property {string} recipient - Target user/group
 * @property {boolean} read - Read status flag
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {boolean} [pushoverSent] - Pushover delivery confirmation
 * @property {string|null} [pushoverReceipt] - Pushover receipt ID for priority messages
 *
 * @example
 * const notification: NotificationData = {
 *   id: 'notif_12345',
 *   title: 'Backup Complete',
 *   message: 'Nightly backup succeeded',
 *   recipient: 'team-alerts',
 *   read: false,
 *   createdAt: '2023-07-20T03:45:00Z',
 *   pushoverSent: true,
 *   pushoverReceipt: 'r1234567890'
 * };
 */
export interface NotificationData {
	id: string;
	title: string;
	message: string;
	recipient: string;
	read: boolean;
	createdAt: string;
	pushoverSent?: boolean;
	pushoverReceipt?: string | null;
}

/**
 * @interface PushoverOptions
 * @description Advanced Pushover client configuration
 * @de Erweiterte Pushover Einstellungen
 * @de API Client Konfiguration
 *
 * @property {string} token - Application API token
 * @property {string} user - User/group key
 * @property {boolean} [debug] - Enable debug logging
 * @property {(err: Error | string, res?: IncomingMessage) => void} [onerror] - Custom error handler
 * @property {Partial<RequestOptions> & { proxy?: string }} [httpOptions] - HTTP request options
 * @property {boolean} [update_sounds] - Fetch latest sound list on init
 *
 * @example
 * const options: PushoverOptions = {
 *   token: 'app1234567890',
 *   user: 'user1234567890',
 *   debug: true,
 *   httpOptions: {
 *     timeout: 5000,
 *     proxy: 'http://corp-proxy:8080'
 *   }
 * };
 */
export interface PushoverOptions {
  token: string
  user: string
  debug?: boolean
  onerror?: (err: Error | string, res?: IncomingMessage) => void
  httpOptions?: Partial<RequestOptions> & {
    proxy?: string
  }
  update_sounds?: boolean
}

/**
 * @interface MessagePayload
 * @description Complete Pushover API message payload
 * @de Pushover Nachrichtenpayload
 * @de API Request Struktur
 *
 * @property {string} [token] - Application token (optional if set in options)
 * @property {string} [user] - User key (optional if set in options)
 * @property {string} message - Message content (required)
 * @property {string} [device] - Target device name
 * @property {string} [title] - Message title
 * @property {string} [url] - Supplementary URL
 * @property {string} [url_title] - URL link text
 * @property {number} [priority] - Message priority (-2 to 2)
 * @property {number} [timestamp] - UNIX timestamp override
 * @property {string} [sound] - Notification sound
 * @property {string|ImageFile} [file] - Image attachment
 *
 * @example
 * const payload: MessagePayload = {
 *   message: 'Security alert triggered',
 *   title: 'Intrusion Detection',
 *   priority: 2,
 *   url: 'https://dashboard.example.com/alerts',
 *   url_title: 'View in Dashboard',
 *   sound: 'alien'
 * };
 */
export interface MessagePayload {
  token?: string
  user?: string
  message: string
  device?: string
  title?: string
  url?: string
  url_title?: string
  priority?: number
  timestamp?: number
  sound?: string
  file?: string | ImageFile
}

/**
 * @interface ImageFile
 * @description Image attachment specification
 * @de Bildanhangsdaten
 * @de Pushover Bilddatei
 *
 * @property {string} name - Original filename
 * @property {Buffer} data - Binary image data
 * @property {string} [type] - MIME type (e.g., 'image/jpeg')
 *
 * @example
 * const image: ImageFile = {
 *   name: 'alert-screenshot.jpg',
 *   data: fs.readFileSync('alert.jpg'),
 *   type: 'image/jpeg'
 * };
 */
export interface ImageFile {
  name: string
  data: Buffer
  type?: string
}

/**
 * @interface SoundMap
 * @description Mapping of available Pushover notification sounds
 * @de Pushover Klangbibliothek
 * @de Benachrichtigungstöne
 *
 * @property {string} [key] - Sound identifier mapped to display name
 *
 * @example
 * const sounds: SoundMap = {
 *   'alien': 'Alien Alarm',
 *   'climb': 'Climbing',
 *   'pushover': 'Pushover Default'
 * };
 */
export interface SoundMap {
  [key: string]: string
}


export interface PushoverResponse {
  status?: number;
  request?: string;
  receipt?: string;
  errors?: string[];
  [key: string]: unknown;
}

import type { RequestOptions } from "node:http";

/** Alle öffentlichen Datentypen des Pakets unter einem Namensraum. */
declare namespace Pushover {
	/** 
		* @interface
		* Payload for Pushover message.
		* @property {string} message - The message to send.
		* @property {string} title - The title of the message.
		* @property {string} sound - The sound to play.
		* @property {number} priority - The priority of the message.
		* @property {number} timestamp - The timestamp of the message.
	*/
	export interface PushoverMessage {
		message: string;
		title: string;
		sound?: string;
		priority?: number;
		timestamp?: number;
	}

	/** 
		* Stored notification (REST + persistence). 
		* @interface
		* @property {string} id - The id of the notification.
		* @property {string} title - The title of the notification.
		* @property {string} message - The message of the notification.
		* @property {string} recipient - The recipient of the notification.
		* @property {boolean} read - Whether the notification has been read.
		* @property {string} createdAt - The timestamp of the notification.
		* @property {boolean} pushoverSent - Whether the notification has been sent to Pushover.
		* @property {string} pushoverReceipt - The receipt of the notification.
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
		* Image file.
		* @interface
		* @property {string} name - The name of the image file.
		* @property {Buffer} data - The data of the image file.
		* @property {string} type - The type of the image file.
	*/
	export interface ImageFile {
		name: string;
		data: Buffer;
		type?: string;
	}

	/** Complete Pushover form payload including optional attachments. */
	/** 
		* Complete Pushover form payload including optional attachments.
		* @interface
		* @property {string} message - The message to send.
		* @property {string} title - The title of the message.
		* @property {string} token - The token of the message.
		* @property {string} user - The user of the message.
		* @property {string} device - The device of the message.
		* @property {string} url - The URL of the message.
		* @property {string} url_title - The title of the URL.
		* @property {number} priority - The priority of the message.
		* @property {number} timestamp - The timestamp of the message.
		* @property {string} sound - The sound of the message.
		* @property {string | ImageFile} file - The file of the message.
	*/
	export interface MessagePayload {
		message: string;
		title: string;
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
		* Sound map.
		* @interface
		* @property {string} [key: string] - The sound of the message.
	*/
	export interface SoundMap {
		[key: string]: string;
	}

	/** 
		* Pushover API response.
		* @interface
		* @property {number} status - The status of the response.
		* @property {string} request - The request of the response.
		* @property {string} receipt - The receipt of the response.
		* @property {string[]} errors - The errors of the response.
	*/
	export interface PushoverApiResponse {
		status?: number;
		request?: string;
		receipt?: string;
		errors?: string[];
		[key: string]: unknown;
	}

	/** 
		* HTTP options.
		* @interface
		* @property {Partial<RequestOptions>} options - The options of the request.
		* @property {string} proxy - The proxy of the request.
	*/
	export type HttpOptions = Partial<RequestOptions> & { proxy?: string };

	/** 
		* HTTP API request.
		* @interface
		* @property {Record<string, unknown>} body - The body of the request.
		* @property {Record<string, string | undefined>} params - The parameters of the request.
	*/
	export type HttpApiRequest = {
		body: Record<string, unknown>;
		params: Record<string, string | undefined>;
	};
}

export type { Pushover };

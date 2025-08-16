import { IncomingMessage, type RequestOptions } from "node:http";

/**
 * @namespace Pushover
 * @description Container for all Pushover related interfaces
 */
export declare module "pushover-types" {
 export interface BaseConfig {
  userKey: string;
  apiToken: string;
 }

 interface Config extends BaseConfig {}

 interface MessageBase {
  message: string;
  title: string;
 }

 interface Message extends MessageBase {
  sound?: string;
  priority?: number;
  timestamp?: number;
 }

 interface NotificationDataBase {
  id: string;
  title: string;
  message: string;
 }

 interface NotificationData extends NotificationDataBase {
  recipient: string;
  read: boolean;
  createdAt: string;
  pushoverSent?: boolean;
  pushoverReceipt?: string | null;
 }

 interface Options extends BaseConfig {
  debug?: boolean;
  onerror?: (err: Error | string, res?: IncomingMessage) => void;
  httpOptions?: Partial<RequestOptions> & {
   proxy?: string;
  };
  update_sounds?: boolean;
 }

 interface MessagePayload extends MessageBase {
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

 interface ImageFile {
  name: string;
  data: Buffer;
  type?: string;
 }

 interface SoundMap {
  [key: string]: string;
 }

 interface Response {
  status?: number;
  request?: string;
  receipt?: string;
  errors?: string[];
  [key: string]: unknown;
 }
}

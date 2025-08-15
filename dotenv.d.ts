declare namespace NodeJS {
 /**
  * Extended TypeScript interface for `process.env` with application-specific environment variables.
  *
  * @interface ProcessEnv
  * @memberof NodeJS
  * @description Provides type safety for environment variables used in the Pushover notification service.
  * @author Munir Mardinli <munir@mardinli.de>
  * @copyright 2025 pushover-notification
  * @license MIT
  * @version 1.0.0
  * @since 0.1.0
  *
  * @see {@link https://nodejs.org/api/process.html#processenv | Node.js process.env}
  * @see {@link https://pushover.net/api | Pushover API Documentation}
  */
 interface ProcessEnv {
  /**
   * Path to the YAML file for notification storage.
   *
   * @type {string}
   * @default "assets/notifications.yaml"
   *
   * @example
   * // Relative path (project-based)
   * "data/notifications.yml"
   *
   * @example
   * // Absolute path in container
   * "/var/lib/pushover/notifications.yaml"
   *
   * @security file-permissions
   * - Requires write permissions for Node process
   * - Should reside outside web root directory
   *
   * @throws {Error} ENOTDIR When parent directories don't exist
   * @throws {Error} EACCES When missing filesystem permissions
   */
  DATA_FILE: string;

  /**
   * HTTP port for Express server.
   *
   * @type {string}
   * @default "9095"
   * @validRange 1024-49151 (Registered ports)
   *
   * @example
   * // Standard dev port
   * "9095"
   *
   * @example
   * // Production port (via reverse proxy)
   * "3000"
   *
   * @warning
   * - Ports below 1024 require root privileges (not recommended)
   *
   * @throws {Error} EADDRINUSE When port is already in use
   * @throws {Error} EACCES When missing port binding permissions
   */
  PORT: string;

  /**
   * Pushover application API token.
   *
   * @type {string}
   * @format [a-zA-Z0-9]{30} (30 alphanumeric characters)
   *
   * @example
   * "azGDORePK8gMaC0QOYAMyEEuzJnyUi"
   *
   * @security critical
   * - Never hardcode in source!
   * - Only inject via environment variables or secrets manager
   * - Secure with Vault/Keyring in production
   *
   * @see {@link https://pushover.net/api#registration | Pushover App Registration}
   *
   * @throws {Error} InvalidApiTokenError When format is invalid
   */
  PUSHOVER_API_TOKEN: string;

  /**
   * Pushover user or group key.
   *
   * @type {string}
   * @format [a-zA-Z0-9]{30} (30 alphanumeric characters)
   *
   * @example
   * "uQiRzpo4DXghDmr9QzzfQu27cmVRsG"
   *
   * @security sensitive
   * - Anyone with this key can send messages
   * - Keys should be separated by environment (Dev/Prod)
   *
   * @see {@link https://pushover.net/api#identify | Pushover User Keys}
   *
   * @throws {Error} InvalidUserKeyError When format is invalid
   */
  PUSHOVER_USER_KEY: string;
 }
}

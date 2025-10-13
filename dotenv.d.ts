
/**
 * Environment variables type definitions
 */
declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * HTTP port for Express server.
     * @default "9095"
     */
    PORT: string;

    /**
     * Pushover application API token.
     * @format [a-zA-Z0-9]{30} (30 alphanumeric characters)
     * @see {@link https://pushover.net/api#registration | Pushover App Registration}
     */
    PUSHOVER_API_TOKEN: string;

    /**
     * Pushover user or group key.
     * @format [a-zA-Z0-9]{30} (30 alphanumeric characters)
     * @see {@link https://pushover.net/api#identify | Pushover User Keys}
     */
    PUSHOVER_USER_KEY: string;

    /**
     * Path to the assets directory.
     * @default "assets"
     */
    ASSETS_DIR: string;
  }
}

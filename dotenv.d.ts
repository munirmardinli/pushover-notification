declare global {
	namespace NodeJS {
		interface ProcessEnv {
			PUSHOVER_USER_KEY: string;
			PUSHOVER_API_TOKEN: string;
			ASSETS_DIR: string;
			PORT: string;
		}
	}
}

export {};

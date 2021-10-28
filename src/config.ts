import dotenv from 'dotenv'
import { logger } from './utils/logger'
import { AdapterMode } from './types/misc-types'

dotenv.config()

if (
	!process.env.NODE_ENV || !process.env.IP
	|| !process.env.PORT
) {
	logger.error('Please provide valid .env configuration')
	process.exit()
}

export const Config = {
	HOME_PATH: process.cwd(),
	NODE_ENV: process.env.NODE_ENV!,
	IP: process.env.IP!,
	EXTERNAL_PORT: process.env.EXTERNAL_PORT!,
	PORT: process.env.PORT!,
	GATEWAY: {
		HOST: process.env.GTW_HOST!,
		PORT: process.env.GTW_PORT!,
		TIMEOUT: process.env.GTW_TIMEOUT ? Number(process.env.GTW_TIMEOUT) : 30000,
		ROUTE: 'api',
		CALLBACK_ROUTE: 'agent',
		ID: process.env.GTW_ID!,
		PASSWORD: process.env.GTW_PWD!
	},
	DB: {
		HOST: process.env.DB_HOST!,
		PORT: process.env.DB_PORT!,
		CACHE: process.env.DB_CACHE_ENABLED === 'true', // Enables caching values in Redis, reduce calls to adapter
		CACHE_TTL: process.env.DB_CACHE_TTL! // Time to live of the values cached from the adapter
	},
	WOT: {
		ENABLED: process.env.WOT_ENABLED === 'true',
		HOST: process.env.WOT_HOST!,
		PORT: process.env.WOT_PORT!,
		BASE_URI: process.env.WOT_BASE_URI!
	},
	ADAPTER: {
		MODE: process.env.ADAPTER_MODE ? process.env.ADAPTER_MODE : AdapterMode.PROXY,
		HOST: process.env.ADAPTER_HOST!,
		PORT: process.env.ADAPTER_PORT!
	}
}

import dotenv from 'dotenv'
import { logger } from './utils/logger'

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
	PORT: process.env.PORT!,
	GATEWAY: {
		HOST: process.env.GTW_HOST!,
		PORT: process.env.GTW_PORT!,
		ROUTE: process.env.GTW_ROUTE!,
		CALLBACK_ROUTE: process.env.GTW_CALLBACK_ROUTE!,
		ID: process.env.GTW_ID!,
		PASSWORD: process.env.GTW_PWD!
	},
	DB: {
		HOST: process.env.DB_HOST!,
		PORT: process.env.DB_PORT!,
		CACHE: process.env.DB_CACHE === 'enabled',
		CACHE_TTL: process.env.DB_CACHE_TTL!
	}

}

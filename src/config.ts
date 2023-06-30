import dotenv from 'dotenv'
import { AdapterMode } from './types/misc-types'

dotenv.config()

if (process.env.NODE_ENV === 'test') {
	console.log('Using test configuration...')
} else if (
	!process.env.NODE_ENV || !process.env.IP
	|| !process.env.PORT
) {
	console.log('Please provide valid .env configuration')
	process.exit()
} else {
	console.log('Using normal configuration...')
}

const normalConfig = {
	HOME_PATH: process.cwd(),
	NODE_ENV: process.env.NODE_ENV!,
	IP: process.env.IP!,
	EXTERNAL_PORT: process.env.EXTERNAL_PORT!,
	PORT: process.env.PORT!,
	DLT: {
		ENABLED: process.env.DLT_ENABLED === 'true' ? true : false,
	},
	ODRL: {
		ENABLED: process.env.SEMANTIC_ODRL_ENABLED! === 'true' ? true : false,
		HOST: process.env.ODRL_HOST! || 'http://helio',
		PORT: process.env.ODRL_PORT! || 4567,
	},
	SHACL: {
		ENABLED: process.env.SEMANTIC_SHACL_ENABLED! === 'true' ? true : false,
	},
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
		PASSWORD: process.env.DB_PASSWORD!,
		CACHE: process.env.DB_CACHE_ENABLED === 'true', // Enables caching values in Redis, reduce calls to adapter
		CACHE_TTL: process.env.DB_CACHE_TTL! // Time to live of the values cached from the adapter
	},
	WOT: {
		ENABLED: process.env.WOT_ENABLED === 'true',
		HOST: process.env.WOT_HOST!,
		PORT: process.env.WOT_PORT!,
		BASE_URI: process.env.WOT_BASE_URI!,
		CACHE: process.env.WOT_CACHE === 'false' ? false : true // Default is true
	},
	ADAPTER: {
		MODE: process.env.ADAPTER_MODE ? process.env.ADAPTER_MODE : AdapterMode.PROXY,
		HOST: process.env.ADAPTER_HOST!,
		PORT: process.env.ADAPTER_PORT!,
		USE_MAPPING: process.env.USE_MAPPING === 'true',
	},
	// Enables the HTTP interface for direct requests through HTTP (not xmpp)
	// ENABLED is used from both sides
	HTTP_PROXY: {
		IP_CHECK: process.env.HTTP_PROXY_IP_CHECK === 'false' ? false : true, // Default is true,
		ENABLED: process.env.HTTP_PROXY_ENABLED === 'true' ? true : false, // Default is false
	}
}

const testConfig = {
	HOME_PATH: process.cwd(),
	NODE_ENV: 'test',
	IP: '0.0.0.0',
	EXTERNAL_PORT: '81',
	PORT: '4000',
	DLT: {
		ENABLED: false,
	},
	ODRL: {
		ENABLED: false,
		HOST: 'http://helio',
		PORT: 4567,
	},
	SHACL: {
		ENABLED: false,
	},
	GATEWAY: {
		HOST: 'http://gateway',
		PORT: '8181',
		TIMEOUT: 10000,
		ROUTE: 'api',
		CALLBACK_ROUTE: 'agent',
		ID: 'gtwId',
		PASSWORD: 'gtwPassword'
	},
	DB: {
		HOST: 'cache-db',
		PORT: '6379',
		PASSWORD: 'changeme',
		CACHE: true,
		CACHE_TTL: '60'
	},
	WOT: {
		ENABLED: true,
		HOST: 'http://wothive',
		PORT: '9000',
		BASE_URI: undefined,
		CACHE: false
	},
	ADAPTER: { 
		MODE: 'dummy', 
		HOST: 'http://adapter', 
		PORT: '3001',
		USE_MAPPING: true
	},
	HTTP_PROXY: {
		IP_CHECK: true,
		ENABLED: false
	}
}

export const Config = process.env.NODE_ENV === 'test' ? testConfig : normalConfig 

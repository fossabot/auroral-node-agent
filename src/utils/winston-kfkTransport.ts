import Transport from 'winston-transport'
import dotenv from 'dotenv'
import { ErrorLogType } from '../types/misc-types'
import { gateway } from '../microservices/gateway'

dotenv.config()

export class CustomTransport extends Transport {
  // eslint-disable-next-line no-useless-constructor
  constructor(opts: Transport.TransportStreamOptions | undefined) {
    super(opts)
  }
  log(info: { message: string, level: string, timestamp: string }, callback: () => void) {
       // Build error object
    try {
      if (process.env.KFK_ERROR_ENABLED !== 'true') {
        return callback()
      }
      const errorObject: ErrorLogType = {
        // statusCode: 12, // Not available
        // reqId: 'unknown', // Not available
        message: info.message,
        level: info.level,
        // can not use config here
        agid: process.env.GTW_ID ? process.env.GTW_ID : 'unknown', 
        service: 'AGENT',
        timestamp: info.timestamp,
      }
      // Call POST to kfk
      console.log('Posting to kfk')
      gateway.kfkPushError(errorObject)
    } catch {
      console.log('Error posting to kfk')
    }
    callback()
  }
}

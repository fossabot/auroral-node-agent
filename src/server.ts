import errorHandler from 'errorhandler'
import stoppable from 'stoppable'
import { app } from './app'
import { Config } from './config'
import { logger } from './utils'
import { initialize } from './core/main'
import { gtwServices } from './core/gateway'
import { fillShacl } from './core/shacl'

/**
 * Error Handler. Provides full stack - only in dev
 */
if (Config.NODE_ENV === 'development') {
  app.use(errorHandler())
}

// Start other services
function bootstrap() {
  try {
    // Run other services here
    initialize()
  } catch (err) {
    logger.error(' ##### There were errors initializing the server...')
  }
}

/*
  WEB SERVER lifecycle
  Start server
  Connection manager wrapping to end connections gracefully
  Control kill signals
  Control HTTP server errors
*/
function startServer() {
  return stoppable(app.listen(app.get('port'), app.get('ip'), () => {
    // Server started
    logger.info(
      `  App is running at ${app.get('ip')}:${app.get('port')} in ${app.get('env')} mode`)
    logger.info(`  App root path is ${Config.HOME_PATH}`)
    logger.info('  Press CTRL-C to stop\n')
    bootstrap() // Initialize everything else
  }), 3000)
}

// App
const server = startServer()

// gracefully shut down server
function shutdown() {
  server.stop((err) => {
    if (err) {
      logger.error(err)
      process.exitCode = 1
    }
    gtwServices.doLogouts(null).then(() => {
      logger.info('BYE!')
      process.exit()
    }).catch(() => {
      logger.warn('AURORAL agent was stop but some connections were not closed')
      process.exit()
    })
  }) // decorated by stoppable module to handle keep alives 
}

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', () => {
  logger.info('Got SIGINT (aka ctrl-c in docker). Gracefully shutting down... ')
  shutdown()
})

// quit properly on docker stop
process.on('SIGTERM', () => {
  logger.info('Got SIGTERM (docker container stop). Gracefully shutting down... ')
  shutdown()
})

// eslint-disable-next-line import/no-default-export
export default server

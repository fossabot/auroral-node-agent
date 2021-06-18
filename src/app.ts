import cors from 'cors'
import express from 'express'
import { responseBuilder, HttpStatusCode } from './utils'
// import { UiRouter } from './api/ui-api/routes'
// import { GtwRouter } from './api/gtw-api/routes'
import { Config } from './config'
import { logger } from './utils/logger'

// Create Express server
const app = express()

// Express configuration
app.set('port', Config.PORT || 4000)
app.set('ip', Config.IP || 'localhost')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Basic cors setup
app.use(cors())

app.use((req, res, next) => {
  res.header('Access-Controll-Allow-Origin', '*')
  res.header('Access-Controll-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Access-Token')
  if (req.method === 'OPTIONS') {
    res.header('Access-Controll-Allow-Methods', 'POST, GET')
    return responseBuilder(HttpStatusCode.OK, res, null, {})
  }
  next()
})
 
// app.use('/ui/v1/', UiRouter)
// app.use('/gtw/v1/', GtwRouter)

/**
 * Not Found
 */
app.get('*', (req, res) => {
  logger.warn(`The path ${req.path} does not exist`)
  return responseBuilder(HttpStatusCode.NOT_FOUND, res)
})

export { app }

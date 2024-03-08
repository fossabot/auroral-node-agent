import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import path from 'path'
import { responseBuilder, HttpStatusCode } from './utils'
import { MainRouter } from './api/main/routes'
import { ProxyRouter } from './api/proxy/routes'
import { Config } from './config'
import { logger } from './utils/logger'

import swaggerDocument from './docs/swagger.json'

// Update port dynamically
// swaggerDocument.host = 'localhost:' + Config.EXTERNAL_PORT

// Create Express server
const app = express()

// Express configuration
app.set('port', Config.PORT || 4000)
app.set('ip', Config.IP || 'localhost')
app.set('env', Config.NODE_ENV || 'development')
app.use(express.urlencoded({ extended: true }))

// Load swagger docs
const swagger_options = {
  customCss: '.swagger-ui .topbar { display: none }'
}

// Basic cors setup
// app.use(cors())

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'AURORAL server')
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Access-Token')
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE')
    return responseBuilder(HttpStatusCode.OK, res, null, {})
  }
  next()
})
 
// API endpoints of the Agent
app.use('/api', MainRouter)
app.use('/agent', express.json(), ProxyRouter)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swagger_options))
app.use('/ui', express.static('/app/ui'))
app.use('/ui/assets', express.static('/app/ui/assets'))
app.get('/ui/*', (request, response) => {
  response.sendFile(path.resolve('/app/ui/index.html'));
});
/**
 * Not Found
 */
app.get('*', (req, res) => {
  logger.warn(`The path ${req.path} does not exist`)
  return responseBuilder(HttpStatusCode.NOT_FOUND, res)
})

export { app }

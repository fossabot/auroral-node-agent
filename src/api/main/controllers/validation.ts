// Controller common imports
import got from 'got'
import { expressTypes } from '../../../types/index'
import { HttpStatusCode } from '../../../utils/http-status-codes'
import { responseBuilder } from '../../../utils/response-builder'
import { shacl } from '../../../microservices/shacl'
import { errorHandler, logger } from '../../../utils'
// Other imports
import { JsonType, ValidationResponseType } from '../../../types/misc-types'
import { Config } from '../../../config'


// ***** Consume remote resources *****

type validateBodyCtrl = expressTypes.Controller<{}, any, {}, ValidationResponseType, {}>

export const validateBody: validateBodyCtrl = async (req, res) => {
  const body = req.body
  const response: ValidationResponseType = {
    jsonLd: false,
    validContext: false,
    validPayload: false,
 }
 if (!body) {
  response.errorMessage = 'No body in request'
  return responseBuilder(HttpStatusCode.BAD_REQUEST, res, response.errorMessage)
 }
  if (isJsonLd(body)) {
    response.jsonLd = true
  } else {
    response.errorMessage = 'Body is not JSON-LD'
    return responseBuilder(HttpStatusCode.BAD_REQUEST, res, response.errorMessage)
  }
  const contextUrl = extractContextFromBody(body)
  if (!contextUrl) {
    response.errorMessage = 'Body has no context'
    return responseBuilder(HttpStatusCode.BAD_REQUEST, res, response.errorMessage)
  }
  const base64context = Buffer.from(contextUrl.toString()).toString('base64')
  if(!Config.SHACL.ENABLED) {
    response.errorMessage = 'SHACL integration is not enabled'
    return responseBuilder(HttpStatusCode.SERVICE_UNAVAILABLE, res, response.errorMessage)
  }
  try {
    const context = await shacl.getShape(base64context)
    response.validContext = true
    response.validPayload = await shacl.validateMessage(base64context, body)
    logger.debug('Validation result: JSON: '+ response.jsonLd + ' Context: ' + response.validContext + ' Payload: ' + response.validPayload)
  } catch (err) {
    const error = errorHandler(err)
    response.errorMessage = 'Validation error: ' + error.message
    return responseBuilder(HttpStatusCode.BAD_REQUEST, res, response.errorMessage)
  }
 return responseBuilder(HttpStatusCode.OK, res, null, response)
}

function isJsonLd(str: string): boolean {
  try {
    if (typeof str === 'object') {
      return true
    } else {
      JSON.parse(str)
    }
  } catch (e) {
      return false
  }
  return true
}
// function extractContextFromBody
function extractContextFromBody(body: JsonType): string | null {
  if (body['@context']) {
    if (typeof body['@context'] === 'string') {
      return body['@context']
    } else if (typeof body['@context'] === 'object') {
      for (const c of body['@context']) {
        if (typeof c === 'string') {
          return c
        }
    } 
    }
  }
  return null
}

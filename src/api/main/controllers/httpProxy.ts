// Controller common imports
import { NextFunction, query, Request, Response } from 'express'
import got, { Method } from 'got'
import dns from 'dns'
import ipaddr from 'ipaddr.js'

// Types
import { expressTypes } from '../../../types'
// Custom imports
import { Config } from '../../../config'
import { Thing } from '../../../types/wot-types'
import { addTDtoCache, getTDfromCache } from '../../../persistance/persistance'
import { errorHandler, HttpStatusCode, logger, MyError, responseBuilder } from '../../../utils'
import { gateway } from '../../../microservices/gateway'

export const tryHttpProxy  = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (Config.HTTP_PROXY.ENABLED === false) {
        logger.debug('DIrect HTTP requests are disabled')
        return next()
      }
      if (!req.params || !req.params.oid || !req.params.pid || !req.params.id) {
        return res.status(400).send('Missing parameters')
      }
      // Retrieve remote TD
      const td = await getTd(req.params.oid)
      // Proxy URL from TD
      const proxyUrl = getUrlFromTd(td, req.params.pid)
      // Get test JWT from gateway
      const jwtToken = (await gateway.getHttpToken(req.params.id, req.params.oid, req.params.pid)).message
      // Check if URL is accesisble
      if (!await checkUrl(proxyUrl)) {
        logger.info('direct HTTP communication not possible - skipping to XMPP request')
        return next()
      }
      // transform query to searchParams
      const searchParams = new URLSearchParams()
      for (const key in req.query) {
        if (Object.prototype.hasOwnProperty.call(req.query, key)) {
          const element = req.query[key] as string
          searchParams.append(key, element)
        }
      }
      const stream = got(proxyUrl, { 
        isStream: true,
        method: req.method as Method,
        // Add req.query to url
        searchParams: searchParams,
        hooks: {
          beforeRequest: [
            options => {
              // remove host header to avoid ssl issues
              delete options.headers.host
              // Add JWT token to header
              options.headers.Authorization = 'Bearer ' + jwtToken 
              options.headers['user-agent'] = req.headers['user-agent'] ? req.headers['user-agent'] : 'Auroral node'
              // If POST/PUT add body from request
              if (req.method === 'POST' || req.method === 'PUT') {
                options.body = req.body
              }
            }
          ]
        } })
      req.pipe(stream).pipe(res)
    } catch (error) {
      const err = errorHandler(error)
      logger.error(err.message)
      res.status(err.status).send(err.message)
      console.log(err)
    }
  }

type generateTokenCtrl = expressTypes.Controller<{ id: string, oid: string, pid: string }, {}, string, any, {}>

export const generateToken: generateTokenCtrl = async (req, res, next) => {
  try {
    logger.debug('Generating token for ' + req.params.id + ' ' + req.params.oid + ' ' + req.params.pid)
    const token = (await gateway.getHttpToken(req.params.id, req.params.oid, req.params.pid)).message
    return responseBuilder(HttpStatusCode.OK, res, null, token)
  } catch (error) {
    const err = errorHandler(error)
    logger.error(err.message)
    return responseBuilder(err.status, res, err.message)
  }
}

type validateTokenCtrl = expressTypes.Controller<{}, {},{ authorization: string }, string, {}>

export const validateToken: validateTokenCtrl = async (req, res) => {
  try {
    // Accept token in headers and in queryparams (swagger does not support header authorization)
    const authorization = req.query.authorization ?  req.query.authorization : req.headers.authorization
    if (!authorization) {
      return responseBuilder(HttpStatusCode.UNAUTHORIZED, res, 'Missing token')
    } 
    if (!authorization.startsWith('Bearer ')) {
      return responseBuilder(HttpStatusCode.BAD_REQUEST, res, 'Token must be of type Bearer')
    }
    const valid = await gateway.validateHttpToken(authorization.substring(7))
    if (valid) {
      logger.debug('Token valid')
      return responseBuilder(HttpStatusCode.OK, res, null, 'Token valid' as string)
    } else {
      logger.debug('Token invalid')
      return responseBuilder(HttpStatusCode.FORBIDDEN, res, 'Token invalid')
    }
  } catch (error) {
    const err = errorHandler(error)
    logger.error(err.message)
    return responseBuilder(err.status, res, err.message)
  }
}

// Helper functions
const getTd = async (oid: string): Promise<Thing> => {
  try {
     // Retrieve TD (cache or from remote)
     const cached_td = await getTDfromCache(oid) 
     // Don't neeed to check if TD is local -> if it is local it is already in the cache
     if (cached_td) {
       logger.debug('TD retrieved from cache')
       return cached_td as Thing
       // Use TD later for detail extraction
     } else {
       // get remote agid
       logger.debug('TD cache miss - retrieving TD from remote agent')
       const agid = (await gateway.getAgentByOid(oid)).message
       const td = (await gateway.discoveryRemote(agid, { oids: oid })).message[0].message.wrapper[0].td
       // cache TD
       await addTDtoCache(oid, JSON.stringify(td))
       return td as any as Thing
     }
  } catch (error) {
    logger.error('Error retrieving TD: ' + error)
    throw new MyError('Error retrieving TD', HttpStatusCode.BAD_REQUEST)
  }
}
const getUrlFromTd = (td: Thing, pid: string): string => {
  if (td && td.properties && td.properties[pid] && td.properties[pid].forms && td.properties[pid].forms![0].href) {
    console.log(td.properties[pid].forms![0].href)
    return td.properties[pid].forms![0].href
  }
  throw new MyError('TD does not contain the requested url', HttpStatusCode.BAD_REQUEST)
}

const checkUrl = async (url: string): Promise<boolean> => {
  try {
    const hostname = new URL(url).hostname
    // hostname is already an IP address or DNS lookup
    const ip = ipaddr.isValid(hostname) ? hostname : (await dns.promises.lookup(hostname)).address
    const ipRange = ipaddr.parse(ip).range()
    logger.debug('DNS: ' + hostname + ' ip: ' + ip + ' range: ' + ipRange)
    // check if address is private - not accessible from outside
    if (ipRange === 'private' || ipRange === 'linkLocal' || ipRange === 'loopback' || ipRange === 'uniqueLocal') {
      if (Config.HTTP_PROXY.IP_CHECK) {
        logger.debug('Local url')
        return false
      } else {
        logger.debug('Local url - IP check disabled')
      }
    }
    // address is public - return true
    return true
    // Additional check if URL is accessible with request
    // now disabled
    // const response = await got(url, {
    //   method: 'HEAD',
    //   throwHttpErrors: false,
    //   headers: {
    //     Authorization: 'Bearer: ' + jwt
    //   }
    // })
    // logger.debug('URL response: ' + response.statusCode)
    // if (response.statusCode === 200) {
    //   return true
    // } else {
    //   return false
    // }
  } catch (err) {
    logger.debug('URL is not accessible')
    return false
  }
}

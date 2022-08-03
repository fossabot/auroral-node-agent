/**
 * redis.js
 * Interface to REDIS DB
 * @interface
 */
 import { createClient } from 'redis'
import { Request, Response, NextFunction } from 'express'
import { Config } from '../config'
import { logger } from '../utils/logger'
import { JsonType } from '../types/misc-types'
import { errorHandler } from '../utils/error-handler'

 // Workaround to solve Redis issue with types
 type RedisClientType = ReturnType<typeof createClient>
 type RedisClientOptions = Parameters<typeof createClient>[0]

// Redis client connection settings
 const redisOptions = {
  // port: Number(Config.REDIS.PORT), 
  url: Config.DB.HOST,
  password: Config.DB.PASSWORD,
  database: 0 // DB for sessions
} as RedisClientOptions

export class RedisFactory {
  private client: RedisClientType

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
  }

  // Initialization and status

  /**
  * Starts REDIS and listens to connect or error events;
  * @returns {void}
  */
  public start = async () => {
      try {
          await this.client.connect()
      } catch (err) {
          const error = errorHandler(err)
          logger.error(error.message)
          logger.error('Could not connect to Redis...')
      }
  }

  /**
   * Checks REDIS connection status;
   * Rejects if REDIS not ready;
   * @async
   * @returns {void}
   */
  public health = async (): Promise<boolean> => {
      const reply = await this.client.ping()
      logger.debug('Redis is ready: ' + reply)
      return true
  }

  // PERSIST

  /**
   * Force saving changes to dump.rdb;
   * Use to ensure critical changes will not be lost;
   * Does not reject on error, resolves false;
   * @async
   * @returns {string}
   */
  public save = async (): Promise<void> => {
      await this.client.save()
  }

  // BASIC STRING STORAGE & REMOVAL

  /**
   * Save a string;
   * Custom defined ttl => 0 = no TTL;
   * rejects on error;
   * @async
   * @param {string} key
   * @param {*} item
   * @param {integer} ttl
   * @returns {void}
   */
  public set = async (key: string, item: string, ttl?: number): Promise<void> => {
      if (ttl) {
        await this.client.set(key, item, { 'EX': ttl }) // Other options NX, GET (Check redis for more)...
      } else {
        await this.client.set(key, item)
      }
  }

  /**
   * Remove manually one key or list stored;
   * rejects on error a boolean;
   * @async
   * @param {string} key
   * @returns {void}
   */
  public remove = async (key: string): Promise<void> => {
      await this.client.del(key)
  }

  /**
   * Get manually one key or list stored;
   * rejects on error a boolean;
   * @async
   * @param {string} key
   * @returns {string | null}
   */
  public get = (key: string): Promise<string | null> => {
      return this.client.get(key)
  }

  /**
   * Get manually one key or list stored;
   * rejects on error a boolean;
   * @async
   * @param {string} key
   * @returns {string | null}
   */
  public getWithTTL = async (key: string): Promise<{ value: string | null, ttl: number }> => {
      const ttl = await this.client.TTL(key)
      const value = await this.client.get(key)
      return { value, ttl }
  }

  /**
   * Get manually one key or list stored;
   * rejects on error a boolean;
   * @async
   * @param {string} key
   * @returns {string | null}
   */
  public scan = (cursor: number): Promise<{ cursor: number, keys: string[]}> => {
      return this.client.scan(cursor)
  }

  // SETS

   /**
    * Adds item to set;
    * item can be an array of items or a string;
    * rejects on error a boolean;
    * @async
    * @param {string} key
    * @param {string} item
    * @returns {boolean}
    */
   public sadd = (key: string, item: string): Promise<number> => {
      return this.client.sAdd(key, item)
   }

   /**
    * Remove item from set;
    * item can be an array of items or a string;
    * rejects on error a boolean;
    * @async
    * @param {string} key
    * @param {string} item
    * @returns {boolean}
    */
   public srem = (key: string, item: string): Promise<number> => {
       return this.client.sRem(key, item)
   }

   /**
    * Check if item is a set member;
    * rejects on error a boolean;
    * @async
    * @param {string} key
    * @param {*} item
    * @returns {boolean}
    */
   public sismember = (key: string, item: string): Promise<boolean> => {
      return this.client.sIsMember(key, item)
   }

   /**
    * Count of members in set;
    * rejects on error a boolean;
    * @async
    * @param {string} key
    * @returns {integer}
    */
   public scard = (key: string): Promise<number> => {
      return this.client.sCard(key)
   }

   /**
    * Retrieve all set members;
    * rejects on error a boolean;
    * @async
    * @param {string} key
    * @returns {array of strings}
    */
   public smembers = (key: string): Promise<string[]> => {
      return this.client.sMembers(key)
   }

  // HASH
   
  /**
    * Get value of a key in a hash
    * rejects on error a boolean;
    * @async
    * @param {string} hkey
    * @param {string} key
    * @returns {*}
    */
   public hget = (hkey: string, key: string): Promise<string | undefined> => {
      return this.client.hGet(hkey, key)
   }

   /**
    * Set value of a key in a hash;
    * rejects on error a boolean;
    * @async
    * @param {string} hkey
    * @param {string} key
    * @param {*} value
    * @returns {boolean}
    */
   public hset = (hkey: string, key: string, value: string): Promise<number> => {
      return this.client.hSet(hkey, key, value)
   }

   /**
    * Remove key in a hash;
    * rejects on error a boolean;
    * @async
    * @param {string} hkey
    * @param {string} key
    * @returns {boolean}
    */
   public hdel = (hkey: string, key: string): Promise<number> => {
      return this.client.hDel(hkey, key)
   }

   /**
    * Check if key exists in hash;
    * rejects on error a boolean;
    * @async
    * @param {string} hkey
    * @param {string} key
    * @returns {boolean}
    */
   public hexists = (hkey: string, key: string): Promise<boolean> => {
      return this.client.hExists(hkey, key)
   }

   /**
    * Get all key:value in a hash;
    * rejects on error a boolean;
    * @async
    * @param {string} hkey
    * @returns {object}
    */
   public hgetall = (hkey: string): Promise<JsonType> => {
      return this.client.hGetAll(hkey)
   }

}

// Expose singleton class

 export const redisDb = new RedisFactory(redisOptions)
 redisDb.start()
 logger.info('Connected successfully Redis for CommServer!!')

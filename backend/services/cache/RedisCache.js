const Redis = require('redis');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.keyPrefix = process.env.REDIS_KEY_PREFIX || 'crypto_exchange:';
  }

  async connect() {
    try {
      this.client = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        database: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis server connection refused.');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('Redis retry time exhausted.');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('Redis max retry attempts reached.');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis client ready');
      });

      this.client.on('end', () => {
        console.log('Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  getKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  // Market data caching
  async setMarketData(pair, data, ttl = 300) { // 5 minutes default
    if (!this.isConnected) return false;
    
    try {
      const key = this.getKey(`market:${pair}`);
      await this.client.setEx(key, ttl, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error setting market data:', error);
      return false;
    }
  }

  async getMarketData(pair) {
    if (!this.isConnected) return null;
    
    try {
      const key = this.getKey(`market:${pair}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting market data:', error);
      return null;
    }
  }

  // Order book caching
  async setOrderBook(pair, orderbook, ttl = 60) { // 1 minute default
    if (!this.isConnected) return false;
    
    try {
      const key = this.getKey(`orderbook:${pair}`);
      await this.client.setEx(key, ttl, JSON.stringify({
        ...orderbook,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error setting orderbook:', error);
      return false;
    }
  }

  async getOrderBook(pair) {
    if (!this.isConnected) return null;
    
    try {
      const key = this.getKey(`orderbook:${pair}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting orderbook:', error);
      return null;
    }
  }

  // User session caching
  async setUserSession(userId, sessionData, ttl = 3600) { // 1 hour default
    if (!this.isConnected) return false;
    
    try {
      const key = this.getKey(`session:${userId}`);
      await this.client.setEx(key, ttl, JSON.stringify({
        ...sessionData,
        lastActivity: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error setting user session:', error);
      return false;
    }
  }

  async getUserSession(userId) {
    if (!this.isConnected) return null;
    
    try {
      const key = this.getKey(`session:${userId}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user session:', error);
      return null;
    }
  }

  async deleteUserSession(userId) {
    if (!this.isConnected) return false;
    
    try {
      const key = this.getKey(`session:${userId}`);
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting user session:', error);
      return false;
    }
  }

  // User balance caching
  async setUserBalance(userId, balances, ttl = 1800) { // 30 minutes default
    if (!this.isConnected) return false;
    
    try {
      const key = this.getKey(`balance:${userId}`);
      await this.client.setEx(key, ttl, JSON.stringify({
        balances,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error setting user balance:', error);
      return false;
    }
  }

  async getUserBalance(userId) {
    if (!this.isConnected) return null;
    
    try {
      const key = this.getKey(`balance:${userId}`);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return null;
    }
  }

  async invalidateUserBalance(userId) {
    if (!this.isConnected) return false;
    
    try {
      const key = this.getKey(`balance:${userId}`);
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error invalidating user balance:', error);
      return false;
    }
  }

  // Rate limiting
  async checkRateLimit(identifier, limit = 100, window = 3600) {
    if (!this.isConnected) return { allowed: true, remaining: limit };
    
    try {
      const key = this.getKey(`rate_limit:${identifier}`);
      const current = await this.client.get(key);
      
      if (!current) {
        await this.client.setEx(key, window, '1');
        return { allowed: true, remaining: limit - 1, resetTime: Date.now() + window * 1000 };
      }
      
      const count = parseInt(current);
      if (count >= limit) {
        const ttl = await this.client.ttl(key);
        return { 
          allowed: false, 
          remaining: 0, 
          resetTime: Date.now() + ttl * 1000 
        };
      }
      
      await this.client.incr(key);
      const ttl = await this.client.ttl(key);
      return { 
        allowed: true, 
        remaining: limit - count - 1, 
        resetTime: Date.now() + ttl * 1000 
      };
      
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true, remaining: limit };
    }
  }

  // Generic cache methods
  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    
    try {
      const redisKey = this.getKey(key);
      const data = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.setEx(redisKey, ttl, data);
      return true;
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const redisKey = this.getKey(key);
      const data = await this.client.get(redisKey);
      
      if (!data) return null;
      
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  async delete(key) {
    if (!this.isConnected) return false;
    
    try {
      const redisKey = this.getKey(key);
      await this.client.del(redisKey);
      return true;
    } catch (error) {
      console.error('Error deleting cache:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;
    
    try {
      const redisKey = this.getKey(key);
      const exists = await this.client.exists(redisKey);
      return exists === 1;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  async getStats() {
    if (!this.isConnected) return null;
    
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      console.error('Error getting Redis stats:', error);
      return null;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
    }
  }
}

module.exports = new RedisCache();
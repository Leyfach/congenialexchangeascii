const WebSocket = require('ws');
const Redis = require('redis');
const orderBookManager = require('./OrderBookManager');
const redisCache = require('../cache/RedisCache');

class WebSocketManagerWithRedis {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // WebSocket -> client info
    this.subscriptions = new Map(); // client -> Set of subscriptions
    
    // Redis for pub/sub
    this.pubClient = null;
    this.subClient = null;
    this.isRedisConnected = false;
    
    this.serverId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize(server) {
    // Initialize WebSocket server
    this.wss = new WebSocket.Server({ server });
    
    // Initialize Redis pub/sub clients
    await this.initRedis();
    
    this.wss.on('connection', (ws, request) => {
      console.log('New WebSocket connection');
      
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.clients.set(ws, {
        id: clientId,
        userId: null,
        serverId: this.serverId,
        connected: Date.now(),
        subscriptions: new Set(),
        lastActivity: Date.now()
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
          
          // Update last activity
          const client = this.clients.get(ws);
          if (client) {
            client.lastActivity = Date.now();
          }
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws);
      });

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        clientId: clientId,
        serverId: this.serverId,
        timestamp: Date.now()
      });
      
      // Start heartbeat
      this.startHeartbeat(ws);
    });

    // Register as listener for order book events
    orderBookManager.addListener((event, data, userId) => {
      this.broadcastOrderBookEvent(event, data, userId);
    });

    console.log('WebSocket server with Redis scaling initialized');
  }

  async initRedis() {
    try {
      // Publisher client
      this.pubClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD
      });

      // Subscriber client  
      this.subClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD
      });

      this.pubClient.on('error', (err) => {
        console.error('Redis Pub Client Error:', err);
        this.isRedisConnected = false;
      });

      this.subClient.on('error', (err) => {
        console.error('Redis Sub Client Error:', err);
        this.isRedisConnected = false;
      });

      await this.pubClient.connect();
      await this.subClient.connect();
      
      this.isRedisConnected = true;
      console.log('Redis pub/sub clients connected');

      // Subscribe to broadcast channels
      await this.subClient.subscribe('ws:broadcast', (message) => {
        this.handleRedisMessage(JSON.parse(message));
      });

      await this.subClient.subscribe('ws:user_message', (message) => {
        this.handleRedisUserMessage(JSON.parse(message));
      });

      // Clean up disconnected clients periodically
      this.startCleanupTimer();

    } catch (error) {
      console.error('Failed to initialize Redis pub/sub:', error);
      this.isRedisConnected = false;
    }
  }

  startHeartbeat(ws) {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(interval);
      }
    }, 30000); // 30 seconds

    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.lastActivity = Date.now();
      }
    });
  }

  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [ws, client] of this.clients) {
        if (now - client.lastActivity > timeout) {
          console.log(`Cleaning up inactive client: ${client.id}`);
          ws.terminate();
          this.clients.delete(ws);
        }
      }
    }, 60000); // Check every minute
  }

  handleDisconnect(ws) {
    const client = this.clients.get(ws);
    if (client && client.userId) {
      // Update user session in Redis
      redisCache.setUserSession(client.userId, {
        status: 'offline',
        lastSeen: Date.now(),
        disconnectedFrom: this.serverId
      }, 3600);
    }
    this.clients.delete(ws);
  }

  handleMessage(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(ws, message);
        break;
        
      case 'subscribe':
        this.handleSubscription(ws, message);
        break;
        
      case 'unsubscribe':
        this.handleUnsubscription(ws, message);
        break;
        
      case 'place_order':
        this.handlePlaceOrder(ws, message);
        break;
        
      case 'cancel_order':
        this.handleCancelOrder(ws, message);
        break;
        
      case 'get_orderbook':
        this.handleGetOrderBook(ws, message);
        break;
        
      case 'ping':
        this.send(ws, { type: 'pong', timestamp: Date.now() });
        break;
        
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  async handleAuthentication(ws, message) {
    const client = this.clients.get(ws);
    
    // Simple authentication for demo - in production use JWT verification
    if (message.userId) {
      client.userId = message.userId;
      
      // Update user session in Redis
      await redisCache.setUserSession(message.userId, {
        status: 'online',
        serverId: this.serverId,
        clientId: client.id,
        connectedAt: Date.now(),
        lastActivity: Date.now()
      }, 3600);
      
      this.send(ws, {
        type: 'authenticated',
        userId: message.userId,
        serverId: this.serverId,
        timestamp: Date.now()
      });
      
      // Send user's current orders
      const userOrders = orderBookManager.getUserOrders(message.userId);
      this.send(ws, {
        type: 'user_orders',
        orders: userOrders,
        timestamp: Date.now()
      });
    } else {
      this.sendError(ws, 'Authentication failed');
    }
  }

  handleSubscription(ws, message) {
    const client = this.clients.get(ws);
    const { channel, pair } = message;
    
    const subscription = `${channel}:${pair || 'all'}`;
    client.subscriptions.add(subscription);
    
    this.send(ws, {
      type: 'subscribed',
      channel: channel,
      pair: pair,
      timestamp: Date.now()
    });
    
    // Send initial data from cache if available
    if (channel === 'orderbook' && pair) {
      this.sendCachedOrderBook(ws, pair);
    }
  }

  async sendCachedOrderBook(ws, pair) {
    // Try to get orderbook from cache first
    const cachedOrderBook = await redisCache.getOrderBook(pair);
    
    if (cachedOrderBook && Date.now() - cachedOrderBook.timestamp < 60000) { // 1 minute freshness
      this.send(ws, {
        type: 'orderbook_snapshot',
        pair: pair,
        data: cachedOrderBook,
        cached: true,
        timestamp: Date.now()
      });
    } else {
      // Get fresh orderbook
      const orderbook = orderBookManager.getOrderBook(pair);
      this.send(ws, {
        type: 'orderbook_snapshot',
        pair: pair,
        data: orderbook,
        cached: false,
        timestamp: Date.now()
      });
      
      // Cache it
      await redisCache.setOrderBook(pair, orderbook, 60);
    }
  }

  handleUnsubscription(ws, message) {
    const client = this.clients.get(ws);
    const { channel, pair } = message;
    
    const subscription = `${channel}:${pair || 'all'}`;
    client.subscriptions.delete(subscription);
    
    this.send(ws, {
      type: 'unsubscribed',
      channel: channel,
      pair: pair,
      timestamp: Date.now()
    });
  }

  handlePlaceOrder(ws, message) {
    const client = this.clients.get(ws);
    
    if (!client.userId) {
      return this.sendError(ws, 'Authentication required');
    }
    
    const order = {
      ...message.order,
      userId: client.userId,
      serverId: this.serverId
    };
    
    try {
      const result = orderBookManager.addOrder(order);
      
      this.send(ws, {
        type: 'order_placed',
        result: result,
        timestamp: Date.now()
      });
      
      // Invalidate user balance cache
      redisCache.invalidateUserBalance(client.userId);
      
    } catch (error) {
      this.sendError(ws, `Failed to place order: ${error.message}`);
    }
  }

  handleCancelOrder(ws, message) {
    const client = this.clients.get(ws);
    
    if (!client.userId) {
      return this.sendError(ws, 'Authentication required');
    }
    
    try {
      const result = orderBookManager.cancelOrder(message.orderId, client.userId);
      
      this.send(ws, {
        type: 'order_cancelled',
        result: result,
        timestamp: Date.now()
      });
      
      // Invalidate user balance cache
      redisCache.invalidateUserBalance(client.userId);
      
    } catch (error) {
      this.sendError(ws, `Failed to cancel order: ${error.message}`);
    }
  }

  handleGetOrderBook(ws, message) {
    const { pair, depth } = message;
    this.sendCachedOrderBook(ws, pair);
  }

  // Handle messages from Redis pub/sub
  handleRedisMessage(data) {
    const { type, serverId, ...payload } = data;
    
    // Don't process messages from our own server
    if (serverId === this.serverId) return;
    
    switch (type) {
      case 'orderbook_update':
        this.broadcastOrderBookUpdate(payload.pair, payload.data);
        break;
        
      case 'trades':
        this.broadcastTrades(payload);
        break;
        
      default:
        console.log('Unknown Redis message type:', type);
    }
  }

  handleRedisUserMessage(data) {
    const { type, userId, serverId, ...payload } = data;
    
    // Don't process messages from our own server
    if (serverId === this.serverId) return;
    
    switch (type) {
      case 'user_order_update':
        this.sendUserOrderUpdate(userId);
        break;
        
      case 'user_trade':
        this.sendUserTrade(userId, payload.trade);
        break;
        
      default:
        console.log('Unknown Redis user message type:', type);
    }
  }

  broadcastOrderBookEvent(event, data, userId) {
    switch (event) {
      case 'orderbook_update':
        this.broadcastOrderBookUpdate(data); // data is pair
        this.publishToRedis('ws:broadcast', {
          type: 'orderbook_update',
          pair: data,
          serverId: this.serverId,
          timestamp: Date.now()
        });
        break;
        
      case 'trades':
        this.broadcastTrades(data); // data is { pair, trades }
        this.publishToRedis('ws:broadcast', {
          type: 'trades',
          ...data,
          serverId: this.serverId,
          timestamp: Date.now()
        });
        break;
        
      case 'user_order_update':
        this.sendUserOrderUpdate(data); // data is userId
        this.publishToRedis('ws:user_message', {
          type: 'user_order_update',
          userId: data,
          serverId: this.serverId,
          timestamp: Date.now()
        });
        break;
        
      case 'user_trade':
        this.sendUserTrade(userId, data); // userId, trade data
        this.publishToRedis('ws:user_message', {
          type: 'user_trade',
          userId: userId,
          trade: data,
          serverId: this.serverId,
          timestamp: Date.now()
        });
        break;
    }
  }

  async broadcastOrderBookUpdate(pair, cachedData = null) {
    let orderbook;
    
    if (cachedData) {
      orderbook = cachedData;
    } else {
      // Try cache first
      orderbook = await redisCache.getOrderBook(pair);
      if (!orderbook || Date.now() - orderbook.timestamp > 60000) {
        orderbook = orderBookManager.getOrderBook(pair);
        await redisCache.setOrderBook(pair, orderbook, 60);
      }
    }
    
    const message = {
      type: 'orderbook_update',
      pair: pair,
      data: orderbook,
      timestamp: Date.now()
    };

    this.broadcast((client) => 
      client.subscriptions.has(`orderbook:${pair}`) || 
      client.subscriptions.has('orderbook:all')
    , message);
  }

  broadcastTrades(data) {
    const { pair, trades } = data;
    const message = {
      type: 'trades',
      pair: pair,
      trades: trades,
      timestamp: Date.now()
    };

    this.broadcast((client) => 
      client.subscriptions.has(`trades:${pair}`) || 
      client.subscriptions.has('trades:all')
    , message);
  }

  sendUserOrderUpdate(userId) {
    const userOrders = orderBookManager.getUserOrders(userId);
    const message = {
      type: 'user_orders',
      orders: userOrders,
      timestamp: Date.now()
    };

    this.broadcast((client) => client.userId === userId, message);
  }

  sendUserTrade(userId, trade) {
    const message = {
      type: 'user_trade',
      trade: trade,
      timestamp: Date.now()
    };

    this.broadcast((client) => client.userId === userId, message);
  }

  broadcast(filter, message) {
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && filter(client)) {
        this.send(ws, message);
      }
    }
  }

  async publishToRedis(channel, message) {
    if (this.isRedisConnected && this.pubClient) {
      try {
        await this.pubClient.publish(channel, JSON.stringify(message));
      } catch (error) {
        console.error('Error publishing to Redis:', error);
      }
    }
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.send(ws, {
      type: 'error',
      error: error,
      timestamp: Date.now()
    });
  }

  getStats() {
    return {
      serverId: this.serverId,
      connectedClients: this.clients.size,
      authenticatedUsers: Array.from(this.clients.values()).filter(c => c.userId).length,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((sum, client) => sum + client.subscriptions.size, 0),
      redisConnected: this.isRedisConnected
    };
  }

  async close() {
    if (this.pubClient) await this.pubClient.disconnect();
    if (this.subClient) await this.subClient.disconnect();
  }
}

module.exports = new WebSocketManagerWithRedis();
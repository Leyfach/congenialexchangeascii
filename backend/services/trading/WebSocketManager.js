const WebSocket = require('ws');
const orderBookManager = require('./OrderBookManager');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // WebSocket -> client info
    this.subscriptions = new Map(); // client -> Set of subscriptions
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, request) => {
      console.log('New WebSocket connection');
      
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.clients.set(ws, {
        id: clientId,
        userId: null, // Will be set after authentication
        connected: Date.now(),
        subscriptions: new Set()
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        clientId: clientId,
        timestamp: Date.now()
      });
    });

    // Register as listener for order book events
    orderBookManager.addListener((event, data, userId) => {
      this.broadcastOrderBookEvent(event, data, userId);
    });

    console.log('WebSocket server initialized');
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

  handleAuthentication(ws, message) {
    const client = this.clients.get(ws);
    // Simple authentication for demo - in production use JWT verification
    if (message.userId) {
      client.userId = message.userId;
      this.send(ws, {
        type: 'authenticated',
        userId: message.userId,
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
    
    // Send initial data
    if (channel === 'orderbook' && pair) {
      const orderbook = orderBookManager.getOrderBook(pair);
      this.send(ws, {
        type: 'orderbook_snapshot',
        pair: pair,
        data: orderbook,
        timestamp: Date.now()
      });
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
      userId: client.userId
    };
    
    try {
      const result = orderBookManager.addOrder(order);
      
      this.send(ws, {
        type: 'order_placed',
        result: result,
        timestamp: Date.now()
      });
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
    } catch (error) {
      this.sendError(ws, `Failed to cancel order: ${error.message}`);
    }
  }

  handleGetOrderBook(ws, message) {
    const { pair, depth } = message;
    const orderbook = orderBookManager.getOrderBook(pair, depth);
    
    this.send(ws, {
      type: 'orderbook_snapshot',
      pair: pair,
      data: orderbook,
      timestamp: Date.now()
    });
  }

  broadcastOrderBookEvent(event, data, userId) {
    switch (event) {
      case 'orderbook_update':
        this.broadcastOrderBookUpdate(data); // data is pair
        break;
        
      case 'trades':
        this.broadcastTrades(data); // data is { pair, trades }
        break;
        
      case 'user_order_update':
        this.sendUserOrderUpdate(data); // data is userId
        break;
        
      case 'user_trade':
        this.sendUserTrade(userId, data); // userId, trade data
        break;
    }
  }

  broadcastOrderBookUpdate(pair) {
    const orderbook = orderBookManager.getOrderBook(pair);
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
      connectedClients: this.clients.size,
      authenticatedUsers: Array.from(this.clients.values()).filter(c => c.userId).length,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((sum, client) => sum + client.subscriptions.size, 0)
    };
  }
}

module.exports = new WebSocketManager();
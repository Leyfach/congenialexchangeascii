class TradingWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.subscriptions = new Set();
    this.isAuthenticated = false;
    this.userId = null;
  }

  connect() {
    try {
      // Use ws:// for local development, wss:// for production
      // Frontend runs on 5173, backend on 3001, so connect directly to backend
      const wsUrl = `ws://localhost:3000`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Trading WebSocket connected');
        this.reconnectAttempts = 0;
        this.onConnected();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('Trading WebSocket disconnected:', event.code, event.reason);
        this.isAuthenticated = false;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Trading WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  onConnected() {
    // Auto-authenticate with demo user
    this.authenticate('1'); // Demo user ID
    
    // Restore subscriptions
    for (const subscription of this.subscriptions) {
      const [channel, pair] = subscription.split(':');
      this.subscribe(channel, pair);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  handleMessage(message) {
    const { type } = message;
    
    // Emit to specific listeners
    this.emit(type, message);
    
    // Handle system messages
    switch (type) {
      case 'connected':
        console.log('WebSocket connected with client ID:', message.clientId);
        break;
        
      case 'authenticated':
        this.isAuthenticated = true;
        this.userId = message.userId;
        console.log('Authenticated as user:', message.userId);
        break;
        
      case 'error':
        console.error('WebSocket error:', message.error);
        break;
        
      case 'orderbook_update':
      case 'orderbook_snapshot':
        this.emit('orderbook', message);
        break;
        
      case 'trades':
        this.emit('trades', message);
        break;
        
      case 'user_orders':
        this.emit('userOrders', message);
        break;
        
      case 'user_trade':
        this.emit('userTrade', message);
        break;
        
      case 'order_placed':
        this.emit('orderPlaced', message);
        break;
        
      case 'order_cancelled':
        this.emit('orderCancelled', message);
        break;
    }
  }

  authenticate(userId) {
    this.send({
      type: 'authenticate',
      userId: userId
    });
  }

  subscribe(channel, pair = null) {
    const subscription = `${channel}:${pair || 'all'}`;
    this.subscriptions.add(subscription);
    
    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        channel: channel,
        pair: pair
      });
    }
  }

  unsubscribe(channel, pair = null) {
    const subscription = `${channel}:${pair || 'all'}`;
    this.subscriptions.delete(subscription);
    
    if (this.isConnected()) {
      this.send({
        type: 'unsubscribe',
        channel: channel,
        pair: pair
      });
    }
  }

  placeOrder(order) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }
    
    this.send({
      type: 'place_order',
      order: order
    });
  }

  cancelOrder(orderId) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }
    
    this.send({
      type: 'cancel_order',
      orderId: orderId
    });
  }

  getOrderBook(pair, depth = 20) {
    this.send({
      type: 'get_orderbook',
      pair: pair,
      depth: depth
    });
  }

  send(message) {
    if (this.isConnected()) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message queued');
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const callback of eventListeners) {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event callback:', error);
        }
      }
    }
  }

  disconnect() {
    this.subscriptions.clear();
    this.listeners.clear();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Ping to keep connection alive
  ping() {
    if (this.isConnected()) {
      this.send({ type: 'ping' });
    }
  }
}

// Create singleton instance
const tradingWebSocket = new TradingWebSocket();

// Auto-connect when module is loaded
tradingWebSocket.connect();

// Keep connection alive with periodic pings
setInterval(() => {
  tradingWebSocket.ping();
}, 30000); // Ping every 30 seconds

export default tradingWebSocket;
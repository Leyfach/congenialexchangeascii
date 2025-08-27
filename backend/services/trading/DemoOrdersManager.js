const orderBookManager = require('./OrderBookManager');
const priceUpdater = require('../price-data/priceUpdater');

class DemoOrdersManager {
  constructor() {
    this.isInitialized = false;
    this.demoUserId = 'demo_user';
  }

  // Initialize demo orders for all trading pairs
  async initializeDemoOrders() {
    if (this.isInitialized) {
      console.log('Demo orders already initialized');
      return;
    }

    console.log('Initializing demo orderbook data...');

    const tradingPairs = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 'DOT/USD', 'LINK/USD', 'AVAX/USD', 'MATIC/USD'];
    
    for (const pair of tradingPairs) {
      await this.createDemoOrdersForPair(pair);
    }

    this.isInitialized = true;
    console.log('Demo orderbook data initialized for all pairs');
  }

  // Create demo orders for a specific pair
  async createDemoOrdersForPair(pair) {
    try {
      // Get current price from cache or use fallback
      let currentPrice = await this.getCurrentPrice(pair);
      
      if (!currentPrice) {
        console.log(`No current price for ${pair}, using fallback`);
        const fallbackPrices = {
          'BTC/USD': 111000, 'ETH/USD': 4580, 'SOL/USD': 200,
          'ADA/USD': 0.86, 'DOT/USD': 3.87, 'LINK/USD': 24.50,
          'AVAX/USD': 24.40, 'MATIC/USD': 0.24
        };
        currentPrice = fallbackPrices[pair] || 1000;
      }

      // Create multiple bid orders (buy orders) below current price
      const bidLevels = [0.995, 0.99, 0.985, 0.98, 0.975, 0.97, 0.965, 0.96];
      for (let i = 0; i < bidLevels.length; i++) {
        const price = parseFloat((currentPrice * bidLevels[i]).toFixed(this.getPriceDecimals(currentPrice)));
        const quantity = this.getRandomQuantity(pair);
        
        const order = {
          pair,
          side: 'buy',
          type: 'limit',
          quantity,
          price,
          userId: `${this.demoUserId}_${i}`
        };

        orderBookManager.addOrder(order);
      }

      // Create multiple ask orders (sell orders) above current price  
      const askLevels = [1.005, 1.01, 1.015, 1.02, 1.025, 1.03, 1.035, 1.04];
      for (let i = 0; i < askLevels.length; i++) {
        const price = parseFloat((currentPrice * askLevels[i]).toFixed(this.getPriceDecimals(currentPrice)));
        const quantity = this.getRandomQuantity(pair);
        
        const order = {
          pair,
          side: 'sell',
          type: 'limit',
          quantity,
          price,
          userId: `${this.demoUserId}_sell_${i}`
        };

        orderBookManager.addOrder(order);
      }

      console.log(`Created demo orders for ${pair} around price $${currentPrice}`);

    } catch (error) {
      console.error(`Error creating demo orders for ${pair}:`, error);
    }
  }

  // Get current price from price service
  async getCurrentPrice(pair) {
    try {
      const [coin] = pair.split('/');
      const cachedPrices = priceUpdater.getCachedPrices();
      return cachedPrices[coin]?.price;
    } catch (error) {
      console.error('Error getting current price:', error);
      return null;
    }
  }

  // Get appropriate decimal places for price
  getPriceDecimals(price) {
    if (price < 1) return 6;
    if (price < 100) return 4;
    return 2;
  }

  // Generate realistic random quantities
  getRandomQuantity(pair) {
    const [coin] = pair.split('/');
    
    // Different quantity ranges for different coins
    const quantityRanges = {
      'BTC': [0.001, 0.5],
      'ETH': [0.01, 2.0],
      'SOL': [0.1, 10.0],
      'ADA': [10, 1000],
      'DOT': [1, 100],
      'LINK': [1, 50],
      'AVAX': [1, 50],
      'MATIC': [10, 500]
    };

    const range = quantityRanges[coin] || [0.1, 10];
    const min = range[0];
    const max = range[1];
    
    const quantity = min + Math.random() * (max - min);
    return parseFloat(quantity.toFixed(8));
  }

  // Refresh demo orders (call periodically to keep orderbook active)
  async refreshDemoOrders() {
    if (!this.isInitialized) return;

    console.log('Refreshing demo orders...');
    
    // Randomly add/remove some orders to simulate activity
    const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
    const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
    
    // 70% chance to add order, 30% chance to remove random order
    if (Math.random() > 0.3) {
      await this.addRandomDemoOrder(randomPair);
    } else {
      this.removeRandomDemoOrder(randomPair);
    }
  }

  // Add a random demo order
  async addRandomDemoOrder(pair) {
    try {
      const currentPrice = await this.getCurrentPrice(pair) || 1000;
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      
      // Random price variation: ±2% from current price
      const priceMultiplier = side === 'buy' 
        ? 0.98 - Math.random() * 0.02  // 0.96 - 0.98 for buys
        : 1.02 + Math.random() * 0.02; // 1.02 - 1.04 for sells
        
      const price = parseFloat((currentPrice * priceMultiplier).toFixed(this.getPriceDecimals(currentPrice)));
      const quantity = this.getRandomQuantity(pair);
      
      const order = {
        pair,
        side,
        type: 'limit',
        quantity,
        price,
        userId: `${this.demoUserId}_refresh_${Date.now()}`
      };

      orderBookManager.addOrder(order);
      console.log(`Added random demo ${side} order for ${pair}: ${quantity} at $${price}`);
    } catch (error) {
      console.error('Error adding random demo order:', error);
    }
  }

  // Remove a random demo order (simulate order cancellation)
  removeRandomDemoOrder(pair) {
    try {
      const orderbook = orderBookManager.getOrderBook(pair, 50);
      const allOrders = [...orderbook.bids, ...orderbook.asks];
      
      if (allOrders.length === 0) return;
      
      // Find demo orders only
      const demoOrders = orderBookManager.orders;
      const demoOrderIds = [];
      
      for (const [orderId, order] of demoOrders) {
        if (order.pair === pair && order.userId.includes(this.demoUserId)) {
          demoOrderIds.push(orderId);
        }
      }
      
      if (demoOrderIds.length > 8) { // Keep minimum 8 orders per pair
        const randomOrderId = demoOrderIds[Math.floor(Math.random() * demoOrderIds.length)];
        orderBookManager.cancelOrder(randomOrderId, orderBookManager.orders.get(randomOrderId).userId);
        console.log(`Cancelled random demo order ${randomOrderId} for ${pair}`);
      }
    } catch (error) {
      console.error('Error removing random demo order:', error);
    }
  }

  // Get statistics
  getDemoStats() {
    const stats = {
      totalDemoOrders: 0,
      demoOrdersByPair: {}
    };

    for (const [orderId, order] of orderBookManager.orders) {
      if (order.userId.includes(this.demoUserId)) {
        stats.totalDemoOrders++;
        if (!stats.demoOrdersByPair[order.pair]) {
          stats.demoOrdersByPair[order.pair] = 0;
        }
        stats.demoOrdersByPair[order.pair]++;
      }
    }

    return stats;
  }
}

module.exports = new DemoOrdersManager();
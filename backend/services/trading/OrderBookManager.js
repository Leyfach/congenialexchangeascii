class OrderBookManager {
  constructor() {
    // Map of trading pairs to their order books
    this.orderBooks = new Map();
    // Map of order ID to order details for quick lookup
    this.orders = new Map();
    // Map of user ID to their active orders
    this.userOrders = new Map();
    
    this.listeners = new Set(); // WebSocket listeners
  }

  // Initialize order book for a trading pair
  initializeOrderBook(pair) {
    if (!this.orderBooks.has(pair)) {
      this.orderBooks.set(pair, {
        bids: [], // Buy orders, highest price first
        asks: []  // Sell orders, lowest price first
      });
    }
  }

  // Add a new order to the order book
  addOrder(order) {
    const { pair, side, price, quantity, userId, type } = order;
    
    this.initializeOrderBook(pair);
    
    // Generate unique order ID
    const orderId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullOrder = {
      id: orderId,
      userId,
      pair,
      side, // 'buy' or 'sell'
      type, // 'limit', 'market', 'stop_loss'
      price: parseFloat(price),
      originalQuantity: parseFloat(quantity),
      quantity: parseFloat(quantity), // Remaining quantity
      filled: 0,
      status: 'open',
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    // Store order
    this.orders.set(orderId, fullOrder);
    
    // Add to user orders
    if (!this.userOrders.has(userId)) {
      this.userOrders.set(userId, new Set());
    }
    this.userOrders.get(userId).add(orderId);

    // For market orders, execute immediately
    if (type === 'market') {
      return this.executeMarketOrder(fullOrder);
    }

    // For limit orders, add to order book
    if (type === 'limit') {
      this.addLimitOrderToBook(fullOrder);
      // Try to match immediately
      this.matchOrders(pair);
    }

    this.notifyListeners('orderbook_update', pair);
    this.notifyListeners('user_order_update', userId);
    
    return { success: true, order: fullOrder };
  }

  // Add limit order to the appropriate side of order book
  addLimitOrderToBook(order) {
    const orderBook = this.orderBooks.get(order.pair);
    
    if (order.side === 'buy') {
      // Insert in bids, maintain price-time priority (highest price first, then FIFO)
      orderBook.bids.push(order);
      orderBook.bids.sort((a, b) => {
        if (b.price === a.price) {
          return a.timestamp - b.timestamp; // FIFO for same price
        }
        return b.price - a.price; // Highest price first
      });
    } else {
      // Insert in asks, maintain price-time priority (lowest price first, then FIFO)
      orderBook.asks.push(order);
      orderBook.asks.sort((a, b) => {
        if (a.price === b.price) {
          return a.timestamp - b.timestamp; // FIFO for same price
        }
        return a.price - b.price; // Lowest price first
      });
    }
  }

  // Execute market order immediately against existing orders
  executeMarketOrder(order) {
    const orderBook = this.orderBooks.get(order.pair);
    const trades = [];
    let remainingQuantity = order.quantity;

    // Check if there are any orders to match against
    const hasMatchingOrders = (order.side === 'buy' && orderBook.asks.length > 0) ||
                             (order.side === 'sell' && orderBook.bids.length > 0);
    
    if (!hasMatchingOrders) {
      // No orders to match against - reject the market order
      order.status = 'rejected';
      return { 
        success: false, 
        order, 
        trades: [], 
        error: `No ${order.side === 'buy' ? 'sell' : 'buy'} orders available to match market order` 
      };
    }

    // Market buy: match against asks (sell orders)
    if (order.side === 'buy') {
      while (remainingQuantity > 0 && orderBook.asks.length > 0) {
        const bestAsk = orderBook.asks[0];
        const tradeQuantity = Math.min(remainingQuantity, bestAsk.quantity);
        
        // Execute trade
        const trade = this.executeTrade(order, bestAsk, tradeQuantity, bestAsk.price);
        trades.push(trade);
        
        remainingQuantity -= tradeQuantity;
        bestAsk.quantity -= tradeQuantity;
        bestAsk.filled += tradeQuantity;
        
        // Remove order if fully filled
        if (bestAsk.quantity <= 0) {
          this.removeOrderFromBook(bestAsk);
          bestAsk.status = 'filled';
        }
      }
    } 
    // Market sell: match against bids (buy orders)
    else {
      while (remainingQuantity > 0 && orderBook.bids.length > 0) {
        const bestBid = orderBook.bids[0];
        const tradeQuantity = Math.min(remainingQuantity, bestBid.quantity);
        
        // Execute trade - order is sell, bestBid is buy
        const trade = this.executeTrade(bestBid, order, tradeQuantity, bestBid.price);
        trades.push(trade);
        
        remainingQuantity -= tradeQuantity;
        bestBid.quantity -= tradeQuantity;
        bestBid.filled += tradeQuantity;
        
        // Remove order if fully filled
        if (bestBid.quantity <= 0) {
          this.removeOrderFromBook(bestBid);
          bestBid.status = 'filled';
        }
      }
    }

    // Update market order status
    order.filled = order.originalQuantity - remainingQuantity;
    order.quantity = remainingQuantity;
    order.status = remainingQuantity === 0 ? 'filled' : 'partial';

    this.notifyListeners('trades', { pair: order.pair, trades });
    this.notifyListeners('orderbook_update', order.pair);
    
    return { success: true, order, trades };
  }

  // Match orders in the order book
  matchOrders(pair) {
    const orderBook = this.orderBooks.get(pair);
    if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return;
    }

    const trades = [];

    while (orderBook.bids.length > 0 && orderBook.asks.length > 0) {
      const bestBid = orderBook.bids[0];
      const bestAsk = orderBook.asks[0];

      // No match if bid price < ask price
      if (bestBid.price < bestAsk.price) {
        break;
      }

      // Match found - execute trade
      const tradeQuantity = Math.min(bestBid.quantity, bestAsk.quantity);
      const tradePrice = bestAsk.price; // Price priority to maker (ask came first)
      
      const trade = this.executeTrade(bestBid, bestAsk, tradeQuantity, tradePrice);
      trades.push(trade);

      // Update orders
      bestBid.quantity -= tradeQuantity;
      bestBid.filled += tradeQuantity;
      bestAsk.quantity -= tradeQuantity;
      bestAsk.filled += tradeQuantity;

      // Remove fully filled orders
      if (bestBid.quantity <= 0) {
        this.removeOrderFromBook(bestBid);
        bestBid.status = 'filled';
      }
      if (bestAsk.quantity <= 0) {
        this.removeOrderFromBook(bestAsk);
        bestAsk.status = 'filled';
      }
    }

    if (trades.length > 0) {
      this.notifyListeners('trades', { pair, trades });
      this.notifyListeners('orderbook_update', pair);
    }
  }

  // Execute a trade between two orders
  executeTrade(buyOrder, sellOrder, quantity, price) {
    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pair: buyOrder.pair,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyUserId: buyOrder.userId,
      sellUserId: sellOrder.userId,
      quantity: quantity,
      price: price,
      total: quantity * price,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    // Update balances for real users (not demo users)
    try {
      this.updateUserBalances(trade);
      this.recordTradeInDatabase(trade);
    } catch (error) {
      console.error('Error updating balances/recording trade:', error);
    }

    // Notify both users
    this.notifyListeners('user_trade', trade.buyUserId, trade);
    this.notifyListeners('user_trade', trade.sellUserId, trade);
    
    return trade;
  }

  // Update user balances after trade execution
  updateUserBalances(trade) {
    const { dbOps } = require('../../database/db');
    const [baseCurrency, quoteCurrency] = trade.pair.split('/');
    
    // Only update balances for real users (not demo users)
    if (!trade.buyUserId.includes('demo_user') && trade.buyUserId !== 'demo_user') {
      try {
        // Get current balances
        let baseBalance = dbOps.getBalance.get(trade.buyUserId, baseCurrency);
        let quoteBalance = dbOps.getBalance.get(trade.buyUserId, quoteCurrency);
        
        // Initialize balances if they don't exist
        if (!baseBalance) {
          dbOps.insertBalance.run(trade.buyUserId, baseCurrency, 0, 0);
          baseBalance = { balance: 0, available: 0 };
        }
        if (!quoteBalance) {
          dbOps.insertBalance.run(trade.buyUserId, quoteCurrency, 0, 0);
          quoteBalance = { balance: 0, available: 0 };
        }
        
        // Update buyer balances: +base, -quote
        dbOps.updateBalance.run(
          baseBalance.balance + trade.quantity,
          baseBalance.available + trade.quantity,
          trade.buyUserId,
          baseCurrency
        );
        
        dbOps.updateBalance.run(
          quoteBalance.balance - trade.total,
          quoteBalance.available - trade.total,
          trade.buyUserId,
          quoteCurrency
        );
        
        console.log(`Updated buyer ${trade.buyUserId} balances: +${trade.quantity} ${baseCurrency}, -${trade.total} ${quoteCurrency}`);
      } catch (error) {
        console.error(`Error updating buyer balances for ${trade.buyUserId}:`, error);
      }
    }
    
    if (!trade.sellUserId.includes('demo_user') && trade.sellUserId !== 'demo_user') {
      try {
        // Get current balances
        let baseBalance = dbOps.getBalance.get(trade.sellUserId, baseCurrency);
        let quoteBalance = dbOps.getBalance.get(trade.sellUserId, quoteCurrency);
        
        // Initialize balances if they don't exist
        if (!baseBalance) {
          dbOps.insertBalance.run(trade.sellUserId, baseCurrency, 0, 0);
          baseBalance = { balance: 0, available: 0 };
        }
        if (!quoteBalance) {
          dbOps.insertBalance.run(trade.sellUserId, quoteCurrency, 0, 0);
          quoteBalance = { balance: 0, available: 0 };
        }
        
        // Update seller balances: -base, +quote
        dbOps.updateBalance.run(
          baseBalance.balance - trade.quantity,
          baseBalance.available - trade.quantity,
          trade.sellUserId,
          baseCurrency
        );
        
        dbOps.updateBalance.run(
          quoteBalance.balance + trade.total,
          quoteBalance.available + trade.total,
          trade.sellUserId,
          quoteCurrency
        );
        
        console.log(`Updated seller ${trade.sellUserId} balances: -${trade.quantity} ${baseCurrency}, +${trade.total} ${quoteCurrency}`);
      } catch (error) {
        console.error(`Error updating seller balances for ${trade.sellUserId}:`, error);
      }
    }
  }

  // Record trade in database
  recordTradeInDatabase(trade) {
    const { dbOps } = require('../../database/db');
    
    try {
      // Only record trades involving real users
      if (!trade.buyUserId.includes('demo_user') || !trade.sellUserId.includes('demo_user')) {
        // Create order records if they don't exist (for demo orders)
        const buyOrderExists = this.orders.has(trade.buyOrderId);
        const sellOrderExists = this.orders.has(trade.sellOrderId);
        
        let buyOrderRowId = null;
        let sellOrderRowId = null;
        
        if (buyOrderExists && !trade.buyUserId.includes('demo_user')) {
          try {
            const buyOrder = this.orders.get(trade.buyOrderId);
            const result = dbOps.createOrder.run(
              trade.buyUserId, 
              trade.buyOrderId, 
              trade.pair, 
              'buy', 
              'market', // Simplify for demo
              trade.quantity, 
              trade.price, 
              'filled', 
              buyOrder.createdAt
            );
            buyOrderRowId = result.lastInsertRowid;
          } catch (error) {
            console.log('Buy order may already exist in DB');
          }
        }
        
        if (sellOrderExists && !trade.sellUserId.includes('demo_user')) {
          try {
            const sellOrder = this.orders.get(trade.sellOrderId);
            const result = dbOps.createOrder.run(
              trade.sellUserId, 
              trade.sellOrderId, 
              trade.pair, 
              'sell', 
              'limit', // Demo orders are typically limit
              trade.quantity, 
              trade.price, 
              'filled', 
              sellOrder.createdAt
            );
            sellOrderRowId = result.lastInsertRowid;
          } catch (error) {
            console.log('Sell order may already exist in DB');
          }
        }
        
        // Record the trade - use the buyer's ID for the trade record
        const tradeUserId = !trade.buyUserId.includes('demo_user') ? trade.buyUserId : trade.sellUserId;
        let tradeOrderId = buyOrderRowId || sellOrderRowId;
        
        // If no valid order ID, create a temporary order entry for the trade
        if (!tradeOrderId) {
          try {
            const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const result = dbOps.createOrder.run(
              tradeUserId,
              tempOrderId,
              trade.pair,
              !trade.buyUserId.includes('demo_user') ? 'buy' : 'sell',
              'market',
              trade.quantity,
              trade.price,
              'filled',
              new Date().toISOString()
            );
            tradeOrderId = result.lastInsertRowid;
          } catch (error) {
            console.error('Failed to create temporary order for trade:', error);
            return; // Skip trade recording if we can't create the order
          }
        }
        
        dbOps.createTrade.run(
          tradeUserId,
          tradeOrderId,
          trade.pair,
          !trade.buyUserId.includes('demo_user') ? 'buy' : 'sell',
          trade.quantity,
          trade.price,
          trade.total
        );
        
        console.log(`Recorded trade in database for user ${tradeUserId}: ${trade.quantity} ${trade.pair} at $${trade.price}`);
      }
    } catch (error) {
      console.error('Error recording trade in database:', error);
    }
  }

  // Remove order from order book
  removeOrderFromBook(order) {
    const orderBook = this.orderBooks.get(order.pair);
    
    if (order.side === 'buy') {
      const index = orderBook.bids.findIndex(o => o.id === order.id);
      if (index !== -1) {
        orderBook.bids.splice(index, 1);
      }
    } else {
      const index = orderBook.asks.findIndex(o => o.id === order.id);
      if (index !== -1) {
        orderBook.asks.splice(index, 1);
      }
    }
  }

  // Cancel an order
  cancelOrder(orderId, userId) {
    const order = this.orders.get(orderId);
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (order.status !== 'open' && order.status !== 'partial') {
      return { success: false, error: 'Order cannot be cancelled' };
    }

    // Remove from order book
    this.removeOrderFromBook(order);
    
    // Update order status
    order.status = 'cancelled';
    
    // Remove from user orders
    const userOrderSet = this.userOrders.get(userId);
    if (userOrderSet) {
      userOrderSet.delete(orderId);
    }

    this.notifyListeners('orderbook_update', order.pair);
    this.notifyListeners('user_order_update', userId);

    return { success: true, order };
  }

  // Get order book for display
  getOrderBook(pair, depth = 20) {
    this.initializeOrderBook(pair);
    const orderBook = this.orderBooks.get(pair);
    
    return {
      bids: orderBook.bids.slice(0, depth).map(order => ({
        price: order.price,
        quantity: order.quantity,
        total: order.price * order.quantity
      })),
      asks: orderBook.asks.slice(0, depth).map(order => ({
        price: order.price,
        quantity: order.quantity,  
        total: order.price * order.quantity
      }))
    };
  }

  // Get user's active orders
  getUserOrders(userId) {
    const userOrderIds = this.userOrders.get(userId) || new Set();
    const orders = [];
    
    for (const orderId of userOrderIds) {
      const order = this.orders.get(orderId);
      if (order && (order.status === 'open' || order.status === 'partial')) {
        orders.push(order);
      }
    }
    
    return orders.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Add WebSocket listener
  addListener(listener) {
    this.listeners.add(listener);
  }

  // Remove WebSocket listener
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  // Notify all listeners
  notifyListeners(event, data, userId = null) {
    for (const listener of this.listeners) {
      try {
        listener(event, data, userId);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    }
  }

  // Get order statistics
  getStats() {
    return {
      totalOrders: this.orders.size,
      activeOrders: Array.from(this.orders.values()).filter(o => 
        o.status === 'open' || o.status === 'partial'
      ).length,
      orderBooks: this.orderBooks.size,
      listeners: this.listeners.size
    };
  }
}

module.exports = new OrderBookManager();
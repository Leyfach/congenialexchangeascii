const OrderModel = require('../order/orderModel');
const WalletModel = require('../wallet/walletModel');

// In-memory order book for real-time matching
let memoryOrderBook = {
  // Format: { tradingPairId: { bids: [], asks: [] } }
  1: { // BTC/USD
    bids: [
      { id: 'demo-bid-1', user_id: 999, price: 64800, quantity: 0.25, filled_quantity: 0 },
      { id: 'demo-bid-2', user_id: 999, price: 64750, quantity: 0.5, filled_quantity: 0 },
      { id: 'demo-bid-3', user_id: 999, price: 64700, quantity: 1.0, filled_quantity: 0 },
      { id: 'demo-bid-4', user_id: 999, price: 64650, quantity: 0.75, filled_quantity: 0 },
      { id: 'demo-bid-5', user_id: 999, price: 64600, quantity: 2.0, filled_quantity: 0 }
    ],
    asks: [
      { id: 'demo-ask-1', user_id: 999, price: 64900, quantity: 0.3, filled_quantity: 0 },
      { id: 'demo-ask-2', user_id: 999, price: 64950, quantity: 0.8, filled_quantity: 0 },
      { id: 'demo-ask-3', user_id: 999, price: 65000, quantity: 1.2, filled_quantity: 0 },
      { id: 'demo-ask-4', user_id: 999, price: 65050, quantity: 0.6, filled_quantity: 0 },
      { id: 'demo-ask-5', user_id: 999, price: 65100, quantity: 1.5, filled_quantity: 0 }
    ]
  },
  2: { // ETH/USD
    bids: [
      { id: 'demo-bid-eth-1', user_id: 999, price: 3180, quantity: 2.0, filled_quantity: 0 },
      { id: 'demo-bid-eth-2', user_id: 999, price: 3170, quantity: 3.5, filled_quantity: 0 },
      { id: 'demo-bid-eth-3', user_id: 999, price: 3160, quantity: 5.0, filled_quantity: 0 },
      { id: 'demo-bid-eth-4', user_id: 999, price: 3150, quantity: 2.8, filled_quantity: 0 },
      { id: 'demo-bid-eth-5', user_id: 999, price: 3140, quantity: 4.2, filled_quantity: 0 }
    ],
    asks: [
      { id: 'demo-ask-eth-1', user_id: 999, price: 3220, quantity: 1.8, filled_quantity: 0 },
      { id: 'demo-ask-eth-2', user_id: 999, price: 3230, quantity: 2.5, filled_quantity: 0 },
      { id: 'demo-ask-eth-3', user_id: 999, price: 3240, quantity: 3.0, filled_quantity: 0 },
      { id: 'demo-ask-eth-4', user_id: 999, price: 3250, quantity: 1.5, filled_quantity: 0 },
      { id: 'demo-ask-eth-5', user_id: 999, price: 3260, quantity: 2.2, filled_quantity: 0 }
    ]
  },
  3: { // BNB/USD
    bids: [
      { id: 'demo-bid-bnb-1', user_id: 999, price: 590, quantity: 5.0, filled_quantity: 0 },
      { id: 'demo-bid-bnb-2', user_id: 999, price: 585, quantity: 8.0, filled_quantity: 0 },
      { id: 'demo-bid-bnb-3', user_id: 999, price: 580, quantity: 12.0, filled_quantity: 0 },
      { id: 'demo-bid-bnb-4', user_id: 999, price: 575, quantity: 6.5, filled_quantity: 0 },
      { id: 'demo-bid-bnb-5', user_id: 999, price: 570, quantity: 10.0, filled_quantity: 0 }
    ],
    asks: [
      { id: 'demo-ask-bnb-1', user_id: 999, price: 610, quantity: 4.0, filled_quantity: 0 },
      { id: 'demo-ask-bnb-2', user_id: 999, price: 615, quantity: 7.0, filled_quantity: 0 },
      { id: 'demo-ask-bnb-3', user_id: 999, price: 620, quantity: 9.0, filled_quantity: 0 },
      { id: 'demo-ask-bnb-4', user_id: 999, price: 625, quantity: 5.5, filled_quantity: 0 },
      { id: 'demo-ask-bnb-5', user_id: 999, price: 630, quantity: 8.5, filled_quantity: 0 }
    ]
  }
};

class TradingEngine {
  // Add order to the order book and try to match it
  static async processOrder(userId, tradingPairId, side, quantity, price, type = 'limit') {
    try {
      // Validate user has sufficient balance
      const hasBalance = await this.validateBalance(userId, tradingPairId, side, quantity, price);
      if (!hasBalance) {
        throw new Error('Insufficient balance');
      }

      // Create order in database/memory
      const order = await OrderModel.create(userId, tradingPairId, side, quantity, price, type);
      
      // Add to order book
      this.addToOrderBook(order);
      
      // Try to match the order
      const matchResult = await this.matchOrder(order);
      
      return { order, trades: matchResult.trades };
    } catch (error) {
      console.error('Order processing error:', error);
      throw error;
    }
  }

  // Validate user has sufficient balance for the order
  static async validateBalance(userId, tradingPairId, side, quantity, price) {
    try {
      if (side === 'buy') {
        // For buy orders, check quote currency (USD) balance
        const quoteCurrency = 'USD'; // Simplified - in real app, get from trading pair
        const requiredBalance = quantity * price;
        const balance = await WalletModel.getBalance(userId, quoteCurrency);
        return balance >= requiredBalance;
      } else {
        // For sell orders, check base currency balance
        const baseCurrency = tradingPairId === 1 ? 'BTC' : tradingPairId === 2 ? 'ETH' : 'BNB';
        const balance = await WalletModel.getBalance(userId, baseCurrency);
        return balance >= quantity;
      }
    } catch (error) {
      console.error('Balance validation error:', error);
      return false;
    }
  }

  // Add order to the in-memory order book
  static addToOrderBook(order) {
    if (!memoryOrderBook[order.trading_pair_id]) {
      memoryOrderBook[order.trading_pair_id] = { bids: [], asks: [] };
    }

    const book = memoryOrderBook[order.trading_pair_id];
    
    if (order.side === 'buy') {
      // Add to bids, sorted by price DESC
      book.bids.push(order);
      book.bids.sort((a, b) => b.price - a.price);
    } else {
      // Add to asks, sorted by price ASC
      book.asks.push(order);
      book.asks.sort((a, b) => a.price - b.price);
    }
  }

  // Try to match an order against existing orders
  static async matchOrder(newOrder) {
    const trades = [];
    const book = memoryOrderBook[newOrder.trading_pair_id];
    if (!book) return { trades };

    let remainingQuantity = newOrder.quantity;
    
    // For market orders, we want to match immediately at any reasonable price
    const isMarketOrder = newOrder.order_type === 'market';
    
    if (newOrder.side === 'buy') {
      // Match buy order against asks (sell orders)
      for (let i = 0; i < book.asks.length && remainingQuantity > 0; i++) {
        const askOrder = book.asks[i];
        
        // For market orders, accept any price. For limit orders, check price
        if (!isMarketOrder && newOrder.price < askOrder.price) break;
        
        // Calculate trade quantity
        const tradeQuantity = Math.min(remainingQuantity, askOrder.quantity - (askOrder.filled_quantity || 0));
        
        if (tradeQuantity > 0) {
          // Execute trade
          const trade = await this.executeTrade(newOrder, askOrder, tradeQuantity, askOrder.price);
          trades.push(trade);
          
          remainingQuantity -= tradeQuantity;
          
          // Update filled quantities
          newOrder.filled_quantity = (newOrder.filled_quantity || 0) + tradeQuantity;
          askOrder.filled_quantity = (askOrder.filled_quantity || 0) + tradeQuantity;
          
          // Remove completely filled orders
          if (askOrder.filled_quantity >= askOrder.quantity) {
            book.asks.splice(i, 1);
            i--; // Adjust index since we removed an element
          }
        }
      }
    } else {
      // Match sell order against bids (buy orders)
      for (let i = 0; i < book.bids.length && remainingQuantity > 0; i++) {
        const bidOrder = book.bids[i];
        
        // For market orders, accept any price. For limit orders, check price
        if (!isMarketOrder && newOrder.price > bidOrder.price) break;
        
        // Calculate trade quantity
        const tradeQuantity = Math.min(remainingQuantity, bidOrder.quantity - (bidOrder.filled_quantity || 0));
        
        if (tradeQuantity > 0) {
          // Execute trade
          const trade = await this.executeTrade(bidOrder, newOrder, tradeQuantity, bidOrder.price);
          trades.push(trade);
          
          remainingQuantity -= tradeQuantity;
          
          // Update filled quantities
          newOrder.filled_quantity = (newOrder.filled_quantity || 0) + tradeQuantity;
          bidOrder.filled_quantity = (bidOrder.filled_quantity || 0) + tradeQuantity;
          
          // Remove completely filled orders
          if (bidOrder.filled_quantity >= bidOrder.quantity) {
            book.bids.splice(i, 1);
            i--; // Adjust index since we removed an element
          }
        }
      }
    }

    // Update order status
    if (newOrder.filled_quantity >= newOrder.quantity) {
      newOrder.status = 'filled';
    } else if (newOrder.filled_quantity > 0) {
      newOrder.status = 'partial';
    }

    return { trades };
  }

  // Execute a trade between two orders
  static async executeTrade(buyOrder, sellOrder, quantity, price) {
    const trade = {
      id: Date.now(), // Simple ID generation
      buy_order_id: buyOrder.id,
      sell_order_id: sellOrder.id,
      buy_user_id: buyOrder.user_id,
      sell_user_id: sellOrder.user_id,
      trading_pair_id: buyOrder.trading_pair_id,
      quantity,
      price,
      total: quantity * price,
      created_at: new Date().toISOString()
    };

    // Update wallet balances
    await this.updateWalletBalances(trade);
    
    return trade;
  }

  // Update wallet balances after a trade
  static async updateWalletBalances(trade) {
    try {
      const baseCurrency = trade.trading_pair_id === 1 ? 'BTC' : trade.trading_pair_id === 2 ? 'ETH' : 'BNB';
      const quoteCurrency = 'USD';
      
      // Buyer: lose quote currency, gain base currency
      await WalletModel.updateBalance(trade.buy_user_id, quoteCurrency, -trade.total);
      await WalletModel.updateBalance(trade.buy_user_id, baseCurrency, trade.quantity);
      
      // Seller: lose base currency, gain quote currency
      await WalletModel.updateBalance(trade.sell_user_id, baseCurrency, -trade.quantity);
      await WalletModel.updateBalance(trade.sell_user_id, quoteCurrency, trade.total);
      
      console.log(`Trade executed: ${trade.quantity} ${baseCurrency} at ${trade.price} ${quoteCurrency}`);
    } catch (error) {
      console.error('Error updating wallet balances:', error);
      throw error;
    }
  }

  // Get current order book for a trading pair
  static getOrderBook(tradingPairId, limit = 10) {
    const book = memoryOrderBook[tradingPairId];
    if (!book) {
      return { bids: [], asks: [] };
    }

    return {
      bids: book.bids.slice(0, limit).map(order => ({
        price: order.price,
        quantity: order.quantity - (order.filled_quantity || 0)
      })).filter(order => order.quantity > 0),
      asks: book.asks.slice(0, limit).map(order => ({
        price: order.price,
        quantity: order.quantity - (order.filled_quantity || 0)
      })).filter(order => order.quantity > 0)
    };
  }

  // Get current market price for a trading pair (mid-point between best bid and ask)
  static getOrderBookPrice(tradingPairId) {
    const book = memoryOrderBook[tradingPairId];
    if (!book) {
      return 0;
    }

    const bestBid = book.bids.length > 0 ? book.bids[0].price : 0;
    const bestAsk = book.asks.length > 0 ? book.asks[0].price : 0;

    if (bestBid > 0 && bestAsk > 0) {
      // Return mid-point price
      return (bestBid + bestAsk) / 2;
    } else if (bestBid > 0) {
      return bestBid;
    } else if (bestAsk > 0) {
      return bestAsk;
    } else {
      return 0;
    }
  }

  // Cancel an order
  static async cancelOrder(orderId, userId) {
    try {
      // Find and remove order from order book
      for (const tradingPairId in memoryOrderBook) {
        const book = memoryOrderBook[tradingPairId];
        
        // Check bids
        const bidIndex = book.bids.findIndex(order => order.id === parseInt(orderId) && order.user_id === userId);
        if (bidIndex > -1) {
          book.bids.splice(bidIndex, 1);
          break;
        }
        
        // Check asks
        const askIndex = book.asks.findIndex(order => order.id === parseInt(orderId) && order.user_id === userId);
        if (askIndex > -1) {
          book.asks.splice(askIndex, 1);
          break;
        }
      }
      
      // Delete from database/memory storage
      return await OrderModel.delete(orderId);
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
}

module.exports = TradingEngine;
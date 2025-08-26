const pool = require('../../shared/config/database');

// In-memory fallback storage
let memoryTradingPairs = [
  { id: 1, base_currency: 'BTC', quote_currency: 'USD', is_active: true },
  { id: 2, base_currency: 'ETH', quote_currency: 'USD', is_active: true },
  { id: 3, base_currency: 'BNB', quote_currency: 'USD', is_active: true }
];

class MarketModel {
  static async getTradingPairs() {
    try {
      const query = `
        SELECT id, base_currency, quote_currency, is_active 
        FROM trading_pairs 
        WHERE is_active = true
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.log('Database not available, using in-memory trading pairs');
      return memoryTradingPairs;
    }
  }

  static async findTradingPairBySymbol(baseSymbol, quoteSymbol) {
    try {
      const query = `
        SELECT * FROM trading_pairs 
        WHERE base_currency = $1 AND quote_currency = $2 AND is_active = true
      `;
      const result = await pool.query(query, [baseSymbol, quoteSymbol]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory trading pairs');
      return memoryTradingPairs.find(pair => 
        pair.base_currency === baseSymbol && 
        pair.quote_currency === quoteSymbol && 
        pair.is_active
      );
    }
  }

  static async getOrderBook(tradingPairId, limit = 10) {
    const buyQuery = `
      SELECT price, SUM(quantity - filled_quantity) as quantity
      FROM orders 
      WHERE trading_pair_id = $1 AND side = 'buy' AND status = 'pending'
      GROUP BY price 
      ORDER BY price DESC 
      LIMIT $2
    `;
    
    const sellQuery = `
      SELECT price, SUM(quantity - filled_quantity) as quantity
      FROM orders 
      WHERE trading_pair_id = $1 AND side = 'sell' AND status = 'pending'
      GROUP BY price 
      ORDER BY price ASC 
      LIMIT $2
    `;

    const [buyOrders, sellOrders] = await Promise.all([
      pool.query(buyQuery, [tradingPairId, limit]),
      pool.query(sellQuery, [tradingPairId, limit])
    ]);

    return {
      bids: buyOrders.rows,
      asks: sellOrders.rows
    };
  }

  static async getRecentTrades(tradingPairId, limit = 50) {
    const query = `
      SELECT quantity, price, created_at
      FROM trades 
      WHERE trading_pair_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [tradingPairId, limit]);
    return result.rows;
  }
}

module.exports = MarketModel;
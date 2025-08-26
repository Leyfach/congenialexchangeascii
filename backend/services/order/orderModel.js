const pool = require('../../shared/config/database');

// In-memory fallback storage
let memoryOrders = [];
let nextOrderId = 1;

class OrderModel {
  static async create(userId, tradingPairId, side, quantity, price, type = 'limit') {
    try {
      const query = `
        INSERT INTO orders (user_id, trading_pair_id, side, quantity, price, order_type) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `;
      const result = await pool.query(query, [userId, tradingPairId, side, quantity, price, type]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory order storage');
      const order = {
        id: nextOrderId++,
        user_id: userId,
        trading_pair_id: tradingPairId,
        side,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        order_type: type,
        status: 'pending',
        filled_quantity: 0,
        created_at: new Date().toISOString(),
        // Add trading pair info for fallback
        base_currency: tradingPairId === 1 ? 'BTC' : tradingPairId === 2 ? 'ETH' : 'BNB',
        quote_currency: 'USD'
      };
      memoryOrders.push(order);
      return order;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT o.*, tp.base_currency, tp.quote_currency 
        FROM orders o
        JOIN trading_pairs tp ON o.trading_pair_id = tp.id
        WHERE o.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory order storage');
      return memoryOrders.find(order => order.id === parseInt(id));
    }
  }

  static async findByUserId(userId) {
    try {
      const query = `
        SELECT o.*, tp.base_currency, tp.quote_currency 
        FROM orders o
        JOIN trading_pairs tp ON o.trading_pair_id = tp.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.log('Database not available, using in-memory order storage');
      return memoryOrders
        .filter(order => order.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  static async getAll() {
    const query = `
      SELECT o.*, tp.base_currency, tp.quote_currency 
      FROM orders o
      JOIN trading_pairs tp ON o.trading_pair_id = tp.id
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    try {
      const query = 'DELETE FROM orders WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory order storage');
      const index = memoryOrders.findIndex(order => order.id === parseInt(id));
      if (index > -1) {
        const deletedOrder = memoryOrders[index];
        memoryOrders.splice(index, 1);
        return deletedOrder;
      }
      return null;
    }
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = OrderModel;
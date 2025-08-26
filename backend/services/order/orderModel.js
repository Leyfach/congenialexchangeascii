const pool = require('../../shared/config/database');

class OrderModel {
  static async create(userId, tradingPairId, side, quantity, price, type = 'limit') {
    const query = `
      INSERT INTO orders (user_id, trading_pair_id, side, quantity, price, order_type) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    const result = await pool.query(query, [userId, tradingPairId, side, quantity, price, type]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT o.*, tp.base_currency, tp.quote_currency 
      FROM orders o
      JOIN trading_pairs tp ON o.trading_pair_id = tp.id
      WHERE o.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = `
      SELECT o.*, tp.base_currency, tp.quote_currency 
      FROM orders o
      JOIN trading_pairs tp ON o.trading_pair_id = tp.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
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
    const query = 'DELETE FROM orders WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = OrderModel;
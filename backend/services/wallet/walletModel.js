const pool = require('../../shared/config/database');

class WalletModel {
  static async create(userId, currency, balance = 0) {
    const query = `
      INSERT INTO wallets (user_id, currency, balance) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (user_id, currency) 
      DO UPDATE SET balance = wallets.balance + $3
      RETURNING *
    `;
    const result = await pool.query(query, [userId, currency, balance]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM wallets WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByUserAndCurrency(userId, currency) {
    const query = 'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2';
    const result = await pool.query(query, [userId, currency]);
    return result.rows[0];
  }

  static async updateBalance(userId, currency, amount) {
    const query = `
      UPDATE wallets 
      SET balance = balance + $3 
      WHERE user_id = $1 AND currency = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [userId, currency, amount]);
    return result.rows[0];
  }

  static async getBalance(userId, currency) {
    const query = 'SELECT balance FROM wallets WHERE user_id = $1 AND currency = $2';
    const result = await pool.query(query, [userId, currency]);
    return result.rows[0]?.balance || 0;
  }
}

module.exports = WalletModel;
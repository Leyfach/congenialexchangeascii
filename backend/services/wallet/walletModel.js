const pool = require('../../shared/config/database');

// In-memory fallback storage
let memoryWallets = [];

class WalletModel {
  static async create(userId, currency, balance = 0) {
    try {
      const query = `
        INSERT INTO wallets (user_id, currency, balance) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, currency) 
        DO UPDATE SET balance = wallets.balance + $3
        RETURNING *
      `;
      const result = await pool.query(query, [userId, currency, balance]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory wallet storage');
      const existingWallet = memoryWallets.find(w => w.user_id === userId && w.currency === currency);
      if (existingWallet) {
        existingWallet.balance += balance;
        return existingWallet;
      } else {
        const wallet = {
          id: memoryWallets.length + 1,
          user_id: userId,
          currency,
          balance,
          created_at: new Date()
        };
        memoryWallets.push(wallet);
        return wallet;
      }
    }
  }

  static async findByUserId(userId) {
    try {
      const query = 'SELECT * FROM wallets WHERE user_id = $1';
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.log('Database not available, using in-memory wallet storage');
      return memoryWallets.filter(w => w.user_id === userId);
    }
  }

  static async findByUserAndCurrency(userId, currency) {
    try {
      const query = 'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2';
      const result = await pool.query(query, [userId, currency]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory wallet storage');
      return memoryWallets.find(w => w.user_id === userId && w.currency === currency);
    }
  }

  static async updateBalance(userId, currency, amount) {
    try {
      const query = `
        UPDATE wallets 
        SET balance = balance + $3 
        WHERE user_id = $1 AND currency = $2 
        RETURNING *
      `;
      const result = await pool.query(query, [userId, currency, amount]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory wallet storage');
      const wallet = memoryWallets.find(w => w.user_id === userId && w.currency === currency);
      if (wallet) {
        wallet.balance += amount;
        return wallet;
      }
      return null;
    }
  }

  static async getBalance(userId, currency) {
    try {
      const query = 'SELECT balance FROM wallets WHERE user_id = $1 AND currency = $2';
      const result = await pool.query(query, [userId, currency]);
      return result.rows[0]?.balance || 0;
    } catch (error) {
      console.log('Database not available, using in-memory wallet storage');
      const wallet = memoryWallets.find(w => w.user_id === userId && w.currency === currency);
      return wallet?.balance || 0;
    }
  }
}

module.exports = WalletModel;
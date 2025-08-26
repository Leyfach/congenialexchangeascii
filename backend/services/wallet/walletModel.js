const pool = require('../../shared/config/database');

// In-memory fallback storage
let memoryWallets = [
  // Add demo wallets for testing with user_id: 1
  { id: 1, user_id: 1, currency: 'USD', balance: 10000.0, created_at: new Date() },
  { id: 2, user_id: 1, currency: 'BTC', balance: 2.0, created_at: new Date() },
  { id: 3, user_id: 1, currency: 'ETH', balance: 10.0, created_at: new Date() },
  { id: 4, user_id: 1, currency: 'BNB', balance: 50.0, created_at: new Date() }
];

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
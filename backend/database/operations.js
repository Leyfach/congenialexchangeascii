const { PostgreSQLDatabase } = require('./postgres');

class DatabaseOperations {
  constructor() {
    this.db = new PostgreSQLDatabase();
  }

  async init() {
    await this.db.initDatabase();
  }

  // User operations
  async getUserByEmail(email) {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async getUserById(id) {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async createUser(email, username, passwordHash) {
    const result = await this.db.query(`
      INSERT INTO users (email, username, password_hash, verified) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, email, username, verified, created_at
    `, [email, username, passwordHash, false]);
    return result.rows[0];
  }

  // Balance operations
  async getUserBalances(userId) {
    const result = await this.db.query(`
      SELECT currency, balance, available, locked 
      FROM user_balances 
      WHERE user_id = $1
      ORDER BY currency
    `, [userId]);
    return result.rows;
  }

  async getBalance(userId, currency) {
    const result = await this.db.query(`
      SELECT balance, available, locked 
      FROM user_balances 
      WHERE user_id = $1 AND currency = $2
    `, [userId, currency]);
    return result.rows[0] || null;
  }

  async updateBalance(userId, currency, balance, available, locked = 0) {
    // First try to update existing balance
    const updateResult = await this.db.query(`
      UPDATE user_balances 
      SET balance = $3, available = $4, locked = $5, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND currency = $2
    `, [userId, currency, balance, available, locked]);

    // If no rows were updated, insert new balance
    if (updateResult.rowCount === 0) {
      await this.db.query(`
        INSERT INTO user_balances (user_id, currency, balance, available, locked)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, currency, balance, available, locked]);
    }

    // Log balance change for audit
    await this.logBalanceChange(userId, currency, balance, 'manual_update');
  }

  async logBalanceChange(userId, currency, newBalance, changeType, referenceId = null, referenceType = null) {
    const currentBalance = await this.getBalance(userId, currency);
    const previousBalance = currentBalance ? currentBalance.balance : 0;
    const changeAmount = newBalance - previousBalance;

    await this.db.query(`
      INSERT INTO balance_audit (user_id, currency, balance_before, balance_after, change_amount, change_type, reference_id, reference_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, currency, previousBalance, newBalance, changeAmount, changeType, referenceId, referenceType]);
  }

  // Order operations
  async createOrder(userId, orderId, pair, side, type, quantity, price, status = 'pending') {
    const result = await this.db.query(`
      INSERT INTO orders (user_id, order_id, pair, side, type, quantity, price, status, filled_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [userId, orderId, pair, side, type, quantity, price, status, status === 'filled' ? new Date() : null]);
    return result.rows[0];
  }

  async getUserOrders(userId, limit = 50) {
    const result = await this.db.query(`
      SELECT order_id, pair, side, type, quantity, price, filled_quantity, status, created_at, filled_at
      FROM orders 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  // Trade operations
  async createTrade(userId, orderDbId, pair, side, quantity, price, total, feeAmount = 0, feeCurrency = 'USD') {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await this.db.query(`
      INSERT INTO trades (user_id, order_id, trade_id, pair, side, quantity, price, total, fee_currency, fee_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [userId, orderDbId, tradeId, pair, side, quantity, price, total, feeCurrency, feeAmount]);
    
    return result.rows[0];
  }

  async getUserTrades(userId, limit = 50) {
    const result = await this.db.query(`
      SELECT trade_id as id, pair, side as type, quantity as amount, price, 
             total, fee_amount, fee_currency, created_at as timestamp, 'completed' as status
      FROM trades 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  // Wallet operations
  async createWallet(userId, network, currency, address, encryptedPrivateKey, publicKey) {
    // Ensure encryptedPrivateKey is properly stringified
    const encryptedKeyString = typeof encryptedPrivateKey === 'string' 
      ? encryptedPrivateKey 
      : JSON.stringify(encryptedPrivateKey);
      
    const result = await this.db.query(`
      INSERT INTO user_wallets (user_id, network, currency, address, private_key_encrypted, public_key)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, network, currency, address, encryptedKeyString, publicKey]);
    return result.rows[0];
  }

  async getUserWallets(userId) {
    const result = await this.db.query(`
      SELECT network, currency, address, public_key, is_active, created_at
      FROM user_wallets 
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY network, currency
    `, [userId]);
    return result.rows;
  }

  async getWalletByAddress(address) {
    const result = await this.db.query(`
      SELECT * FROM user_wallets 
      WHERE address = $1 AND is_active = TRUE
    `, [address]);
    return result.rows[0] || null;
  }

  async getWalletWithPrivateKey(userId, network, currency) {
    const result = await this.db.query(`
      SELECT id, user_id, network, currency, address, private_key_encrypted, public_key, created_at
      FROM user_wallets 
      WHERE user_id = $1 AND network = $2 AND currency = $3 AND is_active = TRUE
    `, [userId, network, currency]);
    
    if (result.rows[0]) {
      const wallet = result.rows[0];
      // Decrypt private key
      try {
        // Handle both string and object formats
        let encryptedData;
        if (typeof wallet.private_key_encrypted === 'string') {
          encryptedData = JSON.parse(wallet.private_key_encrypted);
        } else {
          encryptedData = wallet.private_key_encrypted; // Already an object
        }
        
        const decryptedPrivateKey = this.db.decrypt(encryptedData);
        
        return {
          ...wallet,
          private_key_decrypted: decryptedPrivateKey
        };
      } catch (error) {
        console.error('Error decrypting private key:', error);
        return wallet;
      }
    }
    
    return null;
  }

  // Deposit operations
  async createDeposit(userId, walletId, currency, amount, txHash = null, blockNumber = null, status = 'pending') {
    const result = await this.db.query(`
      INSERT INTO deposits (user_id, wallet_id, currency, amount, tx_hash, block_number, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [userId, walletId, currency, amount, txHash, blockNumber, status]);
    return result.rows[0];
  }

  async getUserDeposits(userId, limit = 50) {
    const result = await this.db.query(`
      SELECT d.*, w.address, w.network
      FROM deposits d
      JOIN user_wallets w ON d.wallet_id = w.id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  // Withdrawal operations
  async createWithdrawal(userId, currency, amount, destinationAddress, fee = 0, status = 'pending') {
    const result = await this.db.query(`
      INSERT INTO withdrawals (user_id, currency, amount, destination_address, exchange_fee, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, currency, amount, destinationAddress, fee, status]);
    return result.rows[0];
  }

  async getUserWithdrawals(userId, limit = 50) {
    const result = await this.db.query(`
      SELECT * FROM withdrawals 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  // Security operations
  async logSecurityEvent(userId, eventType, eventData, ipAddress, userAgent, status = 'success') {
    await this.db.query(`
      INSERT INTO security_logs (user_id, event_type, event_data, ip_address, user_agent, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, eventType, JSON.stringify(eventData), ipAddress, userAgent, status]);
  }

  async getUserSecurityLogs(userId, limit = 100) {
    const result = await this.db.query(`
      SELECT event_type, event_data, ip_address, status, created_at
      FROM security_logs 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  // Close database connection
  async close() {
    await this.db.close();
  }
}

module.exports = { DatabaseOperations };
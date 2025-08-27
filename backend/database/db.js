const Database = require('better-sqlite3');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'exchange.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
function initDatabase() {
  console.log('Initializing database...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User balances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      balance DECIMAL(20, 8) DEFAULT 0.0,
      available DECIMAL(20, 8) DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, currency)
    )
  `);

  // Orders table - Enhanced with advanced order types
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id TEXT UNIQUE NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
      type TEXT NOT NULL CHECK (type IN ('limit', 'market', 'stop_loss', 'take_profit', 'stop_limit', 'trailing_stop', 'iceberg', 'oco')),
      quantity DECIMAL(20, 8) NOT NULL,
      price DECIMAL(20, 8),
      stop_price DECIMAL(20, 8),
      trail_amount DECIMAL(20, 8),
      trail_percent DECIMAL(10, 4),
      iceberg_qty DECIMAL(20, 8),
      time_in_force TEXT DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
      oco_id TEXT,
      parent_order_id TEXT,
      reduce_only BOOLEAN DEFAULT FALSE,
      post_only BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'expired', 'triggered')),
      filled_quantity DECIMAL(20, 8) DEFAULT 0,
      avg_fill_price DECIMAL(20, 8),
      last_trigger_price DECIMAL(20, 8),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      filled_at DATETIME,
      triggered_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Trades table (executed trades)
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity DECIMAL(20, 8) NOT NULL,
      price DECIMAL(20, 8) NOT NULL,
      total DECIMAL(20, 8) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // User wallets table (crypto deposit addresses)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      network TEXT NOT NULL CHECK (network IN ('ethereum', 'solana', 'bitcoin')),
      currency TEXT NOT NULL,
      address TEXT NOT NULL,
      private_key_encrypted TEXT,
      public_key TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, network, currency)
    )
  `);

  // Deposits table (incoming transactions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      amount DECIMAL(20, 8) NOT NULL,
      tx_hash TEXT,
      block_number INTEGER,
      confirmations INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE
    )
  `);

  // Withdrawals table (outgoing transactions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      amount DECIMAL(20, 8) NOT NULL,
      destination_address TEXT NOT NULL,
      tx_hash TEXT,
      fee DECIMAL(20, 8) DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Price data table for caching API responses
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      price DECIMAL(20, 8) NOT NULL,
      change_24h DECIMAL(10, 4) DEFAULT 0,
      volume_24h DECIMAL(20, 8) DEFAULT 0,
      market_cap DECIMAL(20, 2) DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol)
    )
  `);

  // 2FA table for storing user TOTP secrets
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_2fa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      secret TEXT NOT NULL,
      enabled BOOLEAN DEFAULT FALSE,
      backup_codes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      enabled_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `);

  // Security logs table for tracking authentication events
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Margin accounts for leverage trading
  db.exec(`
    CREATE TABLE IF NOT EXISTS margin_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      base_currency TEXT NOT NULL,
      quote_currency TEXT NOT NULL,
      collateral DECIMAL(20, 8) DEFAULT 0,
      borrowed_base DECIMAL(20, 8) DEFAULT 0,
      borrowed_quote DECIMAL(20, 8) DEFAULT 0,
      interest_rate DECIMAL(10, 6) DEFAULT 0.001,
      liquidation_price DECIMAL(20, 8),
      margin_level DECIMAL(10, 4),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, base_currency, quote_currency)
    )
  `);

  // Position tracking for margin trading
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('long', 'short')),
      size DECIMAL(20, 8) NOT NULL,
      entry_price DECIMAL(20, 8) NOT NULL,
      leverage DECIMAL(10, 2) NOT NULL,
      margin DECIMAL(20, 8) NOT NULL,
      unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
      liquidation_price DECIMAL(20, 8),
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create demo user if not exists
  createDemoUser();
  
  // Initialize prepared statements after tables are created
  dbOps.getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  
  dbOps.getUserBalances = db.prepare(`
    SELECT currency, balance, available 
    FROM user_balances 
    WHERE user_id = ?
  `);
  
  dbOps.updateBalance = db.prepare(`
    UPDATE user_balances 
    SET balance = ?, available = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND currency = ?
  `);
  
  dbOps.createOrder = db.prepare(`
    INSERT INTO orders (user_id, order_id, pair, side, type, quantity, price, status, filled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  dbOps.createTrade = db.prepare(`
    INSERT INTO trades (user_id, order_id, pair, side, quantity, price, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  dbOps.getUserTrades = db.prepare(`
    SELECT pair, side as type, quantity as amount, price, 
           created_at as timestamp, 'completed' as status,
           ('trade_' || id) as id
    FROM trades 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `);
  
  dbOps.getBalance = db.prepare(`
    SELECT balance, available 
    FROM user_balances 
    WHERE user_id = ? AND currency = ?
  `);

  // Wallet operations
  dbOps.createWallet = db.prepare(`
    INSERT INTO user_wallets (user_id, network, currency, address, private_key_encrypted, public_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  dbOps.getUserWallets = db.prepare(`
    SELECT network, currency, address, public_key, is_active, created_at
    FROM user_wallets 
    WHERE user_id = ? AND is_active = 1
    ORDER BY network, currency
  `);

  dbOps.getWalletByAddress = db.prepare(`
    SELECT * FROM user_wallets 
    WHERE address = ? AND is_active = 1
  `);

  dbOps.createDeposit = db.prepare(`
    INSERT INTO deposits (user_id, wallet_id, currency, amount, tx_hash, block_number, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  dbOps.getUserDeposits = db.prepare(`
    SELECT d.*, w.address, w.network
    FROM deposits d
    JOIN user_wallets w ON d.wallet_id = w.id
    WHERE d.user_id = ?
    ORDER BY d.created_at DESC
    LIMIT 50
  `);

  dbOps.createWithdrawal = db.prepare(`
    INSERT INTO withdrawals (user_id, currency, amount, destination_address, fee, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  dbOps.getUserWithdrawals = db.prepare(`
    SELECT * FROM withdrawals 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `);

  // Price data operations
  dbOps.upsertPriceData = db.prepare(`
    INSERT INTO price_data (symbol, price, change_24h, volume_24h, market_cap, last_updated)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(symbol) DO UPDATE SET
      price = excluded.price,
      change_24h = excluded.change_24h,
      volume_24h = excluded.volume_24h,
      market_cap = excluded.market_cap,
      last_updated = CURRENT_TIMESTAMP
  `);

  dbOps.getPriceData = db.prepare(`
    SELECT * FROM price_data 
    WHERE symbol = ?
  `);

  dbOps.getAllPriceData = db.prepare(`
    SELECT * FROM price_data 
    ORDER BY symbol
  `);

  dbOps.getRecentPriceData = db.prepare(`
    SELECT * FROM price_data 
    WHERE last_updated > datetime('now', '-5 minutes')
    ORDER BY symbol
  `);

  // 2FA operations
  dbOps.create2FASecret = db.prepare(`
    INSERT INTO user_2fa (user_id, secret, backup_codes)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      secret = excluded.secret,
      backup_codes = excluded.backup_codes,
      enabled = FALSE
  `);

  dbOps.enable2FA = db.prepare(`
    UPDATE user_2fa 
    SET enabled = TRUE, enabled_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);

  dbOps.disable2FA = db.prepare(`
    UPDATE user_2fa 
    SET enabled = FALSE
    WHERE user_id = ?
  `);

  dbOps.get2FASettings = db.prepare(`
    SELECT secret, enabled, backup_codes, created_at, enabled_at
    FROM user_2fa 
    WHERE user_id = ?
  `);

  // Security logging
  dbOps.logSecurityEvent = db.prepare(`
    INSERT INTO security_logs (user_id, event_type, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  dbOps.getSecurityLogs = db.prepare(`
    SELECT event_type, ip_address, details, created_at
    FROM security_logs 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `);
  
  console.log('Database initialized successfully');
}

function createDemoUser() {
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@example.com');
  
  if (!existingUser) {
    console.log('Creating demo user...');
    
    // Insert demo user
    const insertUser = db.prepare(`
      INSERT INTO users (email, username, password_hash, verified) 
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertUser.run('demo@example.com', 'cryptotrader', 'demo_hash', 1);
    const userId = result.lastInsertRowid;
    
    // Create initial balances for demo user
    const insertBalance = db.prepare(`
      INSERT INTO user_balances (user_id, currency, balance, available) 
      VALUES (?, ?, ?, ?)
    `);
    
    const initialBalances = [
      { currency: 'USD', balance: 10000.50, available: 9500.00 },
      { currency: 'BTC', balance: 0.25, available: 0.20 },
      { currency: 'ETH', balance: 2.5, available: 2.0 },
      { currency: 'SOL', balance: 100, available: 95 },
      { currency: 'ADA', balance: 1000, available: 950 },
      { currency: 'DOT', balance: 50, available: 45 },
      { currency: 'LINK', balance: 150, available: 140 },
      { currency: 'AVAX', balance: 30, available: 25 },
      { currency: 'MATIC', balance: 2000, available: 1900 }
    ];
    
    for (const bal of initialBalances) {
      insertBalance.run(userId, bal.currency, bal.balance, bal.available);
    }
    
    console.log('Demo user created with initial balances');
    
    // Generate wallets for demo user
    generateWalletsForUser(userId);
  }
}

function generateWalletsForUser(userId) {
  const { generateUserWallets, encryptPrivateKey } = require('../services/walletGenerator');
  
  try {
    console.log(`Generating wallets for user ${userId}...`);
    
    const wallets = generateUserWallets(userId);
    
    // Create ETH wallet
    const ethEncrypted = encryptPrivateKey(wallets.eth.privateKey);
    dbOps.createWallet.run(
      userId, 'ethereum', 'ETH', 
      wallets.eth.address, 
      JSON.stringify(ethEncrypted),
      wallets.eth.publicKey
    );
    
    // Create SOL wallet  
    const solEncrypted = encryptPrivateKey(wallets.sol.privateKey);
    dbOps.createWallet.run(
      userId, 'solana', 'SOL',
      wallets.sol.address,
      JSON.stringify(solEncrypted), 
      wallets.sol.publicKey
    );
    
    // Create BTC wallet
    const btcEncrypted = encryptPrivateKey(wallets.btc.privateKey);
    dbOps.createWallet.run(
      userId, 'bitcoin', 'BTC',
      wallets.btc.address,
      JSON.stringify(btcEncrypted),
      wallets.btc.publicKey
    );
    
    console.log(`Wallets created for user ${userId}`);
    
    return {
      eth: { address: wallets.eth.address, network: 'ethereum' },
      sol: { address: wallets.sol.address, network: 'solana' },  
      btc: { address: wallets.btc.address, network: 'bitcoin' }
    };
    
  } catch (error) {
    console.error('Error generating wallets for user:', error);
    return null;
  }
}

// Database operations (will be initialized after tables are created)
let dbOps = {};

module.exports = {
  db,
  initDatabase,
  dbOps
};
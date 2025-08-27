const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

// Database encryption key
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

class PostgreSQLDatabase {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'crypto_exchange',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: process.env.DB_POOL_MAX || 50, // Increased pool size
      min: process.env.DB_POOL_MIN || 5,  // Minimum connections
      idleTimeoutMillis: 60000, // Increased idle timeout
      connectionTimeoutMillis: 5000, // Increased connection timeout
      acquireTimeoutMillis: 10000, // Add acquire timeout
      createTimeoutMillis: 5000, // Add create timeout
      destroyTimeoutMillis: 5000, // Add destroy timeout
      reapIntervalMillis: 10000, // Check for idle connections every 10s
      createRetryIntervalMillis: 500, // Retry failed connections every 500ms
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Performance optimizations
      application_name: 'crypto_exchange',
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });

    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Encryption utilities
  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(DB_ENCRYPTION_KEY.slice(0, 64), 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(Buffer.from('crypto-exchange'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(DB_ENCRYPTION_KEY.slice(0, 64), 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAAD(Buffer.from('crypto-exchange'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async initDatabase() {
    console.log('Initializing PostgreSQL database...');

    try {
      // Create extension for UUID generation
      await this.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      
      // Users table with encryption for sensitive data
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email_encrypted TEXT,
          phone_encrypted TEXT,
          kyc_data_encrypted JSONB,
          two_fa_secret_encrypted TEXT,
          verified BOOLEAN DEFAULT FALSE,
          kyc_status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP WITH TIME ZONE,
          ip_whitelist TEXT[],
          api_key_hash TEXT,
          permissions JSONB DEFAULT '{"trading": true, "withdrawal": true}'
        )
      `);

      // User balances with audit trail
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_balances (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          currency VARCHAR(10) NOT NULL,
          balance DECIMAL(28, 18) DEFAULT 0.0,
          available DECIMAL(28, 18) DEFAULT 0.0,
          locked DECIMAL(28, 18) DEFAULT 0.0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, currency)
        )
      `);

      // Balance audit log for compliance
      await this.query(`
        CREATE TABLE IF NOT EXISTS balance_audit (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          currency VARCHAR(10) NOT NULL,
          balance_before DECIMAL(28, 18),
          balance_after DECIMAL(28, 18),
          change_amount DECIMAL(28, 18),
          change_type VARCHAR(50) NOT NULL,
          reference_id VARCHAR(255),
          reference_type VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id)
        )
      `);

      // Orders with advanced features
      await this.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          order_id VARCHAR(255) UNIQUE NOT NULL,
          pair VARCHAR(20) NOT NULL,
          side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
          type VARCHAR(20) NOT NULL CHECK (type IN ('limit', 'market', 'stop', 'stop_limit')),
          quantity DECIMAL(28, 18) NOT NULL,
          price DECIMAL(28, 18),
          stop_price DECIMAL(28, 18),
          filled_quantity DECIMAL(28, 18) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'filled', 'cancelled', 'expired')),
          time_in_force VARCHAR(10) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
          post_only BOOLEAN DEFAULT FALSE,
          reduce_only BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          filled_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          cancelled_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // Trades with fees
      await this.query(`
        CREATE TABLE IF NOT EXISTS trades (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          trade_id VARCHAR(255) UNIQUE NOT NULL,
          pair VARCHAR(20) NOT NULL,
          side VARCHAR(10) NOT NULL,
          quantity DECIMAL(28, 18) NOT NULL,
          price DECIMAL(28, 18) NOT NULL,
          total DECIMAL(28, 18) NOT NULL,
          fee_currency VARCHAR(10) NOT NULL,
          fee_amount DECIMAL(28, 18) DEFAULT 0,
          fee_rate DECIMAL(8, 6) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User wallets with encrypted private keys
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_wallets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          network VARCHAR(50) NOT NULL CHECK (network IN ('ethereum', 'solana', 'bitcoin', 'binance_smart_chain', 'polygon')),
          currency VARCHAR(10) NOT NULL,
          address VARCHAR(255) NOT NULL,
          private_key_encrypted JSONB NOT NULL,
          public_key TEXT,
          derivation_path VARCHAR(255),
          wallet_index INTEGER,
          is_active BOOLEAN DEFAULT TRUE,
          is_monitored BOOLEAN DEFAULT TRUE,
          last_block_scanned BIGINT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, network, currency)
        )
      `);

      // Deposits with blockchain monitoring
      await this.query(`
        CREATE TABLE IF NOT EXISTS deposits (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
          currency VARCHAR(10) NOT NULL,
          amount DECIMAL(28, 18) NOT NULL,
          tx_hash VARCHAR(255),
          block_number BIGINT,
          block_hash VARCHAR(255),
          confirmations INTEGER DEFAULT 0,
          required_confirmations INTEGER DEFAULT 6,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirming', 'confirmed', 'failed')),
          network_fee DECIMAL(28, 18) DEFAULT 0,
          from_address VARCHAR(255),
          memo TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          confirmed_at TIMESTAMP WITH TIME ZONE,
          credited_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // Withdrawals with approval workflow
      await this.query(`
        CREATE TABLE IF NOT EXISTS withdrawals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          currency VARCHAR(10) NOT NULL,
          amount DECIMAL(28, 18) NOT NULL,
          destination_address VARCHAR(255) NOT NULL,
          destination_tag VARCHAR(255),
          tx_hash VARCHAR(255),
          network_fee DECIMAL(28, 18) DEFAULT 0,
          exchange_fee DECIMAL(28, 18) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'sent', 'completed', 'failed', 'cancelled')),
          approval_required BOOLEAN DEFAULT TRUE,
          approved_by UUID REFERENCES users(id),
          approved_at TIMESTAMP WITH TIME ZONE,
          two_fa_token VARCHAR(10),
          email_verification_token VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // API keys for programmatic access
      await this.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          key_hash TEXT NOT NULL,
          secret_encrypted JSONB NOT NULL,
          permissions JSONB NOT NULL DEFAULT '{"read": true, "trade": false, "withdraw": false}',
          ip_whitelist TEXT[],
          is_active BOOLEAN DEFAULT TRUE,
          last_used_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Security logs
      await this.query(`
        CREATE TABLE IF NOT EXISTS security_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          event_type VARCHAR(50) NOT NULL,
          event_data JSONB,
          ip_address INET,
          user_agent TEXT,
          status VARCHAR(20) DEFAULT 'success',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create comprehensive indexes for performance
      console.log('Creating performance indexes...');
      
      // User indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)');
      
      // Balance indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_user_balances_user_currency ON user_balances(user_id, currency)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_user_balances_currency ON user_balances(currency)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_user_balances_updated_at ON user_balances(updated_at DESC)');
      
      // Balance audit indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_balance_audit_user_created ON balance_audit(user_id, created_at DESC)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_balance_audit_reference ON balance_audit(reference_id, reference_type)');
      
      // Order indexes  
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_pair_status ON orders(pair, status)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_filled_at ON orders(filled_at DESC) WHERE filled_at IS NOT NULL');
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at) WHERE expires_at IS NOT NULL');
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_price_side ON orders(pair, side, price) WHERE status IN (\'pending\', \'partial\')');
      
      // Trade indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_trades_user_created ON trades(user_id, created_at DESC)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_trades_pair_created ON trades(pair, created_at DESC)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_trades_order_id ON trades(order_id)');
      
      // Wallet indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_user_wallets_user_network ON user_wallets(user_id, network)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(address)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_user_wallets_active ON user_wallets(is_active) WHERE is_active = true');
      
      // Deposit indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON deposits(user_id, status)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash) WHERE tx_hash IS NOT NULL');
      await this.query('CREATE INDEX IF NOT EXISTS idx_deposits_confirmations ON deposits(confirmations, status)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at DESC)');
      
      // Withdrawal indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON withdrawals(user_id, status)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_tx_hash ON withdrawals(tx_hash) WHERE tx_hash IS NOT NULL');
      await this.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_approval ON withdrawals(approval_required, status)');
      
      // API key indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC) WHERE last_used_at IS NOT NULL');
      
      // Security log indexes
      await this.query('CREATE INDEX IF NOT EXISTS idx_security_logs_user_event ON security_logs(user_id, event_type, created_at DESC)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip_address, created_at DESC)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC)');
      
      // Composite indexes for common queries
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_user_pair_status ON orders(user_id, pair, status)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_trades_user_pair_created ON trades(user_id, pair, created_at DESC)');
      
      // Partial indexes for better performance on filtered queries
      await this.query('CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(pair, side, price, created_at) WHERE status IN (\'pending\', \'partial\')');
      await this.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_pending ON withdrawals(created_at DESC) WHERE status = \'pending\'');
      
      console.log('Performance indexes created successfully');
      console.log('PostgreSQL database initialized successfully');
      
      // Create demo user
      await this.createDemoUser();
      
    } catch (error) {
      console.error('Error initializing PostgreSQL database:', error);
      throw error;
    }
  }

  async createDemoUser() {
    try {
      const existingUser = await this.query('SELECT id FROM users WHERE email = $1', ['demo@example.com']);
      
      if (existingUser.rows.length === 0) {
        console.log('Creating demo user in PostgreSQL...');
        
        // Insert demo user
        const userResult = await this.query(`
          INSERT INTO users (email, username, password_hash, verified) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, ['demo@example.com', 'cryptotrader', 'demo_hash', true]);
        
        const userId = userResult.rows[0].id;
        
        // Create initial balances for demo user
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
          await this.query(`
            INSERT INTO user_balances (user_id, currency, balance, available) 
            VALUES ($1, $2, $3, $4)
          `, [userId, bal.currency, bal.balance, bal.available]);
        }
        
        console.log('Demo user created with initial balances in PostgreSQL');
        
        // Note: Wallets will be generated when user explicitly requests them via /api/user/generate-wallets
      }
    } catch (error) {
      console.error('Error creating demo user:', error);
    }
  }

  async generateWalletsForUser(userId) {
    const { generateUserWallets } = require('../services/walletGenerator');
    
    try {
      console.log(`Generating wallets for user ${userId}...`);
      
      const wallets = generateUserWallets(userId);
      
      // Create ETH wallet with encrypted private key
      const ethEncrypted = this.encrypt(wallets.eth.privateKey);
      await this.query(`
        INSERT INTO user_wallets (user_id, network, currency, address, private_key_encrypted, public_key)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, 'ethereum', 'ETH', wallets.eth.address, JSON.stringify(ethEncrypted), wallets.eth.publicKey]);
      
      // Create SOL wallet
      const solEncrypted = this.encrypt(wallets.sol.privateKey);
      await this.query(`
        INSERT INTO user_wallets (user_id, network, currency, address, private_key_encrypted, public_key)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, 'solana', 'SOL', wallets.sol.address, JSON.stringify(solEncrypted), wallets.sol.publicKey]);
      
      // Create BTC wallet
      const btcEncrypted = this.encrypt(wallets.btc.privateKey);
      await this.query(`
        INSERT INTO user_wallets (user_id, network, currency, address, private_key_encrypted, public_key)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, 'bitcoin', 'BTC', wallets.btc.address, JSON.stringify(btcEncrypted), wallets.btc.publicKey]);
      
      console.log(`Wallets created for user ${userId} in PostgreSQL`);
      
    } catch (error) {
      console.error('Error generating wallets for user:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { PostgreSQLDatabase };
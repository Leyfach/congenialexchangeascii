-- Simple crypto exchange database schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trading pairs
CREATE TABLE trading_pairs (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    trading_pair_id INTEGER REFERENCES trading_pairs(id),
    order_type VARCHAR(10) NOT NULL DEFAULT 'limit',
    side VARCHAR(4) NOT NULL, -- 'buy' or 'sell'
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    filled_quantity DECIMAL(20,8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trades
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    trading_pair_id INTEGER REFERENCES trading_pairs(id),
    buyer_order_id INTEGER REFERENCES orders(id),
    seller_order_id INTEGER REFERENCES orders(id),
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Wallets
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    currency VARCHAR(10) NOT NULL,
    balance DECIMAL(20,8) DEFAULT 0,
    locked_balance DECIMAL(20,8) DEFAULT 0,
    UNIQUE(user_id, currency)
);

-- Transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id),
    transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'trade'
    amount DECIMAL(20,8) NOT NULL,
    fee DECIMAL(20,8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    tx_hash VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert some sample data
INSERT INTO trading_pairs (base_currency, quote_currency) VALUES
('BTC', 'USD'),
('ETH', 'USD'),
('BNB', 'USD');
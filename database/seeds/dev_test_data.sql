-- Development Seed: Test Data
-- Description: Sample data for development and testing
-- Environment: Development only

-- Test users (password: 'test123' for all)
INSERT OR IGNORE INTO users (id, email, username, password_hash, verified, created_at, updated_at) VALUES 
(10, 'alice@test.com', 'alice', '$2b$10$8K1p.3FQUyELcQP6.gRlXe4T5SJXY5fKBRF0Aqx5vRy7p2XAWR8me', 1, '2024-01-01 08:00:00', '2024-01-01 08:00:00'),
(11, 'bob@test.com', 'bob', '$2b$10$8K1p.3FQUyELcQP6.gRlXe4T5SJXY5fKBRF0Aqx5vRy7p2XAWR8me', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
(12, 'charlie@test.com', 'charlie', '$2b$10$8K1p.3FQUyELcQP6.gRlXe4T5SJXY5fKBRF0Aqx5vRy7p2XAWR8me', 0, '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- Alice - Heavy trader with large balances
INSERT OR IGNORE INTO user_balances (user_id, currency, balance, available) VALUES 
(10, 'USD', 50000.00, 45000.00),  -- 5K in open orders
(10, 'BTC', 2.0, 1.5),           -- 0.5 in open orders
(10, 'ETH', 25.0, 20.0),         -- 5 in open orders
(10, 'SOL', 500.0, 400.0),       -- 100 in open orders
(10, 'ADA', 10000.0, 8000.0),    -- 2K in open orders
(10, 'DOT', 1000.0, 800.0),
(10, 'LINK', 500.0, 400.0),
(10, 'AVAX', 200.0, 150.0),
(10, 'MATIC', 5000.0, 4000.0);

-- Bob - Moderate trader
INSERT OR IGNORE INTO user_balances (user_id, currency, balance, available) VALUES 
(11, 'USD', 15000.00, 15000.00),
(11, 'BTC', 0.25, 0.25),
(11, 'ETH', 5.0, 5.0),
(11, 'SOL', 75.0, 75.0),
(11, 'ADA', 1500.0, 1500.0),
(11, 'DOT', 200.0, 200.0),
(11, 'LINK', 75.0, 75.0),
(11, 'AVAX', 30.0, 30.0),
(11, 'MATIC', 800.0, 800.0);

-- Charlie - New user with minimal balance (unverified)
INSERT OR IGNORE INTO user_balances (user_id, currency, balance, available) VALUES 
(12, 'USD', 1000.00, 1000.00),
(12, 'BTC', 0.01, 0.01),
(12, 'ETH', 0.5, 0.5),
(12, 'SOL', 10.0, 10.0),
(12, 'ADA', 100.0, 100.0),
(12, 'DOT', 25.0, 25.0),
(12, 'LINK', 10.0, 10.0),
(12, 'AVAX', 5.0, 5.0),
(12, 'MATIC', 100.0, 100.0);

-- Sample historical price data
INSERT OR IGNORE INTO price_data (symbol, price, change_24h, volume_24h, market_cap, last_updated) VALUES 
('BTC', 110000.00, 2.5, 25000000000, 2100000000000, '2024-01-01 12:00:00'),
('ETH', 4600.00, 1.8, 15000000000, 550000000000, '2024-01-01 12:00:00'),
('SOL', 200.00, -0.5, 2000000000, 90000000000, '2024-01-01 12:00:00'),
('ADA', 0.80, 3.2, 800000000, 28000000000, '2024-01-01 12:00:00'),
('DOT', 4.00, 1.0, 150000000, 5500000000, '2024-01-01 12:00:00'),
('LINK', 24.00, 2.1, 500000000, 14000000000, '2024-01-01 12:00:00'),
('AVAX', 24.00, -1.2, 300000000, 9000000000, '2024-01-01 12:00:00'),
('MATIC', 0.245, 0.8, 200000000, 2400000000, '2024-01-01 12:00:00');
-- Production Seed: Demo User
-- Description: Creates a demo user for public access
-- Environment: Production

-- Insert demo user (password: 'demo123')
INSERT OR IGNORE INTO users (id, email, username, password_hash, verified, created_at, updated_at) 
VALUES (
  1, 
  'demo@example.com', 
  'demo', 
  '$2b$10$8K1p.3FQUyELcQP6.gRlXe4T5SJXY5fKBRF0Aqx5vRy7p2XAWR8me', 
  1, 
  '2024-01-01 00:00:00', 
  '2024-01-01 00:00:00'
);

-- Initialize demo user balances
INSERT OR IGNORE INTO user_balances (user_id, currency, balance, available) VALUES 
(1, 'USD', 10000.00, 10000.00),
(1, 'BTC', 0.5, 0.5),
(1, 'ETH', 10.0, 10.0),
(1, 'SOL', 100.0, 100.0),
(1, 'ADA', 2000.0, 2000.0),
(1, 'DOT', 250.0, 250.0),
(1, 'LINK', 100.0, 100.0),
(1, 'AVAX', 50.0, 50.0),
(1, 'MATIC', 1000.0, 1000.0);

-- Demo user will have the following starting portfolio:
-- USD: $10,000
-- BTC: 0.5 (~$55,000)  
-- ETH: 10.0 (~$46,000)
-- SOL: 100.0 (~$20,000)
-- ADA: 2,000.0 (~$1,600)
-- DOT: 250.0 (~$1,000) 
-- LINK: 100.0 (~$2,400)
-- AVAX: 50.0 (~$1,200)
-- MATIC: 1,000.0 (~$245)
-- Total: ~$137,445
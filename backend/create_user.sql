-- Create new user for crypto exchange
CREATE USER crypto_user WITH ENCRYPTED PASSWORD 'marlon26';

-- Create database
CREATE DATABASE crypto_exchange OWNER crypto_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE crypto_exchange TO crypto_user;

-- Connect to the database and grant schema privileges
\c crypto_exchange;
GRANT ALL ON SCHEMA public TO crypto_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crypto_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crypto_user;
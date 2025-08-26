# Crypto Exchange Backend

Enterprise-grade cryptocurrency exchange backend with PostgreSQL database and advanced security features.

## Features

### 🔐 Security
- **AES-256-GCM Encryption**: All sensitive data encrypted at rest
- **Private Key Encryption**: Wallet private keys encrypted with separate key
- **Audit Trail**: Complete balance and transaction logging
- **Security Event Logging**: Track all security-related events
- **API Rate Limiting**: Configurable rate limiting for API endpoints

### 💾 Database
- **PostgreSQL**: Production-ready database with ACID compliance
- **Connection Pooling**: Efficient database connection management
- **UUID Primary Keys**: Enhanced security and performance
- **Foreign Key Constraints**: Data integrity enforcement
- **Indexes**: Optimized for high-performance queries

### 🏦 Exchange Features
- **Multi-Currency Support**: BTC, ETH, SOL, ADA, DOT, LINK, AVAX, MATIC
- **Order Management**: Market and limit orders
- **Balance Management**: Real-time balance tracking with locks
- **Trade Execution**: Instant trade execution with fee calculation
- **Wallet Generation**: Automated crypto wallet creation

### 🌐 Blockchain Integration
- **Multi-Chain Support**: Ethereum, Solana, Bitcoin networks
- **Wallet Management**: Secure HD wallet generation
- **Deposit Monitoring**: Automated deposit detection (planned)
- **Withdrawal Processing**: Secure withdrawal workflow

## Quick Start

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
cd backend
npm install
```

2. **Set up PostgreSQL**
```bash
# Create database
createdb crypto_exchange

# Or using psql
psql -U postgres -c "CREATE DATABASE crypto_exchange;"
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Run database migration** (if migrating from SQLite)
```bash
# Test PostgreSQL connection
node database/migration.js test

# Migrate data from SQLite
node database/migration.js migrate
```

5. **Start the server**
```bash
# PostgreSQL version
node server-postgres.js

# Or legacy SQLite version
node server.js
```

## Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_exchange
DB_USER=postgres
DB_PASSWORD=your_password

# Encryption (CHANGE IN PRODUCTION!)
DB_ENCRYPTION_KEY=your_32_byte_hex_key
WALLET_ENCRYPTION_KEY=your_wallet_key

# Server
PORT=3001
NODE_ENV=development
```

### Security Configuration
For production deployment:
1. Generate secure 32-byte hex keys for encryption
2. Use strong database passwords
3. Enable SSL for database connections
4. Configure proper firewall rules
5. Set up monitoring and alerting

## Database Schema

### Core Tables
- **users**: User accounts with encrypted PII
- **user_balances**: Real-time balance tracking
- **orders**: Order management with status tracking
- **trades**: Trade execution history
- **user_wallets**: Encrypted wallet storage
- **deposits/withdrawals**: Transaction processing

### Security Tables
- **balance_audit**: Complete balance change history
- **security_logs**: Security event tracking
- **api_keys**: API access management

## API Endpoints

### Markets
- `GET /api/markets` - Market data
- `GET /api/markets/:pair/candles` - OHLCV data
- `GET /api/markets/:pair/orderbook` - Order book

### User Management
- `GET /api/user/profile` - User profile
- `GET /api/user/wallet` - Wallet balances
- `GET /api/user/trades` - Trade history

### Trading
- `POST /api/orders` - Place order
- `GET /api/user/orders` - Order history

### Wallets
- `GET /api/user/wallets` - Deposit addresses
- `POST /api/user/generate-wallets` - Generate new wallets
- `GET /api/user/deposits` - Deposit history
- `GET /api/user/withdrawals` - Withdrawal history

## Architecture

### Database Operations Layer
```
├── database/
│   ├── postgres.js      # PostgreSQL connection & encryption
│   ├── operations.js    # Database operations abstraction
│   ├── migration.js     # SQLite to PostgreSQL migration
│   └── db.js           # Legacy SQLite (deprecated)
```

### Security Features
- **Field-level Encryption**: Sensitive data encrypted before storage
- **Audit Logging**: All balance changes tracked
- **Connection Pooling**: Efficient resource management
- **Transaction Support**: ACID compliance for critical operations

### Wallet Security
- **HD Wallet Generation**: Deterministic wallet creation
- **Private Key Encryption**: AES-256-GCM encryption at rest
- **Multiple Networks**: Ethereum, Solana, Bitcoin support
- **Address Validation**: Network-specific address validation

## Migration Guide

### From SQLite to PostgreSQL

1. **Backup existing data**
```bash
cp database/exchange.db database/exchange.db.backup
```

2. **Test PostgreSQL connection**
```bash
node database/migration.js test
```

3. **Run migration**
```bash
node database/migration.js migrate
```

4. **Switch to PostgreSQL server**
```bash
# Stop SQLite server
# Start PostgreSQL server
node server-postgres.js
```

### Migration Notes
- Private keys are migrated with placeholders due to encryption changes
- Users should regenerate wallets after migration for security
- All balance and trade data is preserved
- Audit trail starts fresh in PostgreSQL

## Production Deployment

### Security Checklist
- [ ] Generate unique encryption keys
- [ ] Use environment-specific database credentials
- [ ] Enable PostgreSQL SSL
- [ ] Configure firewall rules
- [ ] Set up backup procedures
- [ ] Enable audit logging
- [ ] Configure monitoring

### Performance Optimization
- [ ] Database connection pooling
- [ ] Query optimization with EXPLAIN
- [ ] Index monitoring and optimization
- [ ] Caching layer (Redis recommended)
- [ ] Rate limiting configuration
- [ ] Load balancing for high availability

## Development

### Running Tests
```bash
npm test
```

### Database Reset
```bash
# Development only - resets all data
node -e "require('./database/operations').init()"
```

### Monitoring
- Database connection pool status
- Query performance metrics
- Security event logging
- Balance audit integrity

## Troubleshooting

### Common Issues

**Connection refused**
- Check PostgreSQL is running
- Verify connection credentials
- Check firewall settings

**Encryption errors**
- Verify DB_ENCRYPTION_KEY is 64 hex characters
- Check environment variable loading
- Validate key format

**Migration failures**
- Ensure SQLite database exists
- Check PostgreSQL permissions
- Verify network connectivity

## Security Disclosure

Found a security issue? Please report it privately to the development team.
Do not create public issues for security vulnerabilities.
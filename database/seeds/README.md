# Database Seeds

This directory contains seed files for populating the database with initial or test data.

## Seed Files

### Development Seeds
- `dev_users.sql` - Sample users for development
- `dev_balances.sql` - Initial balances for testing  
- `dev_price_data.sql` - Sample market price data

### Production Seeds  
- `prod_currencies.sql` - Supported currencies and trading pairs
- `prod_demo_user.sql` - Demo user for public access

## Running Seeds

### SQLite (Current)
```bash
# Run all development seeds
sqlite3 backend/database/exchange.db < database/seeds/dev_users.sql
sqlite3 backend/database/exchange.db < database/seeds/dev_balances.sql
sqlite3 backend/database/exchange.db < database/seeds/dev_price_data.sql

# Run production seeds
sqlite3 backend/database/exchange.db < database/seeds/prod_currencies.sql
sqlite3 backend/database/exchange.db < database/seeds/prod_demo_user.sql
```

### PostgreSQL (Future)
```bash
psql -d crypto_exchange -f database/seeds/seed_file.sql
```

## Seed Script
Create a helper script to run all seeds:

```bash
#!/bin/bash
# run_seeds.sh

DB_PATH="backend/database/exchange.db"

echo "Running database seeds..."
sqlite3 $DB_PATH < database/seeds/prod_currencies.sql
sqlite3 $DB_PATH < database/seeds/prod_demo_user.sql

if [ "$NODE_ENV" = "development" ]; then
    echo "Running development seeds..."
    sqlite3 $DB_PATH < database/seeds/dev_users.sql
    sqlite3 $DB_PATH < database/seeds/dev_balances.sql
    sqlite3 $DB_PATH < database/seeds/dev_price_data.sql
fi

echo "Seeds completed!"
```

## Seed Data Guidelines

1. **Development Seeds**
   - Include realistic test data
   - Multiple user scenarios
   - Various balance combinations
   - Historical price data

2. **Production Seeds**
   - Only essential data
   - System configurations
   - Demo/test accounts
   - Reference data (currencies, pairs)

3. **Best Practices**
   - Use INSERT OR IGNORE for idempotent seeds
   - Include realistic but safe test data
   - Don't include real user data in seeds
   - Keep production seeds minimal
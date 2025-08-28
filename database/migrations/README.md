# Database Migrations

This directory contains database migration files for schema changes and updates.

## Migration Files

Migration files should follow the naming convention:
- `YYYY-MM-DD-HHMMSS_description.sql`
- Example: `2024-01-15-120000_add_user_preferences.sql`

## Creating Migrations

### Schema Changes
```sql
-- Migration: 2024-01-15-120000_add_user_preferences.sql
ALTER TABLE users ADD COLUMN preferences JSON;
ALTER TABLE users ADD COLUMN theme VARCHAR(20) DEFAULT 'dark';
```

### Data Migrations
```sql
-- Migration: 2024-01-16-090000_populate_default_balances.sql  
INSERT INTO user_balances (user_id, currency, balance, available)
SELECT id, 'USD', 0, 0 FROM users 
WHERE id NOT IN (SELECT DISTINCT user_id FROM user_balances WHERE currency = 'USD');
```

## Running Migrations

### SQLite (Current)
```bash
sqlite3 backend/database/exchange.db < database/migrations/migration_file.sql
```

### PostgreSQL (Future)
```bash
psql -d crypto_exchange -f database/migrations/migration_file.sql
```

## Migration History

| Date | File | Description |
|------|------|-------------|
| 2024-01-01 | `init.sql` | Initial database schema |
| - | - | Future migrations will be listed here |

## Best Practices

1. Always backup database before running migrations
2. Test migrations on development environment first
3. Include rollback instructions in comments
4. Keep migrations atomic and reversible
5. Document breaking changes clearly
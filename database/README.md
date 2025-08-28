# Database Structure

This directory contains the centralized database structure and management files for the crypto exchange.

## Directory Structure

```
database/
├── migrations/     # Database schema changes and updates
├── schemas/        # Database schema definitions
├── seeds/          # Sample and initial data
└── README.md       # This file
```

## Current Database

The application currently uses **SQLite** with the database file located at:
- `backend/database/exchange.db`

## Database Management

### Schema Management
- **Initial schema**: `schemas/init.sql`
- **Migrations**: `migrations/` directory
- **Current implementation**: `backend/database/db.js`

### Data Seeding
- **Production seeds**: `seeds/prod_*.sql`
- **Development seeds**: `seeds/dev_*.sql`

### Database Operations
The main database operations are defined in:
- `backend/database/db.js` - Main database interface
- `backend/database/operations.js` - Database operations
- `backend/database/postgres.js` - PostgreSQL alternative (future)

## Quick Start

### Initialize Database
```bash
cd backend
node -e "require('./database/db.js').initDatabase()"
```

### Run Seeds (Development)
```bash
sqlite3 backend/database/exchange.db < database/seeds/prod_demo_user.sql
sqlite3 backend/database/exchange.db < database/seeds/dev_test_data.sql
```

### View Database Contents
```bash
sqlite3 backend/database/exchange.db
.tables
.schema users
SELECT * FROM users LIMIT 5;
```

## Future Migration to PostgreSQL

The codebase includes PostgreSQL support for production scaling:
- Connection pooling
- Better concurrent access
- Advanced indexing
- Backup and replication

To switch to PostgreSQL:
1. Set up PostgreSQL server
2. Update connection in `backend/database/postgres.js`
3. Run migrations on PostgreSQL
4. Update environment variables

## Backup Strategy

### SQLite Backup
```bash
sqlite3 backend/database/exchange.db ".backup backup_$(date +%Y%m%d_%H%M%S).db"
```

### PostgreSQL Backup (Future)
```bash
pg_dump crypto_exchange > backup_$(date +%Y%m%d_%H%M%S).sql
```
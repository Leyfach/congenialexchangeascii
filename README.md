# Simple Crypto Exchange

A pet project crypto exchange built for learning purposes.

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
Set up PostgreSQL and run the schema:
```bash
psql -d your_database < database/schemas/init.sql
```

## Features
- Basic trading engine
- Simple order matching
- User authentication
- Market data display

## Tech Stack
- Backend: Node.js, Express
- Frontend: React, Vite
- Database: PostgreSQL
- Cache: Redis (optional)

Perfect for diploma projects! 🎓
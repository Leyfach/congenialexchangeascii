# Simple Crypto Exchange
<img width="701" height="131" alt="{473B8A1F-0BBF-4152-A781-25A18CDAFE34}" src="https://github.com/user-attachments/assets/ea4572cd-eb3b-471d-a63c-20b865a0b6a8" />

Educational crypto exchange for portfolio and thesis work. Uses PostgreSQL for storage, Node.js/Express for REST API, and React for frontend.

## Features

- **Trading Engine:** basic engine with simple order matching.  
- **Authentication:** user registration and login.  
- **Market Data:** market data display.  

## Prerequisites

- Node.js and npm  
- PostgreSQL  
- Redis (optional)  

## Installation

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

Initialize the database schema:

```bash
psql -d your_database < database/schemas/init.sql
```

## Usage

Run backend and frontend, configure database connection, create a user, view quotes, and place orders.

## Tech Stack

- **Backend:** Node.js, Express  
- **Frontend:** React, Vite  
- **Database:** PostgreSQL  
- **Cache:** Redis (optional)  

## Contributing

Use standard Git workflow for changes and improvements. Structure and presentation styled after similar README for a Spring Boot/React/PostgreSQL educational project.

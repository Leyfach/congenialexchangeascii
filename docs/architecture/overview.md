# Crypto Exchange Architecture Overview

## System Architecture

The crypto exchange is built using a microservices-inspired architecture with the following components:

### Frontend (React + Vite)
- Modern React application with Vite for fast development
- Real-time WebSocket connections for live data
- Responsive design with ASCII/Matrix theme
- Multi-language support (i18n)
- Security features (2FA, rate limiting)

### Backend (Node.js + Express)
- RESTful API with Express.js
- WebSocket server for real-time data
- SQLite database with prepared statements
- JWT-based authentication
- Comprehensive security middleware

### Database (SQLite)
- User management and authentication
- Wallet balances and transactions
- Order management and trade history  
- Security logs and audit trails
- Price data and market information

## Key Features

### Security
- Rate limiting (general, auth, trading, wallet)
- Input validation and sanitization
- SQL injection protection (prepared statements)
- XSS protection with security headers
- CORS configuration
- Request logging and monitoring

### Trading System
- Real-time order book management
- Market and limit orders
- Balance validation and updates
- Trade execution and history
- Demo orders for market simulation

### User Experience
- Multi-language support
- Real-time price updates
- Interactive trading interface
- Wallet management
- Security settings (2FA)

## Technology Stack

- **Frontend**: React, Vite, TailwindCSS, i18next
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT, bcryptjs
- **Security**: Helmet, express-rate-limit, express-validator
- **Real-time**: WebSocket connections

## Deployment

The application supports multiple deployment options:
- Docker containers
- Kubernetes (K8s) manifests
- Traditional server deployment
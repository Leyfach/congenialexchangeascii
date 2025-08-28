# Crypto Exchange API Documentation

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Rate Limits

- General API: 1000 requests per 15 minutes
- Authentication: 50 requests per 15 minutes  
- Trading: 30 requests per minute
- Wallet: 100 requests per minute

## Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### User Management
- `GET /api/user/profile` - Get user profile
- `GET /api/user/wallet` - Get wallet balances
- `GET /api/user/trades` - Get trading history

### Trading
- `GET /api/markets` - Get all trading pairs
- `GET /api/markets/:pair/orderbook` - Get order book
- `POST /api/trading/orders` - Place new order
- `GET /api/trading/orders` - Get active orders
- `DELETE /api/trading/orders/:id` - Cancel order

### Market Data
- `GET /api/price-data` - Get current prices
- `GET /api/price-data/:symbol` - Get price for specific symbol

### Security
- `POST /api/auth/2fa/setup` - Setup 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA token
- `GET /api/user/security-logs` - Get security logs

## Error Responses

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Validation error details"]
}
```

## Rate Limit Headers

- `X-RateLimit-Limit` - Request limit per window
- `X-RateLimit-Remaining` - Requests remaining in window
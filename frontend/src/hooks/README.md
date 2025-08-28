# Custom React Hooks

This directory contains custom React hooks for the crypto exchange frontend.

## Hooks to implement:

- `useAuth.js` - Authentication state management
- `useWebSocket.js` - WebSocket connection management  
- `useTradingData.js` - Trading data and real-time updates
- `useWallet.js` - Wallet balance and transaction management
- `useMarketData.js` - Market prices and historical data

## Usage

```jsx
import { useAuth } from './hooks/useAuth';

function Component() {
  const { user, login, logout } = useAuth();
  // ...
}
```
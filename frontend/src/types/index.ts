// TypeScript type definitions for the crypto exchange frontend

export interface User {
  id: number;
  email: string;
  username: string;
  verified: boolean;
  created_at: string;
}

export interface TradingPair {
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export interface Order {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price: number;
  status: 'open' | 'filled' | 'cancelled';
  created_at: string;
}

export interface Trade {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export interface WalletBalance {
  currency: string;
  balance: number;
  available: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
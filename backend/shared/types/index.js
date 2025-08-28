/**
 * Common type definitions and constants for the crypto exchange backend
 */

// Trading pair configurations
const TRADING_PAIRS = [
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 
  'DOT/USD', 'LINK/USD', 'AVAX/USD', 'MATIC/USD'
]

// Order types and sides
const ORDER_TYPES = ['market', 'limit', 'stop_loss', 'take_profit']
const ORDER_SIDES = ['buy', 'sell']
const ORDER_STATUSES = ['open', 'filled', 'cancelled', 'rejected', 'partial']

// Supported currencies
const CURRENCIES = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX', 'MATIC', 'USD']

// Blockchain networks
const NETWORKS = {
  BITCOIN: 'bitcoin',
  ETHEREUM: 'ethereum', 
  SOLANA: 'solana',
  POLYGON: 'polygon'
}

// API response structure
const createApiResponse = (success, data = null, error = null, message = null) => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString()
})

// Validation helpers
const isValidTradingPair = (pair) => TRADING_PAIRS.includes(pair)
const isValidOrderType = (type) => ORDER_TYPES.includes(type)
const isValidOrderSide = (side) => ORDER_SIDES.includes(side)
const isValidCurrency = (currency) => CURRENCIES.includes(currency)

// Error types
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
}

module.exports = {
  TRADING_PAIRS,
  ORDER_TYPES,
  ORDER_SIDES,
  ORDER_STATUSES,
  CURRENCIES,
  NETWORKS,
  ERROR_TYPES,
  createApiResponse,
  isValidTradingPair,
  isValidOrderType,
  isValidOrderSide,
  isValidCurrency
}
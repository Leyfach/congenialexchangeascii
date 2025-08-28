const express = require('express');
const cors = require('cors');
const http = require('http');
const bcrypt = require('bcryptjs');
const { body, validationResult, param } = require('express-validator');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const CryptoJS = require('crypto-js');
require('dotenv').config();
const { initDatabase, dbOps } = require('./database/db');
const priceService = require('./services/price-data/priceService');
const priceUpdater = require('./services/price-data/priceUpdater');
const orderBookManager = require('./services/trading/OrderBookManager');
const webSocketManager = require('./services/trading/WebSocketManager');
const demoOrdersManager = require('./services/trading/DemoOrdersManager');
const twoFactorAuth = require('./services/auth/twoFactorAuth');
const advancedOrderManager = require('./services/trading/AdvancedOrderManager');
const marginTradingManager = require('./services/trading/MarginTradingManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow WebSocket connections
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - more relaxed for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 50, // Increased auth limit for development
  message: { error: 'Too many authentication attempts, please try again later' }
});

// CORS configuration for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // Limit payload size

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Initialize database
initDatabase();

app.get('/', (req, res) => {
  res.json({ message: 'Crypto Exchange API is running!' });
});

// Authentication endpoints - persistent user storage
const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'data', 'users.json');
const dataDir = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load users from file
function loadUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return { users: [], currentUserId: 1 };
}

// Save users to file
function saveUsers(userData) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

const userData = loadUsers();
let users = userData.users || [];
let currentUserId = userData.currentUserId || 1;

// Security functions
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encryptData(text) {
  return CryptoJS.AES.encrypt(JSON.stringify(text), ENCRYPTION_KEY).toString();
}

function decryptData(encryptedText) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    return null;
  }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

// Input sanitization function
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .trim()
    .substring(0, 1000); // Limit length
}

// Get current user from token
function getCurrentUserFromToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  
  // Handle demo token
  if (token === 'demo-token-demo') {
    return {
      id: 'demo',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      accountType: 'demo'
    };
  }
  
  // Handle old-style demo tokens (demo-token-{id})
  if (token.startsWith('demo-token-')) {
    const userId = token.replace('demo-token-', '');
    const user = users.find(u => u.id.toString() === userId);
    if (user) {
      return user;
    }
  }
  
  // Handle registered user tokens - find user by token
  const user = users.find(u => u.token === token);
  return user || null;
}

// Authentication middleware
function requireAuth(req, res, next) {
  const user = getCurrentUserFromToken(req);
  if (!user) {
    console.log('[DEBUG] Auth failed for:', req.path);
    return res.status(401).json({ error: 'Authentication required' });
  }
  console.log(`[DEBUG] Auth success for user ${user.id} on ${req.path}`);
  req.user = user;
  next();
}

// Generate random balances for new users
function generateUserBalances(usdBalance, accountType) {
  const balances = {
    USD: { balance: usdBalance, available: usdBalance * 0.9, locked: usdBalance * 0.1 }
  };
  
  // Different crypto allocations based on account type
  const cryptoAllocation = {
    basic: { BTC: 0.001, ETH: 0.01, SOL: 1 },
    demo: { BTC: 0.05, ETH: 0.5, SOL: 10, ADA: 100, DOT: 5 },
    premium: { BTC: 0.2, ETH: 2, SOL: 50, ADA: 500, DOT: 25, LINK: 20, AVAX: 15 },
    vip: { BTC: 1, ETH: 10, SOL: 200, ADA: 2000, DOT: 100, LINK: 100, AVAX: 80, MATIC: 1000 }
  };
  
  const allocation = cryptoAllocation[accountType] || cryptoAllocation.basic;
  
  // Add random variation (±20%)
  Object.entries(allocation).forEach(([currency, amount]) => {
    const variation = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2 multiplier
    const finalAmount = amount * variation;
    balances[currency] = {
      balance: finalAmount,
      available: finalAmount * (0.8 + Math.random() * 0.2), // 80-100% available
      locked: finalAmount * (Math.random() * 0.2) // 0-20% locked
    };
  });
  
  return balances;
}

app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().escape().isLength({ min: 1, max: 50 }).withMessage('First name required (1-50 chars)'),
  body('lastName').trim().escape().isLength({ min: 1, max: 50 }).withMessage('Last name required (1-50 chars)')
], (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { email, password, firstName, lastName } = req.body;
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }
  
  // Determine account type based on email
  let accountType = 'basic';
  let startingBalance = 1000; // Basic users get $1000
  
  if (email.includes('demo') || email.includes('test')) {
    accountType = 'demo';
    startingBalance = 10000; // Demo users get $10000
  } else if (email.includes('pro') || email.includes('premium')) {
    accountType = 'premium';
    startingBalance = 50000; // Premium users get $50000
  } else if (email.includes('vip') || email.includes('whale')) {
    accountType = 'vip';
    startingBalance = 100000; // VIP users get $100000
  }

  const token = `user-token-${currentUserId}-${Date.now()}`;
  
  // Sanitize and hash sensitive data
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedFirstName = sanitizeInput(firstName || 'User');
  const sanitizedLastName = sanitizeInput(lastName || '');
  const hashedPassword = hashPassword(password);
  
  const user = { 
    id: currentUserId++, 
    email: sanitizedEmail,
    password: hashedPassword, // Hashed password
    firstName: sanitizedFirstName,
    lastName: sanitizedLastName,
    accountType,
    token,
    created: new Date().toISOString(),
    // Generate random starting crypto balances
    balances: generateUserBalances(startingBalance, accountType)
  };
  users.push(user);
  
  // Save to file
  saveUsers({ users, currentUserId });
  
  res.json({ 
    message: 'User registered successfully', 
    userId: user.id, 
    token: user.token,
    user: { 
      id: user.id, 
      email: user.email, 
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType
    }
  });
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
], (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { email, password } = req.body;
  const sanitizedEmail = sanitizeInput(email);
  
  // Check demo user first
  if (sanitizedEmail === 'demo@example.com' && password === 'demo123') {
    return res.json({ 
      message: 'Login successful', 
      userId: 'demo',
      token: 'demo-token-demo',
      user: { 
        id: 'demo', 
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User'
      }
    });
  }
  
  // Find user by email
  const user = users.find(u => u.email === sanitizedEmail);
  
  // Verify password using hash comparison
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate new token if user doesn't have one
  if (!user.token) {
    user.token = `user-token-${user.id}-${Date.now()}`;
    saveUsers({ users, currentUserId });
  }

  res.json({ 
    message: 'Login successful', 
    userId: user.id,
    token: user.token,
    user: { 
      id: user.id, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
});

// Demo access endpoint
app.post('/api/auth/demo', (req, res) => {
  res.json({ 
    message: 'Demo access granted', 
    userId: 'demo',
    token: 'demo-token-demo',
    user: { 
      id: 'demo', 
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User'
    }
  });
});

app.get('/api/markets', async (req, res) => {
  try {
    const marketData = await priceService.getMarketData();
    res.json(marketData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    // Fallback to mock data
    res.json([
      { pair: 'BTC/USD', price: 111000, change: '+0.70%', volume: 39000000000 },
      { pair: 'ETH/USD', price: 4600, change: '+4.06%', volume: 38000000000 },
      { pair: 'SOL/USD', price: 200, change: '+8.57%', volume: 9000000000 },
      { pair: 'ADA/USD', price: 0.86, change: '+2.41%', volume: 1500000000 },
      { pair: 'DOT/USD', price: 3.87, change: '+1.95%', volume: 240000000 },
      { pair: 'LINK/USD', price: 24.50, change: '+6.09%', volume: 1600000000 },
      { pair: 'AVAX/USD', price: 24.40, change: '+4.29%', volume: 590000000 },
      { pair: 'MATIC/USD', price: 0.24, change: '+3.23%', volume: 570000 }
    ]);
  }
});

// Generate mock OHLC candle data
function generateCandles(pair, timeframe, limit) {
  const now = Date.now();
  const intervals = {
    '1m': 60 * 1000,
    '5': 5 * 60 * 1000,
    '15': 15 * 60 * 1000,
    '60': 60 * 60 * 1000,
    '240': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000
  };
  
  const interval = intervals[timeframe] || intervals['1m'];
  // Try to get real price from cache first
  let basePrice;
  try {
    const [coin] = pair.split('/');
    const cachedPrices = priceUpdater.getCachedPrices();
    basePrice = cachedPrices[coin]?.price;
  } catch (error) {
    console.log('Could not get cached price for candles');
  }
  
  // Fallback if no cached price available
  if (!basePrice) {
    const basePrices = { 
      'BTC/USD': 111000, 'ETH/USD': 4600, 'SOL/USD': 200,
      'ADA/USD': 0.86, 'DOT/USD': 3.87, 'LINK/USD': 24.50,
      'AVAX/USD': 24.40, 'MATIC/USD': 0.24
    };
    basePrice = basePrices[pair] || 1000;
  }
  
  const candles = [];
  
  for (let i = limit - 1; i >= 0; i--) {
    const time = Math.floor((now - (i * interval)) / 1000);
    const volatility = 0.02; // 2% volatility
    
    // Generate realistic OHLC data
    const open = basePrice + (Math.random() - 0.5) * basePrice * volatility;
    const change = (Math.random() - 0.5) * basePrice * volatility * 0.5;
    const close = open + change;
    
    const high = Math.max(open, close) + Math.random() * basePrice * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * basePrice * volatility * 0.3;
    
    const volume = Math.random() * 1000 + 100;
    
    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2))
    });
  }
  
  return candles;
}

async function fetchCandles({ pair, timeframe, limit }) {
  try {
    // Extract coin symbol from pair (e.g., 'BTC/USD' -> 'BTC')
    const [coin] = pair.split('/');
    
    // First try to get current price for more realistic mock data
    let currentPrice;
    try {
      const prices = await priceService.getCurrentPrices([coin]);
      currentPrice = prices[coin]?.price;
    } catch (priceError) {
      console.log('Using fallback price for candles');
    }
    
    // Convert timeframe to days for historical data
    let days = 1;
    if (timeframe === '5' || timeframe === '15') days = 1;
    else if (timeframe === '60') days = 2;
    else if (timeframe === '240') days = 7;
    else if (timeframe === '1D') days = 30;
    
    const historicalData = await priceService.getHistoricalPrices(coin, days);
    
    // Limit the results
    return historicalData.slice(-limit);
    
  } catch (error) {
    console.error('Error fetching candle data:', error);
    // Fallback to mock data with current price if available
    return generateCandles(pair, timeframe, limit);
  }
}

app.get('/api/markets/:pair/candles', async (req, res) => {
  try {
    const pair = decodeURIComponent(req.params.pair);
    const timeframe = req.query.timeframe ?? '1m';
    const limit = Math.min(parseInt(req.query.limit ?? '500', 10), 1500);
    const data = await fetchCandles({ pair, timeframe, limit });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate mock order book data using real prices
async function generateOrderBook(pair) {
  try {
    const [coin] = pair.split('/');
    
    // First try to get fresh prices from API
    let centerPrice;
    try {
      const prices = await priceService.getCurrentPrices([coin]);
      centerPrice = prices[coin]?.price;
    } catch (apiError) {
      console.log('Failed to fetch fresh price, trying cached data');
    }
    
    // If no fresh price, try cached prices
    if (!centerPrice) {
      const cachedPrices = priceUpdater.getCachedPrices();
      centerPrice = cachedPrices[coin]?.price;
    }
    
    // If still no price, throw error to use fallback logic
    if (!centerPrice) {
      throw new Error(`No price data available for ${coin}`);
    }
    
    const spread = centerPrice * 0.001; // 0.1% spread
    
    const bids = [];
    const asks = [];
    
    for (let i = 0; i < 15; i++) {
      const bidPrice = centerPrice - spread - (Math.random() * centerPrice * 0.01);
      const askPrice = centerPrice + spread + (Math.random() * centerPrice * 0.01);
      
      bids.push({
        price: parseFloat(bidPrice.toFixed(centerPrice > 100 ? 2 : 6)),
        amount: parseFloat((Math.random() * 10 + 0.1).toFixed(4))
      });
      
      asks.push({
        price: parseFloat(askPrice.toFixed(centerPrice > 100 ? 2 : 6)),
        amount: parseFloat((Math.random() * 10 + 0.1).toFixed(4))
      });
    }
    
    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);
    
    return { bids, asks };
    
  } catch (error) {
    console.error('Error generating order book:', error);
    // This should not happen since we already checked cached prices above,
    // but as ultimate fallback, return empty order book
    return { bids: [], asks: [] };
  }
}

// Removed duplicate endpoint - using new trading system endpoint below

// New endpoint for current prices
app.get('/api/prices', async (req, res) => {
  try {
    const { symbols } = req.query;
    const coinList = symbols ? symbols.split(',') : ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX', 'MATIC'];
    const prices = await priceService.getCurrentPrices(coinList);
    res.json(prices);
  } catch (error) {
    console.error('Error fetching current prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// New endpoint for a single coin price
app.get('/api/prices/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const prices = await priceService.getCurrentPrices([symbol]);
    res.json(prices[symbol] || { error: 'Coin not found' });
  } catch (error) {
    console.error('Error fetching price for', req.params.symbol, ':', error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// User endpoints
app.get('/api/user/profile', (req, res) => {
  try {
    const user = getCurrentUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType || 'demo',
      createdAt: user.created
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/user/wallet', requireAuth, (req, res) => {
  try {
    const user = req.user;
    
    // Ensure user has balances
    if (!user.balances) {
      ensureUserBalances(user);
    }
    
    // Get user-specific balances - Always read from database to ensure latest updates
    // FORCE database read, ignore cached user.balances from JSON file
    const balances = dbOps.getUserBalances.all(user.id);
    console.log(`[DEBUG] User ${user.id} balances from DB:`, balances);
    
    // Calculate total USD value
    const rates = { 
      BTC: 111000, ETH: 4600, SOL: 200,
      ADA: 0.86, DOT: 3.87, LINK: 24.50,
      AVAX: 24.40, MATIC: 0.24, USD: 1 
    };
    
    const totalUSD = balances.reduce((sum, bal) => {
      return sum + (bal.balance * (rates[bal.currency] || 1));
    }, 0);
    
    res.json({
      balances: balances,
      totalUSD: totalUSD
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

app.get('/api/user/trades', requireAuth, (req, res) => {
  try {
    const user = req.user;
    
    const trades = dbOps.getUserTrades.all(user.id);
    res.json(trades);
  } catch (error) {
    console.error('Trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get user wallets (deposit addresses)
app.get('/api/user/wallets', requireAuth, (req, res) => {
  try {
    const user = req.user;
    
    const wallets = dbOps.getUserWallets.all(user.id);
    res.json({ wallets });
  } catch (error) {
    console.error('Wallets error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Get user deposits
app.get('/api/user/deposits', requireAuth, (req, res) => {
  try {
    const user = req.user;
    
    const deposits = dbOps.getUserDeposits.all(user.id);
    res.json(deposits);
  } catch (error) {
    console.error('Deposits error:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

// Get user withdrawals
app.get('/api/user/withdrawals', (req, res) => {
  try {
    const user = getCurrentUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const withdrawals = dbOps.getUserWithdrawals.all(user.id);
    res.json(withdrawals);
  } catch (error) {
    console.error('Withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Create wallets for user
app.post('/api/user/generate-wallets', requireAuth, (req, res) => {
  try {
    const user = req.user;

    // Check if wallets already exist
    const existingWallets = dbOps.getUserWallets.all(user.id);
    if (existingWallets.length > 0) {
      return res.json({ message: 'Wallets already exist', wallets: existingWallets });
    }

    const { generateUserWallets, encryptPrivateKey } = require('./services/walletGenerator');
    
    console.log(`Generating wallets for user ${user.id}...`);
    
    // Ensure user exists in database (only for numeric user IDs)
    if (typeof user.id === 'number') {
      try {
        dbOps.createUser.run(
          user.id,
          String(user.email),
          String(user.email.split('@')[0]), // username from email
          String(user.password || 'hashed_password'),
          1, // verified (true as integer)
          String(user.created || new Date().toISOString()),
          String(new Date().toISOString())
        );
      } catch (error) {
        console.log(`User ${user.id} already exists in database or other error:`, error.message);
      }
    } else {
      console.log(`Skipping database sync for demo user: ${user.id}`);
    }
    
    const wallets = generateUserWallets(user.id);
    
    // For now, return wallets without saving to database for all users to avoid FOREIGN KEY issues
    const userWallets = [
      { network: 'ethereum', currency: 'ETH', address: wallets.eth.address, public_key: wallets.eth.publicKey, is_active: 1, created_at: new Date().toISOString() },
      { network: 'solana', currency: 'SOL', address: wallets.sol.address, public_key: wallets.sol.publicKey, is_active: 1, created_at: new Date().toISOString() },
      { network: 'bitcoin', currency: 'BTC', address: wallets.btc.address, public_key: wallets.btc.publicKey, is_active: 1, created_at: new Date().toISOString() }
    ];
    console.log(`Wallets created for user ${user.id}`);
    res.json({ message: 'Wallets created successfully', wallets: userWallets });
    
  } catch (error) {
    console.error('Generate wallets error:', error);
    res.status(500).json({ error: 'Failed to generate wallets' });
  }
});

// Orders endpoint
app.post('/api/orders', async (req, res) => {
  const { pair, side, quantity, type, price } = req.body;
  
  try {
    // Validate required fields
    if (!pair || !side || !quantity || !type) {
      return res.status(400).json({ error: 'Missing required fields: pair, side, quantity, type' });
    }
    
    if (type === 'limit' && !price) {
      return res.status(400).json({ error: 'Price is required for limit orders' });
    }
    
    // Get user (demo user for now)
    const user = getCurrentUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Use real current prices for market orders
    let executionPrice = price;
    
    if (!executionPrice || type === 'market') {
      try {
        const [base] = pair.split('/');
        const currentPrices = await priceService.getCurrentPrices([base]);
        executionPrice = currentPrices[base]?.price || price || 1000;
      } catch (error) {
        console.error('Error fetching current price for order:', error);
        const basePrices = { 
          'BTC/USD': 111000, 'ETH/USD': 4600, 'SOL/USD': 200,
          'ADA/USD': 0.86, 'DOT/USD': 3.87, 'LINK/USD': 24.50,
          'AVAX/USD': 24.40, 'MATIC/USD': 0.24
        };
        executionPrice = price || basePrices[pair] || 1000;
      }
    }
    const [base, quote] = pair.split('/');
    const orderQuantity = parseFloat(quantity);
    const orderPrice = parseFloat(executionPrice);
    const total = orderQuantity * orderPrice;
    
    // Check balances and update
    if (side === 'buy') {
      // Buying: deduct quote currency (USD), add base currency
      const quoteBalance = dbOps.getBalance.get(user.id, quote);
      if (!quoteBalance || quoteBalance.available < total) {
        return res.status(400).json({ error: `Insufficient ${quote} balance` });
      }
      
      // Update quote currency (subtract)
      dbOps.updateBalance.run(
        quoteBalance.balance - total,
        quoteBalance.available - total,
        user.id,
        quote
      );
      
      // Update base currency (add)
      const baseBalance = dbOps.getBalance.get(user.id, base) || { balance: 0, available: 0 };
      dbOps.updateBalance.run(
        baseBalance.balance + orderQuantity,
        baseBalance.available + orderQuantity,
        user.id,
        base
      );
      
    } else {
      // Selling: deduct base currency, add quote currency (USD)
      const baseBalance = dbOps.getBalance.get(user.id, base);
      if (!baseBalance || baseBalance.available < orderQuantity) {
        return res.status(400).json({ error: `Insufficient ${base} balance` });
      }
      
      // Update base currency (subtract)
      dbOps.updateBalance.run(
        baseBalance.balance - orderQuantity,
        baseBalance.available - orderQuantity,
        user.id,
        base
      );
      
      // Update quote currency (add)
      const quoteBalance = dbOps.getBalance.get(user.id, quote) || { balance: 0, available: 0 };
      dbOps.updateBalance.run(
        quoteBalance.balance + total,
        quoteBalance.available + total,
        user.id,
        quote
      );
    }
    
    // Generate order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Create order record
    const orderResult = dbOps.createOrder.run(
      user.id, orderId, pair, side, type, orderQuantity, orderPrice, 'filled', now
    );
    
    // Create trade record
    dbOps.createTrade.run(
      user.id, orderResult.lastInsertRowid, pair, side, orderQuantity, orderPrice, total
    );
    
    const response = {
      id: orderId,
      pair: pair,
      side: side,
      quantity: orderQuantity,
      type: type,
      price: orderPrice,
      status: 'filled',
      tradesExecuted: 1,
      timestamp: now
    };
    
    console.log(`Order executed: ${side.toUpperCase()} ${quantity} ${pair} at $${executionPrice} | Balance updated`);
    
    res.json({
      success: true,
      message: 'Order executed successfully',
      order: response,
      tradesExecuted: 1
    });
    
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ error: 'Failed to execute order' });
  }
});

// Add price updater status endpoint
app.get('/api/price-updater/status', (req, res) => {
  res.json(priceUpdater.getStatus());
});

// Add manual price update endpoint
app.post('/api/price-updater/update', async (req, res) => {
  try {
    await priceUpdater.forceUpdate();
    res.json({ success: true, message: 'Price update completed' });
  } catch (error) {
    res.status(500).json({ error: 'Price update failed' });
  }
});

// Add cached prices endpoint
app.get('/api/prices/cached', (req, res) => {
  try {
    const cachedPrices = priceUpdater.getCachedPrices();
    res.json(cachedPrices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cached prices' });
  }
});

// === HELPER FUNCTIONS ===

// Ensure user has demo balances for testing
// Ensure user has balances based on their account type
function ensureUserBalances(user) {
  try {
    // Skip if user already has stored balances
    if (user.balances) {
      return;
    }
    
    const accountType = user.accountType || 'basic';
    let usdBalance;
    
    switch(accountType) {
      case 'demo':
        usdBalance = 10000;
        break;
      case 'premium':
        usdBalance = 50000;
        break;
      case 'vip':
        usdBalance = 100000;
        break;
      default:
        usdBalance = 1000;
    }
    
    const balances = generateUserBalances(usdBalance, accountType);
    
    // Store balances in user object and save to file
    user.balances = balances;
    saveUsers({ users, currentUserId });
    
    // Also create initial database balances for the user
    try {
      // Insert USD balance first (most important for trading)
      dbOps.insertBalance.run(user.id, 'USD', usdBalance, usdBalance);
      
      // Insert zero balances for other major currencies to avoid initialization issues
      const currencies = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX', 'MATIC'];
      currencies.forEach(currency => {
        dbOps.insertBalance.run(user.id, currency, 0, 0);
      });
      
      console.log(`Initialized database balances for user ${user.id} with ${usdBalance} USD`);
    } catch (dbError) {
      // Balances might already exist, which is fine
      console.log(`Database balances already exist for user ${user.id}`);
    }
  } catch (error) {
    console.error('Error ensuring user balances:', error);
  }
}

// === NEW TRADING SYSTEM ENDPOINTS ===

// Place a new order (now uses real order book)
app.post('/api/trading/orders', [
  body('pair').isIn(['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 'DOT/USD', 'LINK/USD', 'AVAX/USD', 'MATIC/USD']).withMessage('Invalid trading pair'),
  body('side').isIn(['buy', 'sell']).withMessage('Invalid side (buy/sell)'),
  body('type').isIn(['market', 'limit']).withMessage('Invalid order type'),
  body('quantity').isFloat({ min: 0.001 }).withMessage('Invalid quantity'),
  body('price').optional().isFloat({ min: 0.01 }).withMessage('Invalid price')
], requireAuth, (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { pair, side, type, quantity, price } = req.body;
    const user = req.user;
    
    // Validate order
    if (!pair || !side || !type || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: pair, side, type, quantity' });
    }
    
    if (type === 'limit' && !price) {
      return res.status(400).json({ error: 'Price is required for limit orders' });
    }
    
    // Ensure user has balances for trading
    if (!user.balances) {
      ensureUserBalances(user);
    }
    
    // For market orders, get current price
    let orderPrice = price;
    if (type === 'market') {
      const [coin] = pair.split('/');
      try {
        const cachedPrices = priceUpdater.getCachedPrices();
        orderPrice = cachedPrices[coin]?.price || 50000; // Fallback price
      } catch (error) {
        orderPrice = 50000; // Safe fallback
      }
    }
    
    // Place order in the order book
    const result = orderBookManager.addOrder({
      pair,
      side,
      type,
      quantity: parseFloat(quantity),
      price: orderPrice ? parseFloat(orderPrice) : null,
      userId: user.id.toString()
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get live order book (replaces old mock orderbook)
app.get('/api/trading/orderbook/:pair', (req, res) => {
  try {
    const pair = decodeURIComponent(req.params.pair);
    const depth = parseInt(req.query.depth || '20');
    const orderbook = orderBookManager.getOrderBook(pair, depth);
    res.json(orderbook);
  } catch (error) {
    console.error('Orderbook error:', error);
    res.status(500).json({ error: 'Failed to fetch order book' });
  }
});

// Get user's active orders
app.get('/api/trading/orders', (req, res) => {
  try {
    const user = getCurrentUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const orders = orderBookManager.getUserOrders(user.id.toString());
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Cancel an order
app.delete('/api/trading/orders/:orderId', requireAuth, (req, res) => {
  try {
    const orderId = req.params.orderId;
    const user = req.user;
    
    const result = orderBookManager.cancelOrder(orderId, user.id.toString());
    res.json(result);
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get trading statistics
app.get('/api/trading/stats', (req, res) => {
  try {
    const orderBookStats = orderBookManager.getStats();
    const wsStats = webSocketManager.getStats();
    const demoStats = demoOrdersManager.getDemoStats();
    
    res.json({
      orderBook: orderBookStats,
      webSocket: wsStats,
      demo: demoStats,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Keep old orderbook endpoint for backward compatibility
app.get('/api/markets/:pair/orderbook', async (req, res) => {
  try {
    const pair = decodeURIComponent(req.params.pair);
    
    // Always try to get from new trading system first
    const liveOrderBook = orderBookManager.getOrderBook(pair, 15);
    
    // Always return live orderbook (even if empty) to maintain consistency
    res.json(liveOrderBook);
  } catch (error) {
    console.error('Error in old orderbook endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch order book' });
  }
});

// 2FA Authentication Endpoints
app.post('/api/auth/2fa/setup', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const userEmail = req.user.email;
    
    const setupData = await twoFactorAuth.setup2FA(userId, userEmail);
    
    res.json({
      success: true,
      data: setupData
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to setup 2FA' 
    });
  }
});

app.post('/api/auth/2fa/verify-setup', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    const isValid = await twoFactorAuth.verify2FASetup(userId, token);
    
    if (isValid) {
      // Log security event
      dbOps.logSecurityEvent.run(userId, '2fa_enabled', req.ip, req.get('User-Agent'), 'Two-factor authentication enabled');
      
      res.json({
        success: true,
        message: '2FA enabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify 2FA setup' 
    });
  }
});

app.post('/api/auth/2fa/authenticate', requireAuth, async (req, res) => {
  try {
    const { token, isBackupCode } = req.body;
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    const isValid = await twoFactorAuth.authenticate(userId, token, isBackupCode);
    
    if (isValid) {
      // Log successful authentication
      const eventType = isBackupCode ? '2fa_backup_code_used' : '2fa_login_success';
      dbOps.logSecurityEvent.run(userId, eventType, req.ip, req.get('User-Agent'), 'Two-factor authentication successful');
      
      res.json({
        success: true,
        message: 'Authentication successful'
      });
    } else {
      // Log failed authentication
      const eventType = isBackupCode ? '2fa_backup_code_failed' : '2fa_login_failed';
      dbOps.logSecurityEvent.run(userId, eventType, req.ip, req.get('User-Agent'), 'Two-factor authentication failed');
      
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Error authenticating with 2FA:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
});

app.get('/api/auth/2fa/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    
    const status = await twoFactorAuth.get2FAStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get 2FA status' 
    });
  }
});

app.post('/api/auth/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required to disable 2FA'
      });
    }
    
    // Verify token before disabling
    const isValid = await twoFactorAuth.authenticate(userId, token);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    await twoFactorAuth.disable2FA(userId);
    
    // Log security event
    dbOps.logSecurityEvent.run(userId, '2fa_disabled', req.ip, req.get('User-Agent'), 'Two-factor authentication disabled');
    
    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to disable 2FA' 
    });
  }
});

app.post('/api/auth/2fa/regenerate-backup-codes', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required to regenerate backup codes'
      });
    }
    
    // Verify token before regenerating
    const isValid = await twoFactorAuth.authenticate(userId, token);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    const newBackupCodes = await twoFactorAuth.regenerateBackupCodes(userId);
    
    // Log security event
    dbOps.logSecurityEvent.run(userId, '2fa_backup_codes_regenerated', req.ip, req.get('User-Agent'), 'Backup codes regenerated');
    
    res.json({
      success: true,
      data: {
        backupCodes: newBackupCodes
      }
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate backup codes' 
    });
  }
});

// Security logs endpoint
app.get('/api/user/security-logs', requireAuth, (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const logs = dbOps.getSecurityLogs.all(userId);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch security logs' 
    });
  }
});

// Advanced Trading Endpoints

// Place advanced order (Stop-Loss, Take-Profit, Trailing Stop, Iceberg, OCO)
app.post('/api/trading/advanced-orders', requireAuth, (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const orderData = {
      ...req.body,
      userId
    };

    const result = advancedOrderManager.placeAdvancedOrder(orderData);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error placing advanced order:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to place advanced order'
    });
  }
});

// Get user's conditional orders
app.get('/api/trading/conditional-orders', requireAuth, (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const orders = advancedOrderManager.getUserConditionalOrders(userId);
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching conditional orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conditional orders'
    });
  }
});

// Cancel advanced order
app.delete('/api/trading/advanced-orders/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const result = advancedOrderManager.cancelOrder(orderId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error cancelling advanced order:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel order'
    });
  }
});

// Margin Trading Endpoints

// Open margin position
app.post('/api/trading/margin/positions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const positionData = req.body;
    
    const result = await marginTradingManager.openPosition(userId, positionData);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error opening margin position:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to open margin position'
    });
  }
});

// Close margin position
app.post('/api/trading/margin/positions/:positionId/close', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const { positionId } = req.params;
    const { closePrice } = req.body;
    
    const result = await marginTradingManager.closePosition(userId, positionId, closePrice);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error closing margin position:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to close margin position'
    });
  }
});

// Get user's margin positions
app.get('/api/trading/margin/positions', requireAuth, (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const positions = marginTradingManager.getUserPositions(userId);
    
    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error('Error fetching margin positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch margin positions'
    });
  }
});

// Get margin account balance
app.get('/api/trading/margin/balance', requireAuth, (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const balance = marginTradingManager.getUserMarginBalance(userId, 'USD');
    
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Error fetching margin balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch margin balance'
    });
  }
});

// Get margin trading statistics
app.get('/api/trading/margin/stats', requireAuth, (req, res) => {
  try {
    const userId = req.user.id === 'demo' ? 1 : req.user.id;
    const stats = marginTradingManager.getMarginStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching margin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch margin stats'
    });
  }
});

// Get advanced order statistics
app.get('/api/trading/advanced-orders/stats', (req, res) => {
  try {
    const stats = advancedOrderManager.getOrderStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order stats'
    });
  }
});

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize WebSocket manager
webSocketManager.initialize(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
  
  // Start the price updater service
  setTimeout(() => {
    priceUpdater.start();
    
    // Initialize demo orders after prices are loaded
    setTimeout(() => {
      demoOrdersManager.initializeDemoOrders();
      
      // Set up periodic refresh of demo orders (every 2 minutes)
      setInterval(() => {
        demoOrdersManager.refreshDemoOrders();
      }, 120000);
    }, 5000); // Wait 5 seconds for prices to be loaded
    
  }, 2000); // Wait 2 seconds for database to be fully initialized
});
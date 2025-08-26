const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { DatabaseOperations } = require('./database/operations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize PostgreSQL database operations
let db = null;

async function initServer() {
  try {
    db = new DatabaseOperations();
    await db.init();
    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'Crypto Exchange API with PostgreSQL is running!' });
});

app.get('/api/markets', (req, res) => {
  res.json([
    { pair: 'BTC/USD', price: 45000, change: '+2.34%', volume: 1234567 },
    { pair: 'ETH/USD', price: 3200, change: '-1.23%', volume: 987654 },
    { pair: 'SOL/USD', price: 180, change: '+5.67%', volume: 456789 },
    { pair: 'ADA/USD', price: 0.45, change: '+3.12%', volume: 234567 },
    { pair: 'DOT/USD', price: 25.80, change: '-0.89%', volume: 345678 },
    { pair: 'LINK/USD', price: 15.45, change: '+4.56%', volume: 456789 },
    { pair: 'AVAX/USD', price: 35.20, change: '+1.78%', volume: 567890 },
    { pair: 'MATIC/USD', price: 1.25, change: '-2.34%', volume: 678901 }
  ]);
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
  const basePrices = { 
    'BTC/USD': 45000, 
    'ETH/USD': 3200, 
    'SOL/USD': 180,
    'ADA/USD': 0.45,
    'DOT/USD': 25.80,
    'LINK/USD': 15.45,
    'AVAX/USD': 35.20,
    'MATIC/USD': 1.25
  };
  const basePrice = basePrices[pair] || 1000;
  
  const candles = [];
  
  for (let i = limit - 1; i >= 0; i--) {
    const time = Math.floor((now - (i * interval)) / 1000);
    const volatility = 0.02;
    
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
  return generateCandles(pair, timeframe, limit);
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

// Generate mock order book data
function generateOrderBook(pair) {
  const basePrices = { 
    'BTC/USD': 45000, 
    'ETH/USD': 3200, 
    'SOL/USD': 180,
    'ADA/USD': 0.45,
    'DOT/USD': 25.80,
    'LINK/USD': 15.45,
    'AVAX/USD': 35.20,
    'MATIC/USD': 1.25
  };
  
  const centerPrice = basePrices[pair] || 1000;
  const spread = centerPrice * 0.001;
  
  const bids = [];
  const asks = [];
  
  for (let i = 0; i < 15; i++) {
    bids.push({
      price: centerPrice - spread - (Math.random() * centerPrice * 0.01),
      amount: Math.random() * 10 + 0.1
    });
    
    asks.push({
      price: centerPrice + spread + (Math.random() * centerPrice * 0.01),
      amount: Math.random() * 10 + 0.1
    });
  }
  
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);
  
  return { bids, asks };
}

app.get('/api/markets/:pair/orderbook', (req, res) => {
  const pair = decodeURIComponent(req.params.pair);
  res.json(generateOrderBook(pair));
});

// User endpoints
app.get('/api/user/profile', async (req, res) => {
  try {
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      verified: user.verified,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/user/wallet', async (req, res) => {
  try {
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const balances = await db.getUserBalances(user.id);
    
    // Calculate total USD value
    const rates = { 
      BTC: 45000, ETH: 3200, SOL: 180,
      ADA: 0.45, DOT: 25.80, LINK: 15.45,
      AVAX: 35.20, MATIC: 1.25, USD: 1 
    };
    
    // Convert string values to numbers for frontend
    const processedBalances = balances.map(bal => ({
      ...bal,
      balance: parseFloat(bal.balance) || 0,
      available: parseFloat(bal.available) || 0,
      locked: parseFloat(bal.locked) || 0
    }));

    const totalUSD = processedBalances.reduce((sum, bal) => {
      return sum + (bal.balance * (rates[bal.currency] || 1));
    }, 0);
    
    res.json({
      balances: processedBalances,
      totalUSD: totalUSD
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

app.get('/api/user/trades', async (req, res) => {
  try {
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const trades = await db.getUserTrades(user.id);
    
    // Convert string values to numbers for frontend
    const processedTrades = trades.map(trade => ({
      ...trade,
      amount: parseFloat(trade.amount) || 0,
      price: parseFloat(trade.price) || 0,
      total: parseFloat(trade.total) || 0,
      fee_amount: parseFloat(trade.fee_amount) || 0
    }));
    
    res.json(processedTrades);
  } catch (error) {
    console.error('Trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get user wallets (deposit addresses)
app.get('/api/user/wallets', async (req, res) => {
  try {
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const wallets = await db.getUserWallets(user.id);
    res.json({ wallets });
  } catch (error) {
    console.error('Wallets error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Get wallet with private key (for admin/developer purposes only)
app.get('/api/user/wallets/:network/:currency/details', async (req, res) => {
  try {
    const { network, currency } = req.params;
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const wallet = await db.getWalletWithPrivateKey(user.id, network, currency);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json({ 
      wallet: {
        network: wallet.network,
        currency: wallet.currency,
        address: wallet.address,
        publicKey: wallet.public_key,
        privateKey: wallet.private_key_decrypted, // Only for development/testing
        createdAt: wallet.created_at
      }
    });
  } catch (error) {
    console.error('Wallet details error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet details' });
  }
});

// Get user deposits
app.get('/api/user/deposits', async (req, res) => {
  try {
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const deposits = await db.getUserDeposits(user.id);
    res.json(deposits);
  } catch (error) {
    console.error('Deposits error:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

// Get user withdrawals
app.get('/api/user/withdrawals', async (req, res) => {
  try {
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const withdrawals = await db.getUserWithdrawals(user.id);
    res.json(withdrawals);
  } catch (error) {
    console.error('Withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Create wallets for user
app.post('/api/user/generate-wallets', async (req, res) => {
  try {
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if wallets already exist
    const existingWallets = await db.getUserWallets(user.id);
    if (existingWallets.length > 0) {
      return res.json({ message: 'Wallets already exist', wallets: existingWallets });
    }

    const { generateUserWallets } = require('./services/walletGenerator');
    
    console.log(`Generating wallets for user ${user.id}...`);
    
    const wallets = generateUserWallets(user.id);
    
    // Create ETH wallet with encrypted private key
    const ethEncrypted = db.db.encrypt(wallets.eth.privateKey);
    await db.createWallet(
      user.id, 'ethereum', 'ETH', 
      wallets.eth.address, 
      ethEncrypted,
      wallets.eth.publicKey
    );
    
    // Create SOL wallet  
    const solEncrypted = db.db.encrypt(wallets.sol.privateKey);
    await db.createWallet(
      user.id, 'solana', 'SOL',
      wallets.sol.address,
      solEncrypted, 
      wallets.sol.publicKey
    );
    
    // Create BTC wallet
    const btcEncrypted = db.db.encrypt(wallets.btc.privateKey);
    await db.createWallet(
      user.id, 'bitcoin', 'BTC',
      wallets.btc.address,
      btcEncrypted,
      wallets.btc.publicKey
    );
    
    console.log(`Wallets created for user ${user.id}`);
    
    const createdWallets = await db.getUserWallets(user.id);
    res.json({ message: 'Wallets created successfully', wallets: createdWallets });
    
  } catch (error) {
    console.error('Generate wallets error:', error);
    res.status(500).json({ error: 'Failed to generate wallets' });
  }
});

// Orders endpoint with PostgreSQL
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
    
    // Get user
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Use realistic prices based on pair
    const basePrices = { 
      'BTC/USD': 45000, 'ETH/USD': 3200, 'SOL/USD': 180,
      'ADA/USD': 0.45, 'DOT/USD': 25.80, 'LINK/USD': 15.45,
      'AVAX/USD': 35.20, 'MATIC/USD': 1.25
    };
    
    const defaultPrice = basePrices[pair] || 1000;
    const executionPrice = price || defaultPrice;
    const [base, quote] = pair.split('/');
    const orderQuantity = parseFloat(quantity);
    const orderPrice = parseFloat(executionPrice);
    const total = orderQuantity * orderPrice;
    
    // Check balances and update
    if (side === 'buy') {
      // Buying: deduct quote currency (USD), add base currency
      const quoteBalance = await db.getBalance(user.id, quote);
      if (!quoteBalance || parseFloat(quoteBalance.available) < total) {
        return res.status(400).json({ error: `Insufficient ${quote} balance` });
      }
      
      // Update quote currency (subtract)
      await db.updateBalance(
        user.id,
        quote,
        parseFloat(quoteBalance.balance) - total,
        parseFloat(quoteBalance.available) - total,
        parseFloat(quoteBalance.locked) || 0
      );
      
      // Update base currency (add)
      const baseBalance = await db.getBalance(user.id, base) || { balance: 0, available: 0, locked: 0 };
      await db.updateBalance(
        user.id,
        base,
        parseFloat(baseBalance.balance || 0) + orderQuantity,
        parseFloat(baseBalance.available || 0) + orderQuantity,
        parseFloat(baseBalance.locked || 0)
      );
      
    } else {
      // Selling: deduct base currency, add quote currency (USD)
      const baseBalance = await db.getBalance(user.id, base);
      if (!baseBalance || parseFloat(baseBalance.available) < orderQuantity) {
        return res.status(400).json({ error: `Insufficient ${base} balance` });
      }
      
      // Update base currency (subtract)
      await db.updateBalance(
        user.id,
        base,
        parseFloat(baseBalance.balance) - orderQuantity,
        parseFloat(baseBalance.available) - orderQuantity,
        parseFloat(baseBalance.locked) || 0
      );
      
      // Update quote currency (add)
      const quoteBalance = await db.getBalance(user.id, quote) || { balance: 0, available: 0, locked: 0 };
      await db.updateBalance(
        user.id,
        quote,
        parseFloat(quoteBalance.balance || 0) + total,
        parseFloat(quoteBalance.available || 0) + total,
        parseFloat(quoteBalance.locked || 0)
      );
    }
    
    // Generate order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create order record
    const orderResult = await db.createOrder(
      user.id, orderId, pair, side, type, orderQuantity, orderPrice, 'filled'
    );
    
    // Create trade record
    await db.createTrade(
      user.id, orderResult.id, pair, side, orderQuantity, orderPrice, total
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
      timestamp: new Date().toISOString()
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

// Initialize server
initServer().then(() => {
  app.listen(PORT, () => {
    console.log(`Server with PostgreSQL is running on port ${PORT}`);
  });
});

module.exports = app;
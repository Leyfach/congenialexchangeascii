const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDatabase, dbOps } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

app.get('/', (req, res) => {
  res.json({ message: 'Crypto Exchange API is running!' });
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
  // In a real implementation, this would fetch from a data provider like Binance, CoinGecko, etc.
  // For now, return mock data
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
  const spread = centerPrice * 0.001; // 0.1% spread
  
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
app.get('/api/user/profile', (req, res) => {
  try {
    // For demo, use the demo user
    const user = dbOps.getUserByEmail.get('demo@example.com');
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
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/user/wallet', (req, res) => {
  try {
    // For demo, use the demo user
    const user = dbOps.getUserByEmail.get('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const balances = dbOps.getUserBalances.all(user.id);
    
    // Calculate total USD value
    const rates = { 
      BTC: 45000, ETH: 3200, SOL: 180,
      ADA: 0.45, DOT: 25.80, LINK: 15.45,
      AVAX: 35.20, MATIC: 1.25, USD: 1 
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

app.get('/api/user/trades', (req, res) => {
  try {
    // For demo, use the demo user
    const user = dbOps.getUserByEmail.get('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const trades = dbOps.getUserTrades.all(user.id);
    res.json(trades);
  } catch (error) {
    console.error('Trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get user wallets (deposit addresses)
app.get('/api/user/wallets', (req, res) => {
  try {
    const user = dbOps.getUserByEmail.get('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const wallets = dbOps.getUserWallets.all(user.id);
    res.json({ wallets });
  } catch (error) {
    console.error('Wallets error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Get user deposits
app.get('/api/user/deposits', (req, res) => {
  try {
    const user = dbOps.getUserByEmail.get('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
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
    const user = dbOps.getUserByEmail.get('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const withdrawals = dbOps.getUserWithdrawals.all(user.id);
    res.json(withdrawals);
  } catch (error) {
    console.error('Withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Create wallets for user
app.post('/api/user/generate-wallets', (req, res) => {
  try {
    const user = dbOps.getUserByEmail.get('demo@example.com');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if wallets already exist
    const existingWallets = dbOps.getUserWallets.all(user.id);
    if (existingWallets.length > 0) {
      return res.json({ message: 'Wallets already exist', wallets: existingWallets });
    }

    const { generateUserWallets, encryptPrivateKey } = require('./services/walletGenerator');
    
    console.log(`Generating wallets for user ${user.id}...`);
    
    const wallets = generateUserWallets(user.id);
    
    // Create ETH wallet
    const ethEncrypted = encryptPrivateKey(wallets.eth.privateKey);
    dbOps.createWallet.run(
      user.id, 'ethereum', 'ETH', 
      wallets.eth.address, 
      JSON.stringify(ethEncrypted),
      wallets.eth.publicKey
    );
    
    // Create SOL wallet  
    const solEncrypted = encryptPrivateKey(wallets.sol.privateKey);
    dbOps.createWallet.run(
      user.id, 'solana', 'SOL',
      wallets.sol.address,
      JSON.stringify(solEncrypted), 
      wallets.sol.publicKey
    );
    
    // Create BTC wallet
    const btcEncrypted = encryptPrivateKey(wallets.btc.privateKey);
    dbOps.createWallet.run(
      user.id, 'bitcoin', 'BTC',
      wallets.btc.address,
      JSON.stringify(btcEncrypted),
      wallets.btc.publicKey
    );
    
    console.log(`Wallets created for user ${user.id}`);
    
    const createdWallets = dbOps.getUserWallets.all(user.id);
    res.json({ message: 'Wallets created successfully', wallets: createdWallets });
    
  } catch (error) {
    console.error('Generate wallets error:', error);
    res.status(500).json({ error: 'Failed to generate wallets' });
  }
});

// Orders endpoint
app.post('/api/orders', (req, res) => {
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
    const user = dbOps.getUserByEmail.get('demo@example.com');
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
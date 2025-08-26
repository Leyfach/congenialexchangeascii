const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Database models
const UserModel = require('./services/user/userModel');
const OrderModel = require('./services/order/orderModel');
const WalletModel = require('./services/wallet/walletModel');
const MarketModel = require('./services/market-data/marketModel');
const TradingEngine = require('./services/trading/tradingEngine');

// Middleware and utilities
const { authenticateToken, optionalAuth } = require('./shared/middleware/auth');
const { generateToken } = require('./services/auth/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Crypto Exchange API is running!' });
});

// Market endpoints
app.get('/api/markets', async (req, res) => {
  try {
    // Try to get from database first
    let markets;
    try {
      const tradingPairs = await MarketModel.getTradingPairs();
      
      // Get real-time prices from order book
      const mockPrices = {
        'BTC/USD': { price: TradingEngine.getOrderBookPrice(1), volume: 1234.56, change: '+2.5%' },
        'ETH/USD': { price: TradingEngine.getOrderBookPrice(2), volume: 5678.90, change: '-1.2%' },
        'BNB/USD': { price: TradingEngine.getOrderBookPrice(3), volume: 9876.54, change: '+0.8%' }
      };

      markets = tradingPairs.map(pair => ({
        id: pair.id,
        pair: `${pair.base_currency}/${pair.quote_currency}`,
        ...mockPrices[`${pair.base_currency}/${pair.quote_currency}`] || { price: 0, volume: 0, change: '0%' }
      }));
    } catch (dbError) {
      console.log('Database not connected, using fallback data');
      // Get current prices from order book
      const btcPrice = TradingEngine.getOrderBookPrice(1);
      const ethPrice = TradingEngine.getOrderBookPrice(2);
      const bnbPrice = TradingEngine.getOrderBookPrice(3);
      
      console.log('Order book prices:', { btcPrice, ethPrice, bnbPrice });
      
      markets = [
        { id: 1, pair: 'BTC/USD', price: btcPrice, volume: 1234.56, change: '+2.5%' },
        { id: 2, pair: 'ETH/USD', price: ethPrice, volume: 5678.90, change: '-1.2%' },
        { id: 3, pair: 'BNB/USD', price: bnbPrice, volume: 9876.54, change: '+0.8%' }
      ];
    }

    res.json(markets);
  } catch (error) {
    console.error('Markets endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

app.get('/api/markets/:pair/orderbook', async (req, res) => {
  try {
    const { pair } = req.params;
    const [base, quote] = pair.split('/');
    
    const tradingPair = await MarketModel.findTradingPairBySymbol(base, quote);
    if (!tradingPair) {
      return res.status(404).json({ error: 'Trading pair not found' });
    }

    // Get real-time order book from TradingEngine
    const orderbook = TradingEngine.getOrderBook(tradingPair.id);
    res.json({
      pair,
      ...orderbook
    });
  } catch (error) {
    console.error('Orderbook fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orderbook' });
  }
});

// User endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const user = await UserModel.create(email, password);
    
    // Create default wallets for new user
    await WalletModel.create(user.id, 'USD', 10000); // Demo balance
    await WalletModel.create(user.id, 'BTC', 0);
    await WalletModel.create(user.id, 'ETH', 0);
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    res.json({ 
      message: 'User registered successfully', 
      userId: user.id, 
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    res.json({ 
      message: 'Login successful', 
      userId: user.id, 
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Order endpoints
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { pair, side, quantity, price, type = 'limit' } = req.body;
    const userId = req.user.id;
    
    if (!pair || !side || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [base, quote] = pair.split('/');
    const tradingPair = await MarketModel.findTradingPairBySymbol(base, quote);
    
    if (!tradingPair) {
      return res.status(404).json({ error: 'Trading pair not found' });
    }
    
    // Use TradingEngine to process the order with matching
    const result = await TradingEngine.processOrder(userId, tradingPair.id, side, quantity, price, type);
    
    res.json({ 
      message: 'Order processed', 
      order: result.order, 
      trades: result.trades,
      tradesExecuted: result.trades.length 
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to place order' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await OrderModel.findByUserId(userId);
    res.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if order belongs to user
    const order = await OrderModel.findById(id);
    if (!order || order.user_id !== userId) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Use TradingEngine to cancel order (removes from order book)
    const deletedOrder = await TradingEngine.cancelOrder(id, userId);
    res.json({ message: 'Order cancelled', order: deletedOrder });
  } catch (error) {
    console.error('Order cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Wallet endpoints
app.get('/api/wallets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const wallets = await WalletModel.findByUserId(userId);
    res.json(wallets);
  } catch (error) {
    console.error('Wallets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

app.get('/api/user/wallet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const wallets = await WalletModel.findByUserId(userId);
    
    // Transform to dashboard format
    const balances = {};
    let totalEquity = 0;
    
    wallets.forEach(wallet => {
      balances[wallet.currency] = parseFloat(wallet.balance);
      if (wallet.currency === 'USD') {
        totalEquity += parseFloat(wallet.balance);
      } else {
        // For simplicity, using mock conversion rates
        const rates = { BTC: 45000, ETH: 3200 };
        totalEquity += parseFloat(wallet.balance) * (rates[wallet.currency] || 0);
      }
    });
    
    res.json({
      balances,
      equity: totalEquity,
      pnl24h: Math.random() * 5 - 2.5, // Mock PnL
      exposure: Math.random() * 50 // Mock exposure
    });
  } catch (error) {
    console.error('User wallet fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

app.get('/api/user/trades', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await OrderModel.findByUserId(userId);
    
    // Transform orders to trades format for dashboard
    const trades = orders
      .filter(order => order.status === 'completed' || order.status === 'filled')
      .map(order => ({
        id: order.id,
        pair: order.pair || `${order.base_currency}/${order.quote_currency}`,
        side: order.side,
        price: parseFloat(order.price),
        amount: parseFloat(order.quantity),
        createdAt: order.created_at
      }))
      .slice(0, 10); // Limit to 10 most recent trades
    
    res.json(trades);
  } catch (error) {
    console.error('User trades fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// User profile endpoint
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get wallet balances
    const wallets = await WalletModel.findByUserId(userId);
    const balances = {};
    wallets.forEach(wallet => {
      balances[wallet.currency] = wallet.balance;
    });

    // Get recent orders
    const orders = await OrderModel.findByUserId(userId);
    
    const profile = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      balances,
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'filled' || o.status === 'completed').length,
      pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'partial').length
    };
    
    res.json(profile);
  } catch (error) {
    console.error('User profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
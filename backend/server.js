const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Database models
const UserModel = require('./services/user/userModel');
const OrderModel = require('./services/order/orderModel');
const WalletModel = require('./services/wallet/walletModel');
const MarketModel = require('./services/market-data/marketModel');

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
      
      // Add mock price data (you'd get this from external APIs in real app)
      const mockPrices = {
        'BTC/USD': { price: 45000, volume: 1234.56, change: '+2.5%' },
        'ETH/USD': { price: 3200, volume: 5678.90, change: '-1.2%' },
        'BNB/USD': { price: 450, volume: 9876.54, change: '+0.8%' }
      };

      markets = tradingPairs.map(pair => ({
        id: pair.id,
        pair: `${pair.base_currency}/${pair.quote_currency}`,
        ...mockPrices[`${pair.base_currency}/${pair.quote_currency}`] || { price: 0, volume: 0, change: '0%' }
      }));
    } catch (dbError) {
      console.log('Database not connected, using fallback data');
      // Fallback data if database is not connected
      markets = [
        { id: 1, pair: 'BTC/USD', price: 45000, volume: 1234.56, change: '+2.5%' },
        { id: 2, pair: 'ETH/USD', price: 3200, volume: 5678.90, change: '-1.2%' },
        { id: 3, pair: 'BNB/USD', price: 450, volume: 9876.54, change: '+0.8%' }
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

    const orderbook = await MarketModel.getOrderBook(tradingPair.id);
    res.json({
      pair,
      ...orderbook
    });
  } catch (error) {
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
    
    const order = await OrderModel.create(userId, tradingPair.id, side, quantity, price, type);
    res.json({ message: 'Order placed', order });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to place order' });
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
    
    const deletedOrder = await OrderModel.delete(id);
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
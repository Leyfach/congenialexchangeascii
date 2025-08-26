const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple in-memory data for quick testing
let users = [];
let orders = [];

app.get('/', (req, res) => {
  res.json({ message: 'Crypto Exchange API is running! (Quick Start Mode)' });
});

// Simple markets endpoint
app.get('/api/markets', (req, res) => {
  res.json([
    { id: 1, pair: 'BTC/USD', price: 45000, volume: 1234.56, change: '+2.5%' },
    { id: 2, pair: 'ETH/USD', price: 3200, volume: 5678.90, change: '-1.2%' },
    { id: 3, pair: 'BNB/USD', price: 450, volume: 9876.54, change: '+0.8%' }
  ]);
});

// Simple auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  const user = { id: users.length + 1, email, password };
  users.push(user);
  res.json({ 
    message: 'User registered successfully', 
    userId: user.id, 
    token: 'demo-token-123',
    user: { id: user.id, email: user.email }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ 
    message: 'Login successful', 
    userId: user.id,
    token: 'demo-token-123',
    user: { id: user.id, email: user.email }
  });
});

// Simple order endpoints
app.post('/api/orders', (req, res) => {
  const { pair, side, quantity, price } = req.body;
  const order = {
    id: orders.length + 1,
    pair, side, quantity, price,
    status: 'pending',
    createdAt: new Date()
  };
  orders.push(order);
  res.json({ message: 'Order placed', order });
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Simple wallets endpoint
app.get('/api/wallets', (req, res) => {
  res.json([
    { currency: 'USD', balance: 10000 },
    { currency: 'BTC', balance: 0.5 },
    { currency: 'ETH', balance: 2.3 }
  ]);
});

app.listen(PORT, () => {
  console.log(`🚀 Quick Start Server running on port ${PORT}`);
  console.log('📝 No database required - using in-memory storage');
  console.log('🌐 Frontend should connect to: http://localhost:3000');
});
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Crypto Exchange API is running!' });
});

app.get('/api/markets', (req, res) => {
  res.json([
    { pair: 'BTC/USD', price: 111000, volume: 1234.56 },
    { pair: 'ETH/USD', price: 4200, volume: 5678.90 },
    { pair: 'BNB/USD', price: 850, volume: 9876.54 }
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
  const basePrices = { 'BTC/USD': 65000, 'ETH/USD': 3200, 'BNB/USD': 600 };
  const basePrice = basePrices[pair] || 50000;
  
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
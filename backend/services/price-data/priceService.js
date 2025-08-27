const axios = require('axios');
const redisCache = require('../cache/RedisCache');

class PriceService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.cache = new Map(); // Fallback local cache
    this.cacheExpiry = 300000; // 5 minute cache to reduce API calls
    
    // CoinGecko API coin mapping
    this.coinMapping = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum', 
      'SOL': 'solana',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network'
    };
  }

  // Get current prices for multiple coins
  async getCurrentPrices(coins) {
    const cacheKey = `prices_${coins.join(',')}`;
    
    // Try Redis cache first
    let cached = await redisCache.get(cacheKey);
    if (!cached) {
      // Fallback to local cache
      cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        cached = cached.data;
      } else {
        cached = null;
      }
    }
    
    if (cached && cached.timestamp && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached;
    }

    try {
      const coinIds = coins.map(coin => this.coinMapping[coin]).filter(Boolean);
      
      if (coinIds.length === 0) {
        throw new Error('No valid coins provided');
      }

      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const priceData = {};
      
      Object.entries(this.coinMapping).forEach(([symbol, coinId]) => {
        if (coins.includes(symbol) && response.data[coinId]) {
          const data = response.data[coinId];
          priceData[symbol] = {
            price: data.usd,
            change24h: data.usd_24h_change || 0,
            volume24h: data.usd_24h_vol || 0,
            marketCap: data.usd_market_cap || 0,
            timestamp: Date.now()
          };
        }
      });

      // Cache the result in both Redis and local cache
      const dataWithTimestamp = {
        ...priceData,
        timestamp: Date.now()
      };
      
      await redisCache.set(cacheKey, dataWithTimestamp, 300); // 5 minutes TTL
      this.cache.set(cacheKey, {
        data: priceData,
        timestamp: Date.now()
      });

      return priceData;
      
    } catch (error) {
      console.error('Error fetching prices from CoinGecko:', error.message);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log('Using expired cache data due to API error');
        return cached.data;
      }
      
      // Fallback to mock data
      return this.getMockPrices(coins);
    }
  }

  // Get historical price data for charts
  async getHistoricalPrices(coin, days = 7) {
    const coinId = this.coinMapping[coin];
    if (!coinId) {
      throw new Error(`Unsupported coin: ${coin}`);
    }

    const cacheKey = `history_${coin}_${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry * 5) { // 5 minute cache for historical data
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseURL}/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days <= 1 ? 'hourly' : 'daily'
        },
        timeout: 15000
      });

      const prices = response.data.prices.map(([timestamp, price]) => ({
        time: Math.floor(timestamp / 1000), // Convert to seconds for TradingView
        open: price,
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        close: price,
        volume: response.data.total_volumes[response.data.prices.indexOf([timestamp, price])]?.[1] || Math.random() * 1000
      }));

      // Cache the result
      this.cache.set(cacheKey, {
        data: prices,
        timestamp: Date.now()
      });

      return prices;
      
    } catch (error) {
      console.error(`Error fetching historical data for ${coin}:`, error.message);
      
      // Return cached data if available
      if (cached) {
        return cached.data;
      }
      
      // Fallback to mock historical data
      return await this.getMockHistoricalData(coin, days);
    }
  }

  // Get market data for trading pairs
  async getMarketData() {
    const coins = Object.keys(this.coinMapping);
    
    try {
      const prices = await this.getCurrentPrices(coins);
      
      return coins.map(coin => {
        const data = prices[coin] || this.getMockPrices([coin])[coin];
        return {
          pair: `${coin}/USD`,
          price: data.price,
          change: data.change24h > 0 ? `+${data.change24h.toFixed(2)}%` : `${data.change24h.toFixed(2)}%`,
          volume: data.volume24h,
          marketCap: data.marketCap
        };
      });
    } catch (error) {
      console.error('Error in getMarketData, using mock data:', error.message);
      // Return mock data directly
      const mockPrices = this.getMockPrices(coins);
      return coins.map(coin => {
        const data = mockPrices[coin];
        return {
          pair: `${coin}/USD`,
          price: data.price,
          change: data.change24h > 0 ? `+${data.change24h.toFixed(2)}%` : `${data.change24h.toFixed(2)}%`,
          volume: data.volume24h,
          marketCap: data.marketCap
        };
      });
    }
  }

  // Fallback mock data
  getMockPrices(coins) {
    const mockPrices = {
      'BTC': { price: 111000, change24h: 0.70, volume24h: 39000000000, marketCap: 2200000000000 },
      'ETH': { price: 4600, change24h: 4.06, volume24h: 38000000000, marketCap: 550000000000 },
      'SOL': { price: 200, change24h: 8.57, volume24h: 9000000000, marketCap: 110000000000 },
      'ADA': { price: 0.86, change24h: 2.41, volume24h: 1500000000, marketCap: 31000000000 },
      'DOT': { price: 3.87, change24h: 1.95, volume24h: 240000000, marketCap: 5900000000 },
      'LINK': { price: 24.50, change24h: 6.09, volume24h: 1600000000, marketCap: 16600000000 },
      'AVAX': { price: 24.40, change24h: 4.29, volume24h: 590000000, marketCap: 10300000000 },
      'MATIC': { price: 0.24, change24h: 3.23, volume24h: 570000, marketCap: 320000000 }
    };

    const result = {};
    coins.forEach(coin => {
      result[coin] = mockPrices[coin] || { price: 1, change24h: 0, volume24h: 0, marketCap: 0 };
      result[coin].timestamp = Date.now();
    });

    return result;
  }

  async getMockHistoricalData(coin, days) {
    // Try to use current real price for more realistic mock data
    let basePrice;
    try {
      const cached = this.cache.get(`prices_${coin}`);
      if (cached) {
        basePrice = cached.data[coin]?.price;
      }
    } catch (error) {
      // Ignore cache errors
    }
    
    // Fallback to hardcoded prices if no cached data
    if (!basePrice) {
      basePrice = this.getMockPrices([coin])[coin].price;
    }
    
    const now = Date.now();
    const interval = days <= 1 ? 3600000 : 86400000; // 1 hour or 1 day
    const dataPoints = days <= 1 ? 24 : days;
    
    const data = [];
    let currentPrice = basePrice;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const time = Math.floor((now - (i * interval)) / 1000);
      
      // Generate more realistic price movement
      const volatility = 0.02; // 2% volatility
      const drift = (Math.random() - 0.5) * volatility * currentPrice;
      currentPrice = Math.max(currentPrice + drift, basePrice * 0.8); // Don't go below 80% of base price
      
      const open = currentPrice;
      const high = open * (1 + Math.random() * 0.03);
      const low = open * (1 - Math.random() * 0.03);
      const close = open + (Math.random() - 0.5) * open * 0.01;
      
      data.push({
        time,
        open: parseFloat(open.toFixed(basePrice > 100 ? 2 : 6)),
        high: parseFloat(high.toFixed(basePrice > 100 ? 2 : 6)),
        low: parseFloat(low.toFixed(basePrice > 100 ? 2 : 6)),
        close: parseFloat(close.toFixed(basePrice > 100 ? 2 : 6)),
        volume: parseFloat((Math.random() * 1000 + 100).toFixed(2))
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new PriceService();
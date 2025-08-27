import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const MarketContext = createContext();

export function MarketProvider({ children }) {
  const [marketData, setMarketData] = useState({
    'BTC/USD': {
      price: 45000,
      change: '+2.34%',
      volume: 1234567
    },
    'ETH/USD': {
      price: 3200,
      change: '-1.23%',
      volume: 987654
    },
    'SOL/USD': {
      price: 180,
      change: '+5.67%',
      volume: 456789
    },
    'ADA/USD': {
      price: 0.45,
      change: '+3.12%',
      volume: 234567
    },
    'DOT/USD': {
      price: 25.80,
      change: '-0.89%',
      volume: 345678
    },
    'LINK/USD': {
      price: 15.45,
      change: '+4.56%',
      volume: 456789
    },
    'AVAX/USD': {
      price: 35.20,
      change: '+1.78%',
      volume: 567890
    },
    'MATIC/USD': {
      price: 1.25,
      change: '-2.34%',
      volume: 678901
    }
  });

  // Load initial price data from API
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const response = await api.get('/api/markets');
        const marketMap = {};
        
        response.data.forEach(market => {
          marketMap[market.pair] = {
            price: market.price,
            change: market.change,
            volume: market.volume,
            marketCap: market.marketCap
          };
        });
        
        setMarketData(marketMap);
        console.log('Loaded real market data:', marketMap);
        
      } catch (error) {
        console.error('Failed to load market data:', error);
        // Keep using default/mock data on error
      }
    };
    
    loadPrices();
    
    // Set up periodic price updates
    const interval = setInterval(loadPrices, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const updatePrice = (pair, price) => {
    setMarketData(prev => ({
      ...prev,
      [pair]: {
        ...prev[pair],
        price: price
      }
    }));
  };

  const getCurrentPrice = (pair) => {
    // Default prices for different pairs
    const defaults = {
      'BTC/USD': 45000,
      'ETH/USD': 3200,
      'SOL/USD': 180,
      'ADA/USD': 0.45,
      'DOT/USD': 25.80,
      'LINK/USD': 15.45,
      'AVAX/USD': 35.20,
      'MATIC/USD': 1.25
    };
    
    return marketData[pair]?.price || defaults[pair] || 1000;
  };

  return (
    <MarketContext.Provider value={{ marketData, updatePrice, getCurrentPrice }}>
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
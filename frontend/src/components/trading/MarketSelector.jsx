import React from 'react';
import './MarketSelector.css';

const MarketSelector = ({ selectedPair, onPairChange, currentPrice }) => {
  const markets = [
    { pair: 'BTC/USD', price: 45000, change: '+2.5%' },
    { pair: 'ETH/USD', price: 3200, change: '-1.2%' },
    { pair: 'BNB/USD', price: 450, change: '+0.8%' }
  ];

  const selectedMarket = markets.find(m => m.pair === selectedPair) || markets[0];
  const change = selectedMarket.change;
  const isPositive = change.startsWith('+');

  return (
    <div className="market-selector">
      <div className="current-market">
        <select 
          value={selectedPair} 
          onChange={(e) => onPairChange(e.target.value)}
          className="pair-selector"
        >
          {markets.map(market => (
            <option key={market.pair} value={market.pair}>
              {market.pair}
            </option>
          ))}
        </select>
        
        <div className="market-info">
          <span className="current-price">
            ${(currentPrice || selectedMarket.price).toLocaleString()}
          </span>
          <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
            {change}
          </span>
        </div>
      </div>

      <div className="market-stats">
        <div className="stat">
          <span className="stat-label">24h Volume</span>
          <span className="stat-value">1,234.56</span>
        </div>
        <div className="stat">
          <span className="stat-label">24h High</span>
          <span className="stat-value">${(selectedMarket.price * 1.05).toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">24h Low</span>
          <span className="stat-value">${(selectedMarket.price * 0.95).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default MarketSelector;
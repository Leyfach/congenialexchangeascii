import React, { useState, useEffect } from 'react';
import OrderBook from '../components/trading/OrderBook';
import PriceChart from '../components/trading/PriceChart';
import OrderForm from '../components/trading/OrderForm';
import OrderHistory from '../components/trading/OrderHistory';
import MarketSelector from '../components/trading/MarketSelector';
import './TradingPage.css';

const TradingPage = () => {
  const [selectedPair, setSelectedPair] = useState('BTC/USD');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [orderBookData, setOrderBookData] = useState({ bids: [], asks: [] });

  useEffect(() => {
    // Simulate real-time price updates
    const interval = setInterval(() => {
      const basePrice = selectedPair === 'BTC/USD' ? 45000 : selectedPair === 'ETH/USD' ? 3200 : 450;
      const variation = (Math.random() - 0.5) * 1000;
      setCurrentPrice(basePrice + variation);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedPair]);

  const handleOrderPlaced = (order) => {
    console.log('Order placed:', order);
    // Refresh order book and history
  };

  return (
    <div className="trading-page">
      <div className="trading-header">
        <MarketSelector 
          selectedPair={selectedPair} 
          onPairChange={setSelectedPair}
          currentPrice={currentPrice}
        />
      </div>

      <div className="trading-layout">
        {/* Left Column - Chart */}
        <div className="chart-section">
          <PriceChart pair={selectedPair} />
        </div>

        {/* Middle Column - Order Book */}
        <div className="orderbook-section">
          <OrderBook 
            pair={selectedPair} 
            data={orderBookData}
            currentPrice={currentPrice}
          />
        </div>

        {/* Right Column - Order Form */}
        <div className="order-section">
          <OrderForm 
            pair={selectedPair} 
            currentPrice={currentPrice}
            onOrderPlaced={handleOrderPlaced}
          />
        </div>
      </div>

      {/* Bottom Section - Order History */}
      <div className="history-section">
        <OrderHistory />
      </div>
    </div>
  );
};

export default TradingPage;
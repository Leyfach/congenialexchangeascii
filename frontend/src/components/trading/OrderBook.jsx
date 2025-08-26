import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrderBook.css';

const OrderBook = ({ pair, currentPrice }) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderBook();
    // Simulate real-time updates
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, [pair]);

  const fetchOrderBook = async () => {
    try {
      // Try to get from backend first
      try {
        const response = await axios.get(`http://localhost:3000/api/markets/${pair}/orderbook`);
        setOrderBook(response.data);
      } catch (error) {
        // Fallback to mock data
        generateMockOrderBook();
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order book:', error);
      generateMockOrderBook();
      setLoading(false);
    }
  };

  const generateMockOrderBook = () => {
    const basePrice = currentPrice || (pair === 'BTC/USD' ? 45000 : pair === 'ETH/USD' ? 3200 : 450);
    
    const asks = [];
    const bids = [];

    // Generate asks (sell orders) - above current price
    for (let i = 1; i <= 15; i++) {
      asks.push({
        price: basePrice + (i * (basePrice * 0.001)),
        quantity: Math.random() * 5 + 0.1,
        total: 0
      });
    }

    // Generate bids (buy orders) - below current price
    for (let i = 1; i <= 15; i++) {
      bids.push({
        price: basePrice - (i * (basePrice * 0.001)),
        quantity: Math.random() * 5 + 0.1,
        total: 0
      });
    }

    // Calculate cumulative totals
    let askTotal = 0;
    asks.forEach(ask => {
      askTotal += ask.quantity;
      ask.total = askTotal;
    });

    let bidTotal = 0;
    bids.forEach(bid => {
      bidTotal += bid.quantity;
      bid.total = bidTotal;
    });

    setOrderBook({ asks: asks.slice(0, 10), bids: bids.slice(0, 10) });
  };

  if (loading) {
    return (
      <div className="order-book">
        <h3>Order Book</h3>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="order-book">
      <h3>Order Book - {pair}</h3>
      
      <div className="order-book-header">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      {/* Sell Orders (Asks) */}
      <div className="asks">
        {orderBook.asks.map((ask, index) => (
          <div key={index} className="order-row ask">
            <span className="price">${ask.price.toFixed(2)}</span>
            <span className="quantity">{ask.quantity.toFixed(4)}</span>
            <span className="total">{ask.total.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* Current Price */}
      <div className="current-price">
        <span>${currentPrice.toFixed(2)}</span>
        <span className="spread">Spread: {orderBook.asks[0] && orderBook.bids[0] ? 
          (orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2) : '0.00'}</span>
      </div>

      {/* Buy Orders (Bids) */}
      <div className="bids">
        {orderBook.bids.map((bid, index) => (
          <div key={index} className="order-row bid">
            <span className="price">${bid.price.toFixed(2)}</span>
            <span className="quantity">{bid.quantity.toFixed(4)}</span>
            <span className="total">{bid.total.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
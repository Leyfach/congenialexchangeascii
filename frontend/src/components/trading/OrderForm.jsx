import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrderForm.css';

const OrderForm = ({ pair, currentPrice, onOrderPlaced }) => {
  const [orderType, setOrderType] = useState('limit');
  const [side, setSide] = useState('buy');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [total, setTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    fetchWallets();
  }, []);

  useEffect(() => {
    if (currentPrice && orderType === 'market') {
      setPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, orderType]);

  useEffect(() => {
    // Calculate total when price or quantity changes
    if (price && quantity) {
      setTotal((parseFloat(price) * parseFloat(quantity)).toFixed(2));
    } else {
      setTotal('');
    }
  }, [price, quantity]);

  const fetchWallets = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/wallets');
      setWallets(response.data);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      // Fallback mock data
      setWallets([
        { currency: 'USD', balance: 10000 },
        { currency: 'BTC', balance: 0.5 },
        { currency: 'ETH', balance: 2.3 }
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        pair,
        side,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        type: orderType
      };

      const response = await axios.post('http://localhost:3000/api/orders', orderData);
      
      if (response.data.message === 'Order placed') {
        onOrderPlaced(response.data.order);
        // Reset form
        setQuantity('');
        if (orderType === 'limit') {
          setPrice('');
        }
        setTotal('');
        // Refresh wallets
        fetchWallets();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceClick = (clickPrice) => {
    setPrice(clickPrice.toFixed(2));
  };

  const getBalance = (currency) => {
    const wallet = wallets.find(w => w.currency === currency);
    return wallet ? wallet.balance : 0;
  };

  const [baseCurrency, quoteCurrency] = pair.split('/');
  const availableBalance = side === 'buy' 
    ? getBalance(quoteCurrency) 
    : getBalance(baseCurrency);

  const maxQuantity = side === 'buy' && price 
    ? (availableBalance / parseFloat(price)).toFixed(6)
    : availableBalance.toFixed(6);

  return (
    <div className="order-form">
      <div className="order-tabs">
        <button
          className={`tab ${side === 'buy' ? 'active buy' : ''}`}
          onClick={() => setSide('buy')}
        >
          Buy {baseCurrency}
        </button>
        <button
          className={`tab ${side === 'sell' ? 'active sell' : ''}`}
          onClick={() => setSide('sell')}
        >
          Sell {baseCurrency}
        </button>
      </div>

      <div className="order-type-selector">
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
          <option value="limit">Limit Order</option>
          <option value="market">Market Order</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="order-form-content">
        {orderType === 'limit' && (
          <div className="form-group">
            <label>Price ({quoteCurrency})</label>
            <div className="input-group">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                required
              />
              <button
                type="button"
                className="price-btn"
                onClick={() => handlePriceClick(currentPrice)}
              >
                Market
              </button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Quantity ({baseCurrency})</label>
          <div className="input-group">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              step="0.0001"
              required
            />
            <button
              type="button"
              className="max-btn"
              onClick={() => setQuantity(maxQuantity)}
            >
              MAX
            </button>
          </div>
        </div>

        {orderType === 'limit' && (
          <div className="form-group">
            <label>Total ({quoteCurrency})</label>
            <input
              type="text"
              value={total}
              readOnly
              placeholder="0.00"
              className="total-input"
            />
          </div>
        )}

        <div className="balance-info">
          <span>Available: {availableBalance.toFixed(4)} {side === 'buy' ? quoteCurrency : baseCurrency}</span>
        </div>

        <button
          type="submit"
          className={`submit-btn ${side}`}
          disabled={loading || !quantity || (orderType === 'limit' && !price)}
        >
          {loading ? 'Placing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${baseCurrency}`}
        </button>
      </form>

      <div className="wallet-summary">
        <h4>Wallet Balances</h4>
        {wallets.map(wallet => (
          <div key={wallet.currency} className="wallet-item">
            <span>{wallet.currency}</span>
            <span>{wallet.balance.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderForm;
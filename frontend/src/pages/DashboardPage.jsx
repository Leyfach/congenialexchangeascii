import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DashboardPage.css';

const DashboardPage = () => {
  const [portfolioData, setPortfolioData] = useState({
    totalBalance: 0,
    totalPnL: 0,
    dailyChange: 0,
    assets: []
  });
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioData();
    fetchRecentTrades();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/wallets');
      const wallets = response.data;
      
      // Mock prices for calculation
      const prices = { USD: 1, BTC: 45000, ETH: 3200, BNB: 450 };
      const yesterdayPrices = { USD: 1, BTC: 44000, ETH: 3100, BNB: 445 };
      
      let totalBalance = 0;
      let totalYesterday = 0;
      const assets = [];

      wallets.forEach(wallet => {
        const currentPrice = prices[wallet.currency] || 0;
        const yesterdayPrice = yesterdayPrices[wallet.currency] || 0;
        const value = wallet.balance * currentPrice;
        const yesterdayValue = wallet.balance * yesterdayPrice;
        
        totalBalance += value;
        totalYesterday += yesterdayValue;
        
        if (wallet.balance > 0) {
          assets.push({
            currency: wallet.currency,
            balance: wallet.balance,
            value: value,
            change: ((currentPrice - yesterdayPrice) / yesterdayPrice * 100),
            allocation: 0 // Will calculate after we have total
          });
        }
      });

      // Calculate allocations
      assets.forEach(asset => {
        asset.allocation = (asset.value / totalBalance) * 100;
      });

      const dailyChange = ((totalBalance - totalYesterday) / totalYesterday) * 100;
      const totalPnL = totalBalance - 10000; // Assuming initial deposit was $10k

      setPortfolioData({
        totalBalance,
        totalPnL,
        dailyChange,
        assets
      });

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      // Mock data fallback
      setPortfolioData({
        totalBalance: 12847.35,
        totalPnL: 2847.35,
        dailyChange: 3.45,
        assets: [
          { currency: 'USD', balance: 5000, value: 5000, change: 0, allocation: 38.9 },
          { currency: 'BTC', balance: 0.15, value: 6750, change: 2.3, allocation: 52.5 },
          { currency: 'ETH', balance: 0.34, value: 1088, change: -1.2, allocation: 8.5 },
          { currency: 'BNB', balance: 0.02, value: 9.35, change: 0.8, allocation: 0.1 }
        ]
      });
    }
    setLoading(false);
  };

  const fetchRecentTrades = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/orders?limit=10');
      const orders = response.data.filter(order => order.status === 'completed').slice(0, 5);
      setRecentTrades(orders);
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      // Mock data
      setRecentTrades([
        {
          id: 1,
          pair: 'BTC/USD',
          side: 'buy',
          quantity: 0.001,
          price: 45200,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 2,
          pair: 'ETH/USD',
          side: 'sell',
          quantity: 0.5,
          price: 3180,
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 3,
          pair: 'BTC/USD',
          side: 'buy',
          quantity: 0.002,
          price: 44800,
          created_at: new Date(Date.now() - 10800000).toISOString()
        }
      ]);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
    }
    return `${amount.toFixed(6)} ${currency}`;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="portfolio-summary">
          <div className="summary-card main">
            <span className="summary-label">Total Portfolio</span>
            <span className="summary-value">
              {formatCurrency(portfolioData.totalBalance)}
            </span>
            <span className={`summary-change ${portfolioData.dailyChange >= 0 ? 'positive' : 'negative'}`}>
              {portfolioData.dailyChange >= 0 ? '+' : ''}{portfolioData.dailyChange.toFixed(2)}% (24h)
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total P&L</span>
            <span className={`summary-value ${portfolioData.totalPnL >= 0 ? 'positive' : 'negative'}`}>
              {portfolioData.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolioData.totalPnL)}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Portfolio Breakdown */}
        <div className="dashboard-section">
          <h2>Portfolio Allocation</h2>
          <div className="portfolio-assets">
            {portfolioData.assets.map(asset => (
              <div key={asset.currency} className="asset-card">
                <div className="asset-header">
                  <div className="asset-info">
                    <span className="asset-currency">{asset.currency}</span>
                    <span className="asset-name">
                      {asset.currency === 'BTC' ? 'Bitcoin' : 
                       asset.currency === 'ETH' ? 'Ethereum' :
                       asset.currency === 'BNB' ? 'Binance Coin' : 'US Dollar'}
                    </span>
                  </div>
                  <span className={`asset-change ${asset.change >= 0 ? 'positive' : 'negative'}`}>
                    {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                  </span>
                </div>
                <div className="asset-details">
                  <div className="asset-balance">
                    <span>Balance: {formatCurrency(asset.balance, asset.currency)}</span>
                    <span>Value: {formatCurrency(asset.value)}</span>
                  </div>
                  <div className="asset-allocation">
                    <div className="allocation-bar">
                      <div 
                        className="allocation-fill" 
                        style={{ width: `${asset.allocation}%` }}
                      ></div>
                    </div>
                    <span>{asset.allocation.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Trades</h2>
            <button className="view-all-btn">View All</button>
          </div>
          
          <div className="trades-table">
            <div className="table-header">
              <span>Pair</span>
              <span>Side</span>
              <span>Amount</span>
              <span>Price</span>
              <span>Time</span>
            </div>
            
            <div className="table-body">
              {recentTrades.length === 0 ? (
                <div className="no-trades">
                  No recent trades
                </div>
              ) : (
                recentTrades.map(trade => (
                  <div key={trade.id} className="trade-row">
                    <span className="trade-pair">
                      {trade.pair || `${trade.base_currency}/${trade.quote_currency}`}
                    </span>
                    <span className={`trade-side ${trade.side}`}>
                      {trade.side.toUpperCase()}
                    </span>
                    <span className="trade-amount">
                      {trade.quantity?.toFixed(6) || '0.000000'}
                    </span>
                    <span className="trade-price">
                      ${trade.price?.toFixed(2) || '0.00'}
                    </span>
                    <span className="trade-time">
                      {new Date(trade.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <button className="action-btn deposit">
              <span className="action-icon">↓</span>
              <span>Deposit</span>
            </button>
            <button className="action-btn withdraw">
              <span className="action-icon">↑</span>
              <span>Withdraw</span>
            </button>
            <button className="action-btn trade">
              <span className="action-icon">⇄</span>
              <span>Trade</span>
            </button>
            <button className="action-btn history">
              <span className="action-icon">📊</span>
              <span>History</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
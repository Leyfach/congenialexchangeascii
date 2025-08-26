import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import LandingPage from './pages/LandingPage';
import TradingPage from './pages/TradingPage';
import DashboardPage from './pages/DashboardPage';
import WalletPage from './pages/WalletPage';
import AccountPage from './pages/AccountPage';
import { authService } from './services/auth';
import './App.css';

function App() {
  const [markets, setMarkets] = useState([]);
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [currentPage, setCurrentPage] = useState('landing');

  useEffect(() => {
    // Check if user is already logged in
    if (authService.isAuthenticated()) {
      setUser(authService.getCurrentUser());
      setCurrentPage('dashboard');
    }
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/markets');
      setMarkets(response.data);
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const handleLogin = (userData, token) => {
    authService.storeAuthData(userData, token);
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentPage('landing');
  };

  // Show auth forms if not logged in and not on landing page
  if (!user && (currentPage === 'login' || currentPage === 'register')) {
    if (showRegister || currentPage === 'register') {
      return (
        <Register 
          onLogin={handleLogin} 
          switchToLogin={() => { setShowRegister(false); setCurrentPage('login'); }} 
        />
      );
    } else {
      return (
        <Login 
          onLogin={handleLogin} 
          switchToRegister={() => { setShowRegister(true); setCurrentPage('register'); }} 
        />
      );
    }
  }

  return (
    <div className="App">
      {/* Show landing page for non-authenticated users */}
      {!user && currentPage === 'landing' && (
        <LandingPage onNavigate={setCurrentPage} />
      )}

      {/* Show main app for authenticated users */}
      {user && (
        <>
          <header className="App-header">
            <div className="header-content">
              <div className="brand-section">
                <h1>🚀 CryptoEx</h1>
              </div>
              <div className="nav-buttons">
                <button 
                  className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('dashboard')}
                >
                  Dashboard
                </button>
                <button 
                  className={`nav-btn ${currentPage === 'markets' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('markets')}
                >
                  Markets
                </button>
                <button 
                  className={`nav-btn ${currentPage === 'trading' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('trading')}
                >
                  Trading
                </button>
                <button 
                  className={`nav-btn ${currentPage === 'wallet' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('wallet')}
                >
                  Wallet
                </button>
                <button 
                  className={`nav-btn ${currentPage === 'account' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('account')}
                >
                  Account
                </button>
              </div>
              <div className="header-actions">
                <button onClick={handleLogout} className="logout-button">
                  Logout
                </button>
              </div>
            </div>
          </header>
          
          <main className="main-content">
            {currentPage === 'dashboard' && <DashboardPage />}
            {currentPage === 'trading' && <TradingPage />}
            {currentPage === 'wallet' && <WalletPage />}
            {currentPage === 'account' && <AccountPage />}
            {currentPage === 'markets' && (
              <div className="markets-page">
                <div className="markets-hero">
                  <div className="markets-header">
                    <h1>Crypto Markets</h1>
                    <p>Trade 500+ cryptocurrencies with advanced charting and analytics</p>
                  </div>
                  <div className="market-stats">
                    <div className="stat-card">
                      <div className="stat-value">$2.1T</div>
                      <div className="stat-label">Market Cap</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">$89.2B</div>
                      <div className="stat-label">24h Volume</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">45.2%</div>
                      <div className="stat-label">BTC Dominance</div>
                    </div>
                  </div>
                </div>
                
                <div className="markets-container">
                  <div className="markets-filters">
                    <div className="filter-tabs">
                      <button className="filter-tab active">All Markets</button>
                      <button className="filter-tab">Favorites</button>
                      <button className="filter-tab">DeFi</button>
                      <button className="filter-tab">Gainers</button>
                      <button className="filter-tab">Losers</button>
                    </div>
                    <div className="search-bar">
                      <input type="text" placeholder="Search coins..." />
                    </div>
                  </div>
                  
                  <div className="markets-table">
                    <div className="table-header">
                      <span className="col-rank">#</span>
                      <span className="col-name">Name</span>
                      <span className="col-price">Price</span>
                      <span className="col-change">24h %</span>
                      <span className="col-volume">24h Volume</span>
                      <span className="col-market-cap">Market Cap</span>
                      <span className="col-action">Trade</span>
                    </div>
                    
                    {[
                      { rank: 1, symbol: 'BTC', name: 'Bitcoin', price: 67420, change: '+2.34', volume: '28.7B', marketCap: '1.33T', icon: '₿' },
                      { rank: 2, symbol: 'ETH', name: 'Ethereum', price: 3842, change: '+4.12', volume: '18.9B', marketCap: '462.1B', icon: 'Ξ' },
                      { rank: 3, symbol: 'BNB', name: 'BNB', price: 634, change: '-1.23', volume: '2.1B', marketCap: '92.4B', icon: 'BNB' },
                      { rank: 4, symbol: 'SOL', name: 'Solana', price: 187, change: '+8.97', volume: '3.2B', marketCap: '83.7B', icon: 'SOL' },
                      { rank: 5, symbol: 'ADA', name: 'Cardano', price: 0.52, change: '-2.11', volume: '892M', marketCap: '18.3B', icon: 'ADA' },
                      { rank: 6, symbol: 'AVAX', name: 'Avalanche', price: 42.1, change: '+5.67', volume: '647M', marketCap: '16.8B', icon: 'AVAX' },
                      { rank: 7, symbol: 'DOT', name: 'Polkadot', price: 7.89, change: '+1.45', volume: '234M', marketCap: '10.2B', icon: 'DOT' },
                      { rank: 8, symbol: 'LINK', name: 'Chainlink', price: 18.43, change: '+3.21', volume: '456M', marketCap: '11.1B', icon: 'LINK' }
                    ].map((token, index) => (
                      <div key={index} className="market-row" onClick={() => setCurrentPage('trading')}>
                        <div className="col-rank">{token.rank}</div>
                        <div className="col-name">
                          <div className="token-info">
                            <div className="token-icon">{token.icon}</div>
                            <div className="token-details">
                              <div className="token-name">{token.name}</div>
                              <div className="token-symbol">{token.symbol}</div>
                            </div>
                          </div>
                        </div>
                        <div className="col-price">${token.price.toLocaleString()}</div>
                        <div className={`col-change ${token.change.startsWith('+') ? 'positive' : 'negative'}`}>
                          {token.change}%
                        </div>
                        <div className="col-volume">${token.volume}</div>
                        <div className="col-market-cap">${token.marketCap}</div>
                        <div className="col-action">
                          <button className="buy-btn" onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage('trading');
                          }}>
                            BUY
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* Show auth prompt on markets page for non-authenticated users */}
      {!user && currentPage === 'markets' && (
        <div className="auth-prompt">
          <div className="auth-prompt-content">
            <h2>Sign in to start trading</h2>
            <p>Join thousands of traders on CryptoEx</p>
            <div className="auth-buttons">
              <button 
                className="auth-btn login"
                onClick={() => setCurrentPage('login')}
              >
                Login
              </button>
              <button 
                className="auth-btn register"
                onClick={() => setCurrentPage('register')}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
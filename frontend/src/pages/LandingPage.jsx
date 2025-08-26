import React from 'react';
import './LandingPage.css';

const LandingPage = ({ onNavigate }) => {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="nav-brand">
          <span className="brand-text">CryptoEx</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <div className="landing-content">
        <div className="hero-left">
          <div className="cta-buttons">
            <button 
              className="cta-btn primary"
              onClick={() => onNavigate('markets')}
            >
              <span className="btn-icon">📈</span>
              <span className="btn-text">TRADE NOW</span>
              <span className="btn-subtitle">Start trading cryptocurrencies</span>
            </button>
            
            <button 
              className="cta-btn secondary"
              onClick={() => onNavigate('markets')}
            >
              <span className="btn-icon">💰</span>
              <span className="btn-text">BUY SPOT</span>
              <span className="btn-subtitle">Purchase crypto instantly</span>
            </button>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-content">
            <h1 className="hero-title">
              Trade Crypto Like a
              <span className="gradient-text"> Professional</span>
            </h1>
            <p className="hero-subtitle">
              Advanced trading tools, real-time market data, and institutional-grade security. 
              Join millions of traders who trust CryptoEx for their cryptocurrency needs.
            </p>
            
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">$2.1B+</div>
                <div className="stat-label">24h Volume</div>
              </div>
              <div className="stat">
                <div className="stat-number">1M+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat">
                <div className="stat-number">200+</div>
                <div className="stat-label">Cryptocurrencies</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="floating-elements">
        <div className="crypto-card btc">
          <div className="crypto-icon">₿</div>
          <div className="crypto-price">$45,231</div>
          <div className="crypto-change positive">+2.4%</div>
        </div>
        
        <div className="crypto-card eth">
          <div className="crypto-icon">Ξ</div>
          <div className="crypto-price">$3,198</div>
          <div className="crypto-change negative">-1.2%</div>
        </div>
        
        <div className="crypto-card bnb">
          <div className="crypto-icon">⬡</div>
          <div className="crypto-price">$449</div>
          <div className="crypto-change positive">+0.8%</div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
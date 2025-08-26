import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WalletPage.css';

const WalletPage = () => {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('all');

  useEffect(() => {
    fetchWallets();
    fetchTransactions();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/wallets');
      setWallets(response.data);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      // Mock data fallback
      setWallets([
        { currency: 'USD', balance: 10000.50, locked_balance: 250.00 },
        { currency: 'BTC', balance: 0.15432, locked_balance: 0.00145 },
        { currency: 'ETH', balance: 2.3456, locked_balance: 0.1234 },
        { currency: 'BNB', balance: 45.67, locked_balance: 2.34 }
      ]);
    }
    setLoading(false);
  };

  const fetchTransactions = async () => {
    try {
      // Mock transaction data since we don't have the endpoint yet
      setTransactions([
        {
          id: 1,
          type: 'deposit',
          currency: 'USD',
          amount: 1000,
          status: 'completed',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          tx_hash: '0x1a2b3c4d...'
        },
        {
          id: 2,
          type: 'trade',
          currency: 'BTC',
          amount: 0.01,
          status: 'completed',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          tx_hash: null
        },
        {
          id: 3,
          type: 'withdrawal',
          currency: 'ETH',
          amount: -0.5,
          status: 'pending',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          tx_hash: '0x5e6f7g8h...'
        }
      ]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getTotalBalance = () => {
    // Mock USD conversion rates
    const rates = { USD: 1, BTC: 45000, ETH: 3200, BNB: 450 };
    
    return wallets.reduce((total, wallet) => {
      const rate = rates[wallet.currency] || 0;
      return total + (wallet.balance * rate);
    }, 0);
  };

  const getFilteredTransactions = () => {
    if (selectedCurrency === 'all') return transactions;
    return transactions.filter(tx => tx.currency === selectedCurrency);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#0ecb81';
      case 'pending': return '#ffd700';
      case 'failed': return '#f6465d';
      default: return '#888';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit': return '↓';
      case 'withdrawal': return '↑';
      case 'trade': return '⇄';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="loading">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="wallet-header">
        <h1>Wallet</h1>
        <div className="total-balance">
          <span className="balance-label">Total Balance</span>
          <span className="balance-amount">${getTotalBalance().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
        </div>
      </div>

      {/* Wallet Balances */}
      <div className="wallet-section">
        <h2>Balances</h2>
        <div className="wallets-grid">
          {wallets.map(wallet => (
            <div key={wallet.currency} className="wallet-card">
              <div className="wallet-header-card">
                <span className="currency-name">{wallet.currency}</span>
                <span className="currency-full">
                  {wallet.currency === 'BTC' ? 'Bitcoin' : 
                   wallet.currency === 'ETH' ? 'Ethereum' :
                   wallet.currency === 'BNB' ? 'Binance Coin' : 'US Dollar'}
                </span>
              </div>
              <div className="wallet-balances">
                <div className="balance-row">
                  <span>Available:</span>
                  <span className="balance-value">
                    {wallet.balance.toFixed(wallet.currency === 'USD' ? 2 : 6)} {wallet.currency}
                  </span>
                </div>
                {wallet.locked_balance > 0 && (
                  <div className="balance-row">
                    <span>In Orders:</span>
                    <span className="locked-balance">
                      {wallet.locked_balance.toFixed(wallet.currency === 'USD' ? 2 : 6)} {wallet.currency}
                    </span>
                  </div>
                )}
              </div>
              <div className="wallet-actions">
                <button className="deposit-btn">Deposit</button>
                <button className="withdraw-btn">Withdraw</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="wallet-section">
        <div className="section-header">
          <h2>Transaction History</h2>
          <select 
            value={selectedCurrency} 
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="currency-filter"
          >
            <option value="all">All Currencies</option>
            {wallets.map(wallet => (
              <option key={wallet.currency} value={wallet.currency}>
                {wallet.currency}
              </option>
            ))}
          </select>
        </div>

        <div className="transactions-table">
          <div className="table-header">
            <span>Type</span>
            <span>Currency</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Time</span>
            <span>TX Hash</span>
          </div>

          <div className="table-body">
            {getFilteredTransactions().length === 0 ? (
              <div className="no-transactions">
                No transactions found
              </div>
            ) : (
              getFilteredTransactions().map(tx => (
                <div key={tx.id} className="transaction-row">
                  <span className="tx-type">
                    <span className="type-icon">{getTypeIcon(tx.type)}</span>
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                  </span>
                  <span className="tx-currency">{tx.currency}</span>
                  <span className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(6)}
                  </span>
                  <span 
                    className="tx-status"
                    style={{ color: getStatusColor(tx.status) }}
                  >
                    {tx.status.toUpperCase()}
                  </span>
                  <span className="tx-time">
                    {new Date(tx.created_at).toLocaleString()}
                  </span>
                  <span className="tx-hash">
                    {tx.tx_hash ? (
                      <a href="#" className="hash-link">
                        {tx.tx_hash.slice(0, 10)}...
                      </a>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
import { useEffect, useState } from 'react'
import api from '../services/api.js'

export default function WalletPage(){
  const [data, setData] = useState(null)
  const [wallets, setWallets] = useState([])
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [activeTab, setActiveTab] = useState('balances')
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    loadData()
  },[])

  const loadData = async() => {
    setLoading(true)
    try { 
      const [walletData, walletsData, depositsData, withdrawalsData] = await Promise.all([
        api.get('/api/user/wallet'),
        api.get('/api/user/wallets'),
        api.get('/api/user/deposits'),
        api.get('/api/user/withdrawals')
      ])
      
      setData(walletData.data)
      setWallets(walletsData.data.wallets || [])
      setDeposits(depositsData.data || [])
      setWithdrawals(withdrawalsData.data || [])
    } catch (error) {
      console.error('Error loading wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateWallets = async() => {
    setLoading(true)
    try {
      const response = await api.post('/api/user/generate-wallets')
      if (response.data.wallets) {
        setWallets(response.data.wallets)
      }
      console.log('Wallets generated:', response.data.message)
    } catch (error) {
      console.error('Error generating wallets:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const showPrivateKey = async (network, currency) => {
    try {
      const response = await api.get(`/api/user/wallets/${network}/${currency}/details`)
      const wallet = response.data.wallet
      
      const message = `🔑 PRIVATE KEY (${currency} - ${network})\n\n` +
                     `Address: ${wallet.address}\n` +
                     `Public Key: ${wallet.publicKey}\n` +
                     `Private Key: ${wallet.privateKey}\n\n` +
                     `⚠️ KEEP THIS SECRET! Never share your private key!`
      
      alert(message)
    } catch (error) {
      console.error('Error fetching private key:', error)
      alert('Failed to fetch private key')
    }
  }

  const getNetworkIcon = (network) => {
    const icons = {
      ethereum: '⟠',
      solana: '◎', 
      bitcoin: '₿'
    }
    return icons[network] || '🪙'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">WALLET MANAGEMENT</h3>
          <div className="flex items-center gap-2">
            <span className="badge-green">LIVE</span>
            <button 
              onClick={loadData}
              disabled={loading}
              className="text-xs px-2 py-1 text-green-500 hover:text-green-300 disabled:opacity-50"
            >
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-green-500/30 mb-4">
          {['balances', 'addresses', 'deposits', 'withdrawals'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-green-500 text-green-300' 
                  : 'border-transparent text-green-300/60 hover:text-green-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="ascii-panel p-4">
              <div className="text-green-300/80 mb-2">Account Balances</div>
              {!data ? 'Loading…' : (
                <div className="space-y-2 text-sm">
                  {(data.balances || []).map((balance, i)=> (
                    <div key={i} className="flex justify-between items-center p-2 rounded border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{balance.currency}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-neon-matrix">
                          {parseFloat(balance.balance).toFixed(balance.currency === 'USD' ? 2 : 6)}
                        </div>
                        <div className="text-xs text-green-300/60">
                          Available: {parseFloat(balance.available).toFixed(balance.currency === 'USD' ? 2 : 6)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-green-500/30 mt-4">
                    <div className="text-lg text-neon-matrix">
                      Total USD Value: ${data.totalUSD?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="ascii-panel p-4">
              <div className="text-green-300/80 mb-2">Quick Actions</div>
              <div className="space-y-2">
                <button className="ascii-btn w-full py-2" disabled>
                  💰 Deposit Crypto
                </button>
                <button className="ascii-btn w-full py-2" disabled>
                  📤 Withdraw Crypto
                </button>
                <button className="ascii-btn w-full py-2" disabled>
                  🔄 Internal Transfer
                </button>
              </div>
              <div className="mt-4 text-xs text-green-300/60">
                Deposit/Withdraw features coming soon. Use the trading interface for now.
              </div>
            </div>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-green-300">Deposit Addresses</h4>
              {wallets.length === 0 && (
                <button 
                  onClick={generateWallets}
                  disabled={loading}
                  className="ascii-btn px-3 py-1 disabled:opacity-50"
                >
                  {loading ? 'GENERATING...' : 'GENERATE WALLETS'}
                </button>
              )}
            </div>
            
            {wallets.length > 0 ? (
              <div className="grid gap-4">
                {wallets.map((wallet, i) => (
                  <div key={i} className="ascii-panel p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getNetworkIcon(wallet.network)}</span>
                        <div>
                          <div className="font-bold text-green-300">{wallet.currency}</div>
                          <div className="text-xs text-green-300/60 capitalize">{wallet.network} Network</div>
                        </div>
                      </div>
                      <span className="badge-green text-xs">ACTIVE</span>
                    </div>
                    
                    <div className="bg-black/50 p-3 rounded border border-green-500/20">
                      <div className="text-xs text-green-300/60 mb-1">Deposit Address:</div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-neon-matrix text-sm break-all flex-1">{wallet.address}</code>
                        <button 
                          onClick={() => copyToClipboard(wallet.address)}
                          className="text-green-500 hover:text-green-300 px-2 py-1 text-xs"
                          title="Copy address"
                        >
                          📋
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => showPrivateKey(wallet.network, wallet.currency)}
                          className="text-yellow-500 hover:text-yellow-300 px-2 py-1 text-xs border border-yellow-500/30 rounded"
                          title="Show private key (DEVELOPMENT ONLY)"
                        >
                          🔑 Private Key
                        </button>
                        <div className="text-xs text-red-400/60 flex items-center">
                          ⚠️ Dev mode only
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-green-300/60 mt-2">
                      Created: {new Date(wallet.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-green-300/60">
                <div className="text-4xl mb-2">🏦</div>
                <div>No deposit addresses generated yet.</div>
                <div className="text-xs mt-1">Click "Generate Wallets" to create your crypto deposit addresses.</div>
              </div>
            )}
          </div>
        )}

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <div>
            <h4 className="text-green-300 mb-4">Deposit History</h4>
            {deposits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Currency</th>
                      <th>Amount</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>TX Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((deposit, i) => (
                      <tr key={i}>
                        <td>{new Date(deposit.created_at).toLocaleString()}</td>
                        <td>{deposit.currency}</td>
                        <td>{deposit.amount}</td>
                        <td className="font-mono text-xs">{deposit.address?.slice(0, 10)}...</td>
                        <td>
                          <span className={`badge-${deposit.status === 'confirmed' ? 'green' : 'yellow'}`}>
                            {deposit.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{deposit.tx_hash || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-green-300/60">
                <div className="text-4xl mb-2">📥</div>
                <div>No deposits yet.</div>
                <div className="text-xs mt-1">Your deposit history will appear here.</div>
              </div>
            )}
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div>
            <h4 className="text-green-300 mb-4">Withdrawal History</h4>
            {withdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Currency</th>
                      <th>Amount</th>
                      <th>Destination</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th>TX Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal, i) => (
                      <tr key={i}>
                        <td>{new Date(withdrawal.created_at).toLocaleString()}</td>
                        <td>{withdrawal.currency}</td>
                        <td>{withdrawal.amount}</td>
                        <td className="font-mono text-xs">{withdrawal.destination_address?.slice(0, 10)}...</td>
                        <td>{withdrawal.fee || '0.00'}</td>
                        <td>
                          <span className={`badge-${withdrawal.status === 'completed' ? 'green' : 'yellow'}`}>
                            {withdrawal.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{withdrawal.tx_hash || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-green-300/60">
                <div className="text-4xl mb-2">📤</div>
                <div>No withdrawals yet.</div>
                <div className="text-xs mt-1">Your withdrawal history will appear here.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import api from '../services/api.js'
import { formatCurrency } from '../utils/helpers.js'

export default function DashboardPage(){
  const [wallet, setWallet] = useState(null)
  const [trades, setTrades] = useState([])
  const [selectedAsset, setSelectedAsset] = useState('USD')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(()=>{
    const load = async () => {
      try {
        const [{data: w}, {data: t}] = await Promise.all([
          api.get('/api/user/wallet'),
          api.get('/api/user/trades')
        ])
        setWallet(w)
        setTrades(t)
      } catch {}
    }
    load()
  },[])

  const getAssetInfo = (symbol) => {
    const icons = {
      USD: '💵', BTC: '₿', ETH: 'Ξ', BNB: '🔶'
    }
    const names = {
      USD: 'US Dollar', BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'Binance Coin'
    }
    return { icon: icons[symbol] || '🪙', name: names[symbol] || symbol }
  }

  const getEquityDistribution = () => {
    if (!wallet?.balances) return []
    const total = wallet.equity || 1
    const rates = { BTC: 64850, ETH: 3200, BNB: 600, USD: 1 }
    
    return Object.entries(wallet.balances).map(([symbol, balance]) => {
      const value = parseFloat(balance) * (rates[symbol] || 1)
      const percentage = (value / total) * 100
      return { symbol, balance: parseFloat(balance), value, percentage }
    }).filter(item => item.balance > 0).sort((a, b) => b.value - a.value)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card ascii-border lg:col-span-2">
          <div className="card-header">
            <h3 className="card-title">PORTFOLIO</h3>
            <div className="flex items-center gap-2">
              <span className="badge-green">LIVE</span>
              <div className="relative">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="ascii-btn text-xs px-2 py-1 flex items-center gap-1"
                >
                  {getAssetInfo(selectedAsset).icon} {selectedAsset}
                  <span className="text-green-300/50">▼</span>
                </button>
                {showDropdown && wallet?.balances && (
                  <div className="absolute right-0 top-full mt-1 bg-black border border-green-500/50 rounded z-10 min-w-32">
                    {Object.keys(wallet.balances).map(asset => (
                      <button
                        key={asset}
                        onClick={() => {
                          setSelectedAsset(asset)
                          setShowDropdown(false)
                        }}
                        className="block w-full px-3 py-2 text-left hover:bg-green-500/10 text-sm border-b border-green-500/20 last:border-b-0"
                      >
                        {getAssetInfo(asset).icon} {asset}
                        <div className="text-xs text-green-300/60">{getAssetInfo(asset).name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {!wallet ? 'Loading…' : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(wallet.balances || {}).map(([symbol, balance]) => {
                  const assetInfo = getAssetInfo(symbol)
                  const isSelected = symbol === selectedAsset
                  return (
                    <div 
                      key={symbol} 
                      className={`ascii-panel p-3 cursor-pointer transition-all ${
                        isSelected ? 'border-neon-matrix bg-green-500/5' : 'hover:border-green-400/60'
                      }`}
                      onClick={() => setSelectedAsset(symbol)}
                    >
                      <div className="flex items-center gap-1 text-sm text-green-300/70 mb-1">
                        <span>{assetInfo.icon}</span>
                        <span>{symbol}</span>
                      </div>
                      <div className="text-lg text-neon-matrix">{parseFloat(balance).toFixed(symbol === 'USD' ? 2 : 6)}</div>
                      <div className="text-xs text-green-300/50">{assetInfo.name}</div>
                    </div>
                  )
                })}
              </div>
              
              <div className="ascii-panel p-4">
                <div className="text-sm text-green-300/70 mb-3">PORTFOLIO DISTRIBUTION</div>
                <div className="space-y-2">
                  {getEquityDistribution().map(item => (
                    <div key={item.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getAssetInfo(item.symbol).icon}</span>
                        <span className="text-sm">{item.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-neon-matrix h-2 rounded-full"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-sm text-neon-matrix min-w-[3rem] text-right">
                          {item.percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-green-300/60 min-w-[4rem] text-right">
                          ${item.value.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="card ascii-border">
          <div className="card-header"><h3 className="card-title">STATS</h3><span className="badge-green">SIM</span></div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Equity</span><span>{wallet? formatCurrency(wallet.equity) : '—'}</span></div>
            <div className="flex justify-between"><span>PnL 24h</span><span className={wallet && wallet.pnl24h>=0? 'price-up':'price-down'}>{wallet? wallet.pnl24h.toFixed(2)+'%':'—'}</span></div>
            <div className="flex justify-between"><span>Mkt Exposure</span><span>{wallet? wallet.exposure+'%':'—'}</span></div>
          </div>
        </div>
      </div>

      <div className="card ascii-border">
        <div className="card-header"><h3 className="card-title">RECENT TRADES</h3><span className="badge-green">HISTORY</span></div>
        {!trades?.length ? 'No trades' : (
          <table className="table">
            <thead><tr><th>TIME</th><th>PAIR</th><th>SIDE</th><th>PRICE</th><th>AMOUNT</th></tr></thead>
            <tbody>
              {trades.map((t,i)=> (
                <tr key={i}>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.pair}</td>
                  <td className={t.side==='buy'?'price-up':'price-down'}>{t.side.toUpperCase()}</td>
                  <td>{formatCurrency(t.price)}</td>
                  <td>{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
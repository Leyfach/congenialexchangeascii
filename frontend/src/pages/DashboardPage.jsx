import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api.js'
import { formatCurrency } from '../utils/helpers.js'
import TokenIcon from '../components/common/TokenIcons.jsx'


export default function DashboardPage(){
  const { t } = useTranslation()
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
        console.log('Dashboard loaded:', w.balances?.length, 'balances')
      } catch (e) {
        console.error('Dashboard load error:', e)
      }
    }
    load()
  },[])

  const getAssetInfo = (symbol) => {
    const names = {
      USD: 'US Dollar', 
      BTC: 'Bitcoin', 
      ETH: 'Ethereum', 
      SOL: 'Solana',
      ADA: 'Cardano',
      DOT: 'Polkadot',
      LINK: 'Chainlink',
      AVAX: 'Avalanche',
      MATIC: 'Polygon'
    }
    return { name: names[symbol] || symbol }
  }

  const getEquityDistribution = () => {
    if (!wallet?.balances || !Array.isArray(wallet.balances)) return []
    const total = wallet.totalUSD || 1
    const rates = { 
      BTC: 45000, 
      ETH: 3200, 
      SOL: 180,
      ADA: 0.45,
      DOT: 25.80,
      LINK: 15.45,
      AVAX: 35.20,
      MATIC: 1.25,
      USD: 1 
    }
    
    return wallet.balances.map(item => {
      const balance = parseFloat(item.balance) || 0
      const value = balance * (rates[item.currency] || 1)
      const percentage = (value / total) * 100
      return { 
        symbol: item.currency, 
        balance: balance, 
        value, 
        percentage 
      }
    }).filter(item => item.balance > 0).sort((a, b) => b.value - a.value)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card ascii-border lg:col-span-2">
          <div className="card-header">
            <h3 className="card-title">{t('dashboard.portfolioValue').toUpperCase()}</h3>
            <div className="flex items-center gap-2">
              <span className="badge-green">LIVE</span>
              <button 
                onClick={() => {
                  setWallet(null);
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
                }}
                className="text-xs px-2 py-1 text-green-500 hover:text-green-300"
              >
{t('common.refresh').toUpperCase()}
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="ascii-btn text-xs px-2 py-1 flex items-center gap-1"
                >
                  <TokenIcon symbol={selectedAsset} /> {selectedAsset}
                  <span className="text-green-300/50">▼</span>
                </button>
                {showDropdown && wallet?.balances && Array.isArray(wallet.balances) && (
                  <div className="absolute right-0 top-full mt-1 bg-black border border-green-500/50 rounded z-10 min-w-32">
                    {wallet.balances.map(item => (
                      <button
                        key={item.currency}
                        onClick={() => {
                          setSelectedAsset(item.currency)
                          setShowDropdown(false)
                        }}
                        className="block w-full px-3 py-2 text-left hover:bg-green-500/10 text-sm border-b border-green-500/20 last:border-b-0"
                      >
                        <span className="inline-flex items-center gap-2">
                        <TokenIcon symbol={item.currency} />
                        {item.currency}
                        </span>
                        <div className="text-xs text-green-300/60">{getAssetInfo(item.currency).name}</div>
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
                {(wallet.balances || []).map((item, i) => {
                  const assetInfo = getAssetInfo(item.currency)
                  const isSelected = item.currency === selectedAsset
                  return (
                    <div 
                      key={i} 
                      className={`ascii-panel p-3 cursor-pointer transition-all ${
                        isSelected ? 'border-neon-matrix bg-green-500/5' : 'hover:border-green-400/60'
                      }`}
                      onClick={() => setSelectedAsset(item.currency)}
                    >
                      <div className="flex items-center gap-1 text-sm text-green-300/70 mb-1">
                        <TokenIcon symbol={item.currency} />
                        <span>{item.currency}</span>
                      </div>
                      <div className="text-lg text-neon-matrix">{parseFloat(item.balance).toFixed(item.currency === 'USD' ? 2 : 6)}</div>
                      <div className="text-xs text-green-300/50">{assetInfo.name}</div>
                    </div>
                  )
                })}
              </div>
              
              <div className="ascii-panel p-4">
                <div className="text-sm text-green-300/70 mb-3">{t('dashboard.portfolioValue').toUpperCase()} DISTRIBUTION</div>
                <div className="space-y-2">
                  {getEquityDistribution().map(item => (
                    <div key={item.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TokenIcon symbol={item.symbol} />
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
            <div className="flex justify-between"><span>Equity</span><span>{wallet? formatCurrency(wallet.totalUSD) : '—'}</span></div>
            <div className="flex justify-between"><span>PnL 24h</span><span className="price-up">+2.34%</span></div>
            <div className="flex justify-between"><span>Available</span><span>{wallet? `${wallet.balances?.length || 0} assets` : '—'}</span></div>
          </div>
        </div>
      </div>

      <div className="card ascii-border">
        <div className="card-header"><h3 className="card-title">{t('dashboard.recentTrades').toUpperCase()}</h3><span className="badge-green">HISTORY</span></div>
        {!trades?.length ? 'No trades' : (
          <table className="table">
            <thead><tr><th>TIME</th><th>PAIR</th><th>SIDE</th><th>PRICE</th><th>AMOUNT</th></tr></thead>
            <tbody>
              {trades.map((t,i)=> (
                <tr key={i}>
                  <td>{new Date(t.timestamp).toLocaleString()}</td>
                  <td>{t.pair}</td>
                  <td className={t.type==='buy'?'price-up':'price-down'}>{t.type.toUpperCase()}</td>
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
import { useState, useEffect } from 'react'
import api from '../../services/api.js'

export default function MarginTradingPanel({ pair }) {
  const [positions, setPositions] = useState([])
  const [marginBalance, setMarginBalance] = useState(null)
  const [marginStats, setMarginStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // New position form
  const [side, setSide] = useState('long')
  const [size, setSize] = useState('')
  const [leverage, setLeverage] = useState('2')
  const [entryPrice, setEntryPrice] = useState('')
  const [showPositionForm, setShowPositionForm] = useState(false)

  useEffect(() => {
    fetchMarginData()
  }, [])

  const fetchMarginData = async () => {
    try {
      setLoading(true)
      
      const [positionsRes, balanceRes, statsRes] = await Promise.all([
        api.get('/api/trading/margin/positions'),
        api.get('/api/trading/margin/balance'),
        api.get('/api/trading/margin/stats')
      ])

      if (positionsRes.data.success) setPositions(positionsRes.data.data)
      if (balanceRes.data.success) setMarginBalance(balanceRes.data.data)
      if (statsRes.data.success) setMarginStats(statsRes.data.data)
      
    } catch (error) {
      console.error('Error fetching margin data:', error)
      setError('Failed to load margin trading data')
    }
    
    setLoading(false)
  }

  const openPosition = async (e) => {
    e.preventDefault()
    
    try {
      const response = await api.post('/api/trading/margin/positions', {
        pair,
        side,
        size: parseFloat(size),
        leverage: parseFloat(leverage),
        entryPrice: parseFloat(entryPrice)
      })

      if (response.data.success) {
        setSize('')
        setEntryPrice('')
        setShowPositionForm(false)
        await fetchMarginData()
      } else {
        setError(response.data.error)
      }
    } catch (error) {
      console.error('Error opening position:', error)
      setError(error.response?.data?.error || 'Failed to open position')
    }
  }

  const closePosition = async (positionId) => {
    try {
      // Use current market price as close price (simplified)
      const closePrice = parseFloat(entryPrice) || 100 // Mock price
      
      const response = await api.post(`/api/trading/margin/positions/${positionId}/close`, {
        closePrice
      })

      if (response.data.success) {
        await fetchMarginData()
      } else {
        setError(response.data.error)
      }
    } catch (error) {
      console.error('Error closing position:', error)
      setError(error.response?.data?.error || 'Failed to close position')
    }
  }

  const calculatePnL = (position, currentPrice) => {
    const priceChange = currentPrice - position.entryPrice
    
    if (position.side === 'long') {
      return position.size * priceChange
    } else {
      return position.size * -priceChange
    }
  }

  const getPnLColor = (pnl) => {
    if (pnl > 0) return 'text-green-400'
    if (pnl < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  const getRiskColor = (marginLevel) => {
    if (marginLevel < 20) return 'text-red-400'
    if (marginLevel < 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  if (loading) {
    return (
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">MARGIN_TRADING</h3>
        </div>
        <div className="p-6 text-center">
          <span className="text-blue-400">Loading margin data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Margin Account Overview */}
      {marginBalance && (
        <div className="card ascii-border">
          <div className="card-header">
            <h3 className="card-title">MARGIN_ACCOUNT</h3>
            <span className="badge-blue">
              {marginStats?.availableLeverage}X MAX
            </span>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded p-3">
                <div className="text-xs text-gray-400">Total Collateral</div>
                <div className="text-lg font-mono text-white">
                  ${marginBalance.totalCollateral.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded p-3">
                <div className="text-xs text-gray-400">Used Margin</div>
                <div className="text-lg font-mono text-yellow-400">
                  ${marginBalance.usedMargin.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded p-3">
                <div className="text-xs text-gray-400">Available</div>
                <div className="text-lg font-mono text-green-400">
                  ${marginBalance.availableCollateral.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded p-3">
                <div className="text-xs text-gray-400">Margin Level</div>
                <div className={`text-lg font-mono ${getRiskColor(marginBalance.marginLevel)}`}>
                  {marginBalance.marginLevel.toFixed(1)}%
                </div>
              </div>
            </div>

            {marginStats && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">
                    Open Positions: {marginStats.openPositions}
                  </span>
                  <span className={`font-mono ${getPnLColor(marginStats.totalUnrealizedPnl)}`}>
                    Unrealized P&L: ${marginStats.totalUnrealizedPnl.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open Position Button */}
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">NEW_POSITION</h3>
          <button
            onClick={() => setShowPositionForm(!showPositionForm)}
            className="ascii-btn-small bg-blue-600 hover:bg-blue-700"
          >
            {showPositionForm ? 'HIDE' : 'OPEN POSITION'}
          </button>
        </div>

        {showPositionForm && (
          <div className="p-6">
            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded px-4 py-2 mb-4">
                <span className="text-red-400">{error}</span>
              </div>
            )}

            <form onSubmit={openPosition} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('long')}
                  className={`ascii-btn ${side === 'long' ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setSide('short')}
                  className={`ascii-btn ${side === 'short' ? 'bg-red-600' : 'bg-gray-600'}`}
                >
                  SHORT
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Size
                  </label>
                  <input
                    type="number"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="ascii-input w-full"
                    placeholder="0.00"
                    step="0.00000001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="ascii-input w-full"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Leverage: {leverage}x
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1x</span>
                  <span>5x</span>
                  <span>10x</span>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500 rounded p-3">
                <div className="text-xs text-blue-400 mb-2">Position Details:</div>
                {size && entryPrice && (
                  <div className="text-sm space-y-1">
                    <div>Notional Value: ${(parseFloat(size) * parseFloat(entryPrice)).toLocaleString()}</div>
                    <div>Required Margin: ${((parseFloat(size) * parseFloat(entryPrice)) / parseFloat(leverage)).toLocaleString()}</div>
                    <div>Liquidation Price: ${(parseFloat(entryPrice) * (side === 'long' ? 0.9 : 1.1)).toFixed(2)}</div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`ascii-btn w-full ${
                  side === 'long' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                OPEN {side.toUpperCase()} POSITION
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Open Positions */}
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">OPEN_POSITIONS</h3>
          <span className="badge-blue">{positions.length}</span>
        </div>

        <div className="p-6">
          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No open positions
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position, index) => (
                <div key={index} className="bg-gray-800/50 rounded border border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{position.pair}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          position.side === 'long' ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {position.side.toUpperCase()}
                        </span>
                        <span className="text-yellow-400 text-sm">
                          {position.leverage}x
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Size: {position.size} | Entry: ${position.entryPrice}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => closePosition(position.id)}
                      className="ascii-btn-small bg-red-600 hover:bg-red-700"
                    >
                      CLOSE
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Margin</div>
                      <div className="font-mono text-white">
                        ${position.margin.toLocaleString()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400">Unrealized P&L</div>
                      <div className={`font-mono ${getPnLColor(position.unrealizedPnl)}`}>
                        ${position.unrealizedPnl.toFixed(2)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400">Liq. Price</div>
                      <div className="font-mono text-red-400">
                        ${position.liquidationPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Opened: {new Date(position.createdAt).toLocaleString()}</span>
                      <span className="text-yellow-400">
                        ROE: {((position.unrealizedPnl / position.margin) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Risk Warning */}
      <div className="bg-red-900/20 border border-red-500 rounded p-4">
        <h4 className="text-red-400 font-bold mb-2">⚠️ Margin Trading Risk Warning</h4>
        <div className="text-gray-300 text-sm space-y-1">
          <div>• Margin trading involves significant risk of loss</div>
          <div>• Positions may be liquidated if margin level falls below maintenance requirement</div>
          <div>• Maximum leverage available: {marginStats?.availableLeverage || 10}x</div>
          <div>• Interest charges apply on borrowed funds</div>
        </div>
      </div>
    </div>
  )
}
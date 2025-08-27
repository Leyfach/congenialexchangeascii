import { useState } from 'react'
import api from '../../services/api.js'

export default function AdvancedOrderForm({ pair, onOrderPlaced, onPairChange }) {
  const [selectedPair, setSelectedPair] = useState(pair)
  const [orderType, setOrderType] = useState('stop_loss')
  const [side, setSide] = useState('sell')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [trailAmount, setTrailAmount] = useState('')
  const [trailPercent, setTrailPercent] = useState('')
  const [icebergQty, setIcebergQty] = useState('')
  const [timeInForce, setTimeInForce] = useState('GTC')
  const [reduceOnly, setReduceOnly] = useState(false)
  const [postOnly, setPostOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const orderTypes = [
    { value: 'stop_loss', label: 'Stop Loss' },
    { value: 'take_profit', label: 'Take Profit' },
    { value: 'stop_limit', label: 'Stop Limit' },
    { value: 'trailing_stop', label: 'Trailing Stop' },
    { value: 'iceberg', label: 'Iceberg' },
    { value: 'oco', label: 'OCO (One-Cancels-Other)' }
  ]

  const timeInForceOptions = [
    { value: 'GTC', label: 'Good Till Cancelled' },
    { value: 'IOC', label: 'Immediate or Cancel' },
    { value: 'FOK', label: 'Fill or Kill' }
  ]

  const tradingPairs = [
    'BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 
    'DOT/USD', 'LINK/USD', 'AVAX/USD', 'MATIC/USD'
  ]

  const handlePairChange = (newPair) => {
    setSelectedPair(newPair)
    if (onPairChange) {
      onPairChange(newPair)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const orderData = {
        pair: selectedPair,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        timeInForce,
        reduceOnly,
        postOnly
      }

      // Add type-specific fields
      if (price) orderData.price = parseFloat(price)
      if (stopPrice) orderData.stopPrice = parseFloat(stopPrice)
      if (trailAmount) orderData.trailAmount = parseFloat(trailAmount)
      if (trailPercent) orderData.trailPercent = parseFloat(trailPercent)
      if (icebergQty) orderData.icebergQty = parseFloat(icebergQty)

      const response = await api.post('/api/trading/advanced-orders', orderData)

      if (response.data.success) {
        setSuccess('Advanced order placed successfully!')
        
        // Reset form
        setQuantity('')
        setPrice('')
        setStopPrice('')
        setTrailAmount('')
        setTrailPercent('')
        setIcebergQty('')
        
        if (onOrderPlaced) {
          onOrderPlaced(response.data.data)
        }
      } else {
        setError(response.data.error || 'Failed to place order')
      }
    } catch (error) {
      console.error('Error placing advanced order:', error)
      setError(error.response?.data?.error || 'Failed to place order')
    }

    setLoading(false)
  }

  const renderOrderTypeFields = () => {
    switch (orderType) {
      case 'stop_loss':
      case 'take_profit':
        return (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Stop Price
              </label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                className="ascii-input w-full"
                placeholder="0.00"
                step="0.00000001"
                required
              />
            </div>
          </div>
        )

      case 'stop_limit':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Stop Price
              </label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                className="ascii-input w-full"
                placeholder="0.00"
                step="0.00000001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Limit Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="ascii-input w-full"
                placeholder="0.00"
                step="0.00000001"
                required
              />
            </div>
          </div>
        )

      case 'trailing_stop':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-2">
              Choose either trail amount or trail percentage:
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Trail Amount ($)
                </label>
                <input
                  type="number"
                  value={trailAmount}
                  onChange={(e) => {
                    setTrailAmount(e.target.value)
                    if (e.target.value) setTrailPercent('')
                  }}
                  className="ascii-input w-full"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Trail Percent (%)
                </label>
                <input
                  type="number"
                  value={trailPercent}
                  onChange={(e) => {
                    setTrailPercent(e.target.value)
                    if (e.target.value) setTrailAmount('')
                  }}
                  className="ascii-input w-full"
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        )

      case 'iceberg':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="ascii-input w-full"
                placeholder="0.00"
                step="0.00000001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Visible Quantity
              </label>
              <input
                type="number"
                value={icebergQty}
                onChange={(e) => setIcebergQty(e.target.value)}
                className="ascii-input w-full"
                placeholder="0.00"
                step="0.00000001"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                Amount shown in order book
              </div>
            </div>
          </div>
        )

      case 'oco':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Stop Price
              </label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                className="ascii-input w-full"
                placeholder="0.00"
                step="0.00000001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Limit Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="ascii-input w-full"
                placeholder="0.00"
                step="0.00000001"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getOrderDescription = () => {
    const descriptions = {
      'stop_loss': 'Automatically sell when price falls below stop price',
      'take_profit': 'Automatically sell when price rises above target price', 
      'stop_limit': 'Stop order that becomes a limit order when triggered',
      'trailing_stop': 'Stop order that follows the market price at a fixed distance',
      'iceberg': 'Large order split into smaller visible portions',
      'oco': 'Two orders where execution of one cancels the other'
    }
    return descriptions[orderType]
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">ADVANCED_ORDERS</h3>
        <span className="badge-blue">CONDITIONAL</span>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded px-4 py-2 mb-4">
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-900/30 border border-green-500 rounded px-4 py-2 mb-4">
            <span className="text-green-400">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trading Pair Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trading Pair
            </label>
            <select
              value={selectedPair}
              onChange={(e) => handlePairChange(e.target.value)}
              className="ascii-input w-full"
            >
              {tradingPairs.map(pair => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
          </div>

          {/* Order Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="ascii-input w-full"
            >
              {orderTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              {getOrderDescription()}
            </div>
          </div>

          {/* Side Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('buy')}
              className={`ascii-btn ${side === 'buy' ? 'bg-green-600' : 'bg-gray-600'}`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              className={`ascii-btn ${side === 'sell' ? 'bg-red-600' : 'bg-gray-600'}`}
            >
              SELL
            </button>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="ascii-input w-full"
              placeholder="0.00"
              step="0.00000001"
              required
            />
          </div>

          {/* Type-specific fields */}
          {renderOrderTypeFields()}

          {/* Advanced Options */}
          <div className="border-t border-gray-600 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Advanced Options</h4>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Time in Force
                </label>
                <select
                  value={timeInForce}
                  onChange={(e) => setTimeInForce(e.target.value)}
                  className="ascii-input w-full text-sm"
                >
                  {timeInForceOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reduceOnly}
                  onChange={(e) => setReduceOnly(e.target.checked)}
                  className="mr-2 accent-green-500"
                />
                <span className="text-gray-300">Reduce Only</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={postOnly}
                  onChange={(e) => setPostOnly(e.target.checked)}
                  className="mr-2 accent-green-500"
                />
                <span className="text-gray-300">Post Only</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`ascii-btn w-full ${
              side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'PLACING...' : `PLACE ${side.toUpperCase()} ${orderType.replace('_', ' ').toUpperCase()}`}
          </button>
        </form>

        {/* Information Panel */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded">
          <h4 className="text-blue-400 font-bold mb-2">💡 Order Types Guide</h4>
          <div className="text-xs text-gray-300 space-y-1">
            <div><strong>Stop Loss:</strong> Protects against losses by selling when price drops</div>
            <div><strong>Take Profit:</strong> Locks in profits by selling when price rises</div>
            <div><strong>Trailing Stop:</strong> Follows price movements to maximize gains</div>
            <div><strong>Iceberg:</strong> Hides large order size from the market</div>
            <div><strong>OCO:</strong> Place two orders, execution of one cancels the other</div>
          </div>
        </div>
      </div>
    </div>
  )
}
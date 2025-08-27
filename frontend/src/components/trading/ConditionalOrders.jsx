import { useState, useEffect } from 'react'
import api from '../../services/api.js'

export default function ConditionalOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchConditionalOrders()
    // Refresh every 10 seconds
    const interval = setInterval(fetchConditionalOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchConditionalOrders = async () => {
    try {
      const response = await api.get('/api/trading/conditional-orders')
      if (response.data.success) {
        setOrders(response.data.data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching conditional orders:', error)
      setError('Failed to fetch conditional orders')
      setLoading(false)
    }
  }

  const cancelOrder = async (orderId) => {
    try {
      const response = await api.delete(`/api/trading/advanced-orders/${orderId}`)
      if (response.data.success) {
        // Refresh orders
        await fetchConditionalOrders()
      } else {
        setError(response.data.error)
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      setError(error.response?.data?.error || 'Failed to cancel order')
    }
  }

  const getOrderTypeColor = (type) => {
    const colors = {
      'stop_loss': 'text-red-400',
      'take_profit': 'text-green-400', 
      'trailing_stop': 'text-yellow-400',
      'iceberg': 'text-blue-400',
      'oco': 'text-purple-400',
      'stop_limit': 'text-orange-400'
    }
    return colors[type] || 'text-gray-400'
  }

  const formatOrderType = (type) => {
    return type.replace('_', ' ').toUpperCase()
  }

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : 'MARKET'
  }

  if (loading) {
    return (
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">CONDITIONAL_ORDERS</h3>
        </div>
        <div className="p-6 text-center">
          <span className="text-blue-400">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">CONDITIONAL_ORDERS</h3>
        <span className="badge-blue">{orders.length}</span>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded px-4 py-2 mb-4">
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No conditional orders active
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <div key={order.id || index} className="bg-gray-800/50 rounded border border-gray-700 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold">{order.pair}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.side === 'buy' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {order.side.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-bold bg-gray-700 ${getOrderTypeColor(order.type)}`}>
                        {formatOrderType(order.type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Quantity: {parseFloat(order.quantity).toFixed(8)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="ascii-btn-small bg-red-600 hover:bg-red-700"
                  >
                    CANCEL
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {order.stopPrice && (
                    <div>
                      <div className="text-gray-400">Stop Price</div>
                      <div className="font-mono text-red-400">
                        {formatPrice(order.stopPrice)}
                      </div>
                    </div>
                  )}

                  {order.price && (
                    <div>
                      <div className="text-gray-400">Limit Price</div>
                      <div className="font-mono text-yellow-400">
                        {formatPrice(order.price)}
                      </div>
                    </div>
                  )}

                  {order.trailAmount && (
                    <div>
                      <div className="text-gray-400">Trail Amount</div>
                      <div className="font-mono text-blue-400">
                        ${parseFloat(order.trailAmount).toFixed(2)}
                      </div>
                    </div>
                  )}

                  {order.trailPercent && (
                    <div>
                      <div className="text-gray-400">Trail Percent</div>
                      <div className="font-mono text-blue-400">
                        {parseFloat(order.trailPercent).toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {order.icebergQty && (
                    <div>
                      <div className="text-gray-400">Visible Qty</div>
                      <div className="font-mono text-blue-400">
                        {parseFloat(order.icebergQty).toFixed(8)}
                      </div>
                    </div>
                  )}

                  {order.waterMark && (
                    <div>
                      <div className="text-gray-400">Water Mark</div>
                      <div className="font-mono text-yellow-400">
                        {formatPrice(order.waterMark)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">
                      Created: {new Date(order.timestamp).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded ${
                        order.status === 'pending' ? 'bg-yellow-600' :
                        order.status === 'triggered' ? 'bg-green-600' :
                        'bg-gray-600'
                      }`}>
                        {order.status?.toUpperCase()}
                      </span>
                      {order.timeInForce && (
                        <span className="text-gray-500">
                          {order.timeInForce}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-600">
          <button
            onClick={fetchConditionalOrders}
            className="ascii-btn-small bg-blue-600 hover:bg-blue-700"
          >
            REFRESH
          </button>
        </div>
      </div>
    </div>
  )
}
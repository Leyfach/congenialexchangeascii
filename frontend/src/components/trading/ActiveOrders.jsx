import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import tradingWebSocket from '../../services/websocket-trading.js'

export default function ActiveOrders({ pair }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    // Initial fetch
    fetchActiveOrders()
    
    // Subscribe to WebSocket updates
    const unsubscribeOrders = tradingWebSocket.on('userOrders', (message) => {
      setOrders(message.orders || [])
      setIsLive(true)
      setLoading(false)
    })

    const unsubscribeTrade = tradingWebSocket.on('userTrade', (message) => {
      // Refresh orders when user has a trade
      fetchActiveOrders()
    })

    const unsubscribeOrderPlaced = tradingWebSocket.on('orderPlaced', (message) => {
      // Refresh orders when new order is placed
      fetchActiveOrders()
    })

    const unsubscribeOrderCancelled = tradingWebSocket.on('orderCancelled', (message) => {
      // Refresh orders when order is cancelled
      fetchActiveOrders()
    })
    
    // Fallback polling if WebSocket fails
    const pollInterval = setInterval(() => {
      if (!isLive) {
        fetchActiveOrders()
      }
    }, 5000)
    
    return () => {
      unsubscribeOrders()
      unsubscribeTrade()
      unsubscribeOrderPlaced()
      unsubscribeOrderCancelled()
      clearInterval(pollInterval)
    }
  }, [])

  const fetchActiveOrders = async () => {
    try {
      const response = await api.get('/api/trading/orders')
      setOrders(response.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching active orders:', error)
      setLoading(false)
    }
  }

  const cancelOrder = async (orderId) => {
    try {
      // Try WebSocket first for instant feedback
      if (tradingWebSocket.isConnected()) {
        tradingWebSocket.cancelOrder(orderId)
      }
      
      // Also send HTTP request
      await api.delete(`/api/trading/orders/${orderId}`)
      
      // Refresh orders
      await fetchActiveOrders()
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert(`Failed to cancel order: ${error.response?.data?.error || error.message}`)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-green-400'
      case 'partial': return 'text-yellow-400'
      case 'filled': return 'text-blue-400'
      case 'cancelled': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getSideColor = (side) => {
    return side === 'buy' ? 'text-green-400' : 'text-red-400'
  }

  // Filter orders by pair if specified
  const filteredOrders = pair 
    ? orders.filter(order => order.pair === pair)
    : orders

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">ACTIVE_ORDERS {pair && `▷ ${pair}`}</h3>
        <span className={`badge-${loading ? 'yellow' : isLive ? 'green' : 'blue'}`}>
          {loading ? 'LOADING' : isLive ? 'LIVE' : 'POLLING'}
        </span>
      </div>

      <div className="overflow-x-auto">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {loading ? 'Loading orders...' : 'No active orders'}
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr className="text-xs">
                <th>TIME</th>
                <th>PAIR</th>
                <th>TYPE</th>
                <th>SIDE</th>
                <th>QUANTITY</th>
                <th>PRICE</th>
                <th>FILLED</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="text-sm">
                  <td className="text-gray-400">
                    {formatDate(order.timestamp)}
                  </td>
                  <td className="text-white font-mono">
                    {order.pair}
                  </td>
                  <td className="text-blue-400 uppercase">
                    {order.type}
                  </td>
                  <td className={`${getSideColor(order.side)} uppercase font-bold`}>
                    {order.side}
                  </td>
                  <td className="text-gray-300">
                    {parseFloat(order.originalQuantity).toFixed(8)}
                  </td>
                  <td className="text-gray-300">
                    {order.price ? `$${parseFloat(order.price).toFixed(2)}` : 'MARKET'}
                  </td>
                  <td className="text-gray-300">
                    <div className="flex flex-col">
                      <span>{parseFloat(order.filled).toFixed(8)}</span>
                      <span className="text-xs text-gray-500">
                        {((parseFloat(order.filled) / parseFloat(order.originalQuantity)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className={`${getStatusColor(order.status)} uppercase font-bold`}>
                    {order.status}
                  </td>
                  <td>
                    {(order.status === 'open' || order.status === 'partial') && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="ascii-btn-small bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs"
                      >
                        CANCEL
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredOrders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-600 flex justify-between items-center text-xs text-gray-400">
          <span>Total: {filteredOrders.length} orders</span>
          <span>
            Open: {filteredOrders.filter(o => o.status === 'open').length} | 
            Partial: {filteredOrders.filter(o => o.status === 'partial').length} | 
            Filled: {filteredOrders.filter(o => o.status === 'filled').length}
          </span>
        </div>
      )}
    </div>
  )
}
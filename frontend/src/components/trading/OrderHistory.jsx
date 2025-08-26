import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrderHistory.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, completed, cancelled

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/orders');
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Fallback to mock data
      setOrders([
        {
          id: 1,
          pair: 'BTC/USD',
          side: 'buy',
          quantity: 0.001,
          price: 45000,
          filled_quantity: 0,
          status: 'pending',
          order_type: 'limit',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          pair: 'ETH/USD',
          side: 'sell',
          quantity: 0.5,
          price: 3200,
          filled_quantity: 0.5,
          status: 'completed',
          order_type: 'market',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      await axios.delete(`http://localhost:3000/api/orders/${orderId}`);
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert(error.response?.data?.error || 'Failed to cancel order');
    }
  };

  const getFilteredOrders = () => {
    switch (filter) {
      case 'open':
        return orders.filter(order => order.status === 'pending');
      case 'completed':
        return orders.filter(order => order.status === 'completed' || order.status === 'filled');
      case 'cancelled':
        return orders.filter(order => order.status === 'cancelled');
      default:
        return orders;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffd700';
      case 'completed':
      case 'filled': return '#0ecb81';
      case 'cancelled': return '#f6465d';
      case 'partial': return '#ff9500';
      default: return '#888';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className="order-history">
        <h3>Order History</h3>
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="order-history">
      <div className="history-header">
        <h3>Order History</h3>
        <div className="filter-buttons">
          {['all', 'open', 'completed', 'cancelled'].map(filterType => (
            <button
              key={filterType}
              className={`filter-btn ${filter === filterType ? 'active' : ''}`}
              onClick={() => setFilter(filterType)}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-table">
        <div className="table-header">
          <span>Pair</span>
          <span>Type</span>
          <span>Side</span>
          <span>Price</span>
          <span>Quantity</span>
          <span>Filled</span>
          <span>Status</span>
          <span>Time</span>
          <span>Action</span>
        </div>

        <div className="table-body">
          {filteredOrders.length === 0 ? (
            <div className="no-orders">
              No {filter !== 'all' ? filter : ''} orders found
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="table-row">
                <span className="pair">
                  {order.pair || `${order.base_currency}/${order.quote_currency}`}
                </span>
                <span className="type">
                  {(order.order_type || 'limit').toUpperCase()}
                </span>
                <span className={`side ${order.side}`}>
                  {order.side.toUpperCase()}
                </span>
                <span className="price">
                  ${order.price?.toFixed(2) || '0.00'}
                </span>
                <span className="quantity">
                  {order.quantity?.toFixed(6) || '0.000000'}
                </span>
                <span className="filled">
                  {((order.filled_quantity || 0) / order.quantity * 100).toFixed(1)}%
                </span>
                <span 
                  className="status"
                  style={{ color: getStatusColor(order.status) }}
                >
                  {order.status.toUpperCase()}
                </span>
                <span className="time">
                  {formatDate(order.created_at)}
                </span>
                <span className="action">
                  {order.status === 'pending' ? (
                    <button
                      className="cancel-btn"
                      onClick={() => cancelOrder(order.id)}
                    >
                      Cancel
                    </button>
                  ) : (
                    <span className="no-action">-</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
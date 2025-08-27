const { dbOps } = require('../../database/db');
const orderBookManager = require('./OrderBookManager');
const priceUpdater = require('../price-data/priceUpdater');

class AdvancedOrderManager {
  constructor() {
    this.activeStopOrders = new Map(); // orderId -> order
    this.activeTrailingStops = new Map(); // orderId -> { order, highWaterMark/lowWaterMark }
    this.ocoGroups = new Map(); // ocoId -> [order1, order2]
    this.icebergOrders = new Map(); // orderId -> { order, remainingQty, currentSliceQty }
    
    // Start monitoring price changes for conditional orders
    this.startPriceMonitoring();
  }

  // Place advanced order
  placeAdvancedOrder(orderData) {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const order = {
      id: orderId,
      userId: orderData.userId,
      pair: orderData.pair,
      side: orderData.side,
      type: orderData.type,
      quantity: parseFloat(orderData.quantity),
      price: orderData.price ? parseFloat(orderData.price) : null,
      stopPrice: orderData.stopPrice ? parseFloat(orderData.stopPrice) : null,
      trailAmount: orderData.trailAmount ? parseFloat(orderData.trailAmount) : null,
      trailPercent: orderData.trailPercent ? parseFloat(orderData.trailPercent) : null,
      icebergQty: orderData.icebergQty ? parseFloat(orderData.icebergQty) : null,
      timeInForce: orderData.timeInForce || 'GTC',
      ocoId: orderData.ocoId || null,
      parentOrderId: orderData.parentOrderId || null,
      reduceOnly: orderData.reduceOnly || false,
      postOnly: orderData.postOnly || false,
      status: 'pending',
      filledQuantity: 0,
      timestamp: Date.now()
    };

    try {
      switch (order.type) {
        case 'stop_loss':
        case 'take_profit':
        case 'stop_limit':
          return this.placeStopOrder(order);
          
        case 'trailing_stop':
          return this.placeTrailingStopOrder(order);
          
        case 'iceberg':
          return this.placeIcebergOrder(order);
          
        case 'oco':
          return this.placeOCOOrder(order);
          
        default:
          // Regular limit/market orders go to existing order book
          return orderBookManager.addOrder(order);
      }
    } catch (error) {
      console.error('Error placing advanced order:', error);
      throw error;
    }
  }

  // Place Stop Loss / Take Profit / Stop Limit orders
  placeStopOrder(order) {
    if (!order.stopPrice) {
      throw new Error('Stop price is required for stop orders');
    }

    // Store in conditional orders map
    this.activeStopOrders.set(order.id, order);
    
    // Save to database
    this.saveOrderToDatabase(order);
    
    console.log(`Placed ${order.type} order ${order.id} for ${order.pair} at stop price ${order.stopPrice}`);
    
    return {
      orderId: order.id,
      status: 'pending',
      message: `${order.type} order placed successfully`
    };
  }

  // Place Trailing Stop order
  placeTrailingStopOrder(order) {
    if (!order.trailAmount && !order.trailPercent) {
      throw new Error('Trail amount or trail percent is required for trailing stop orders');
    }

    const currentPrice = this.getCurrentPrice(order.pair);
    if (!currentPrice) {
      throw new Error('Cannot get current price for trailing stop');
    }

    // Set initial high/low water mark
    const waterMark = order.side === 'sell' ? currentPrice : currentPrice;
    
    this.activeTrailingStops.set(order.id, {
      order: order,
      waterMark: waterMark
    });
    
    // Calculate initial stop price
    order.stopPrice = this.calculateTrailingStopPrice(order, waterMark);
    
    this.saveOrderToDatabase(order);
    
    console.log(`Placed trailing stop order ${order.id} for ${order.pair} with initial stop price ${order.stopPrice}`);
    
    return {
      orderId: order.id,
      status: 'pending',
      message: 'Trailing stop order placed successfully'
    };
  }

  // Place Iceberg order
  placeIcebergOrder(order) {
    if (!order.icebergQty || order.icebergQty >= order.quantity) {
      throw new Error('Iceberg quantity must be less than total quantity');
    }

    // Create first slice
    const sliceQuantity = Math.min(order.icebergQty, order.quantity);
    
    const sliceOrder = {
      ...order,
      quantity: sliceQuantity,
      type: 'limit' // Iceberg orders are always limit orders
    };

    // Store iceberg info
    this.icebergOrders.set(order.id, {
      order: order,
      remainingQty: order.quantity - sliceQuantity,
      currentSliceQty: sliceQuantity
    });

    // Place first slice in order book
    const result = orderBookManager.addOrder(sliceOrder);
    
    this.saveOrderToDatabase(order);
    
    console.log(`Placed iceberg order ${order.id} for ${order.pair}, first slice: ${sliceQuantity}`);
    
    return result;
  }

  // Place OCO (One-Cancels-Other) order
  placeOCOOrder(order) {
    if (!order.ocoId) {
      order.ocoId = `oco_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // OCO orders come in pairs, store them
    if (!this.ocoGroups.has(order.ocoId)) {
      this.ocoGroups.set(order.ocoId, []);
    }
    
    this.ocoGroups.get(order.ocoId).push(order);
    
    // If this is a stop order, handle it as such
    if (order.stopPrice) {
      return this.placeStopOrder(order);
    } else {
      // Regular limit order
      const result = orderBookManager.addOrder(order);
      this.saveOrderToDatabase(order);
      return result;
    }
  }

  // Monitor price changes and trigger conditional orders
  startPriceMonitoring() {
    setInterval(() => {
      this.checkStopOrders();
      this.updateTrailingStops();
    }, 1000); // Check every second
  }

  // Check stop orders for triggering
  checkStopOrders() {
    for (const [orderId, order] of this.activeStopOrders) {
      const currentPrice = this.getCurrentPrice(order.pair);
      if (!currentPrice) continue;

      let shouldTrigger = false;

      if (order.side === 'sell') {
        // Stop loss for long position or take profit for short
        shouldTrigger = currentPrice <= order.stopPrice;
      } else {
        // Stop loss for short position or take profit for long
        shouldTrigger = currentPrice >= order.stopPrice;
      }

      if (shouldTrigger) {
        this.triggerStopOrder(orderId, currentPrice);
      }
    }
  }

  // Update trailing stop prices
  updateTrailingStops() {
    for (const [orderId, trailData] of this.activeTrailingStops) {
      const { order } = trailData;
      const currentPrice = this.getCurrentPrice(order.pair);
      if (!currentPrice) continue;

      let updatedWaterMark = trailData.waterMark;
      let newStopPrice = order.stopPrice;

      if (order.side === 'sell') {
        // For sell orders, trail the high water mark down
        if (currentPrice > trailData.waterMark) {
          updatedWaterMark = currentPrice;
          newStopPrice = this.calculateTrailingStopPrice(order, updatedWaterMark);
        }
      } else {
        // For buy orders, trail the low water mark up
        if (currentPrice < trailData.waterMark) {
          updatedWaterMark = currentPrice;
          newStopPrice = this.calculateTrailingStopPrice(order, updatedWaterMark);
        }
      }

      // Update if changed
      if (newStopPrice !== order.stopPrice) {
        order.stopPrice = newStopPrice;
        order.lastTriggerPrice = updatedWaterMark;
        trailData.waterMark = updatedWaterMark;
        
        console.log(`Updated trailing stop ${orderId} to ${newStopPrice} (water mark: ${updatedWaterMark})`);
      }

      // Check if should trigger
      let shouldTrigger = false;
      if (order.side === 'sell') {
        shouldTrigger = currentPrice <= order.stopPrice;
      } else {
        shouldTrigger = currentPrice >= order.stopPrice;
      }

      if (shouldTrigger) {
        this.triggerStopOrder(orderId, currentPrice);
      }
    }
  }

  // Calculate trailing stop price
  calculateTrailingStopPrice(order, waterMark) {
    if (order.trailAmount) {
      return order.side === 'sell' 
        ? waterMark - order.trailAmount
        : waterMark + order.trailAmount;
    } else {
      const trailAmount = waterMark * (order.trailPercent / 100);
      return order.side === 'sell' 
        ? waterMark - trailAmount
        : waterMark + trailAmount;
    }
  }

  // Trigger a stop order
  triggerStopOrder(orderId, currentPrice) {
    const order = this.activeStopOrders.get(orderId) || 
                  this.activeTrailingStops.get(orderId)?.order;
    
    if (!order) return;

    console.log(`Triggering ${order.type} order ${orderId} at price ${currentPrice}`);

    // Convert to market or limit order
    const triggerOrder = {
      ...order,
      type: order.type === 'stop_limit' ? 'limit' : 'market',
      status: 'triggered',
      triggeredAt: Date.now()
    };

    // Remove from conditional orders
    this.activeStopOrders.delete(orderId);
    this.activeTrailingStops.delete(orderId);

    // Handle OCO cancellation
    if (order.ocoId) {
      this.cancelOCOGroup(order.ocoId, orderId);
    }

    // Execute the order
    try {
      orderBookManager.addOrder(triggerOrder);
      
      // Update database
      this.updateOrderInDatabase(orderId, {
        status: 'triggered',
        triggered_at: new Date().toISOString(),
        last_trigger_price: currentPrice
      });
    } catch (error) {
      console.error('Error executing triggered order:', error);
    }
  }

  // Cancel OCO group when one order fills
  cancelOCOGroup(ocoId, excludeOrderId) {
    const orders = this.ocoGroups.get(ocoId) || [];
    
    for (const order of orders) {
      if (order.id !== excludeOrderId) {
        this.cancelOrder(order.id);
      }
    }
    
    this.ocoGroups.delete(ocoId);
  }

  // Handle iceberg order slice fills
  onOrderFill(orderId, filledQuantity) {
    if (this.icebergOrders.has(orderId)) {
      const icebergData = this.icebergOrders.get(orderId);
      
      // Check if we need to place next slice
      if (icebergData.remainingQty > 0) {
        const nextSliceQty = Math.min(icebergData.order.icebergQty, icebergData.remainingQty);
        
        const nextSlice = {
          ...icebergData.order,
          id: `${orderId}_slice_${Date.now()}`,
          quantity: nextSliceQty,
          type: 'limit'
        };

        // Update remaining quantity
        icebergData.remainingQty -= nextSliceQty;
        icebergData.currentSliceQty = nextSliceQty;

        // Place next slice
        orderBookManager.addOrder(nextSlice);
        
        console.log(`Placed next iceberg slice for ${orderId}: ${nextSliceQty} (remaining: ${icebergData.remainingQty})`);
        
        if (icebergData.remainingQty <= 0) {
          this.icebergOrders.delete(orderId);
        }
      }
    }
  }

  // Cancel advanced order
  cancelOrder(orderId) {
    // Remove from all tracking maps
    this.activeStopOrders.delete(orderId);
    this.activeTrailingStops.delete(orderId);
    this.icebergOrders.delete(orderId);

    // Cancel in regular order book if exists
    orderBookManager.cancelOrder(orderId);

    // Update database
    this.updateOrderInDatabase(orderId, {
      status: 'cancelled',
      filled_at: new Date().toISOString()
    });

    return { success: true, message: 'Order cancelled successfully' };
  }

  // Get current price from price service
  getCurrentPrice(pair) {
    try {
      const [coin] = pair.split('/');
      const cachedPrices = priceUpdater.getCachedPrices();
      return cachedPrices[coin]?.price;
    } catch (error) {
      console.error('Error getting current price:', error);
      return null;
    }
  }

  // Save order to database
  saveOrderToDatabase(order) {
    try {
      // This would need actual database prepared statement
      console.log(`Saving advanced order ${order.id} to database`);
      // dbOps.createAdvancedOrder.run(...);
    } catch (error) {
      console.error('Error saving order to database:', error);
    }
  }

  // Update order in database
  updateOrderInDatabase(orderId, updates) {
    try {
      console.log(`Updating order ${orderId} in database:`, updates);
      // dbOps.updateOrder.run(...);
    } catch (error) {
      console.error('Error updating order in database:', error);
    }
  }

  // Get all active conditional orders for user
  getUserConditionalOrders(userId) {
    const userOrders = [];
    
    // Stop orders
    for (const [orderId, order] of this.activeStopOrders) {
      if (order.userId === userId) {
        userOrders.push({
          ...order,
          status: 'pending'
        });
      }
    }

    // Trailing stops
    for (const [orderId, trailData] of this.activeTrailingStops) {
      if (trailData.order.userId === userId) {
        userOrders.push({
          ...trailData.order,
          status: 'pending',
          waterMark: trailData.waterMark
        });
      }
    }

    // Iceberg orders
    for (const [orderId, icebergData] of this.icebergOrders) {
      if (icebergData.order.userId === userId) {
        userOrders.push({
          ...icebergData.order,
          status: 'partially_filled',
          remainingQuantity: icebergData.remainingQty
        });
      }
    }

    return userOrders;
  }

  // Get order statistics
  getOrderStats() {
    return {
      activeStopOrders: this.activeStopOrders.size,
      activeTrailingStops: this.activeTrailingStops.size,
      activeIcebergOrders: this.icebergOrders.size,
      activeOCOGroups: this.ocoGroups.size
    };
  }
}

module.exports = new AdvancedOrderManager();
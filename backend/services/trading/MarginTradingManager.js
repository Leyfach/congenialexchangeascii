const { dbOps } = require('../../database/db');
const orderBookManager = require('./OrderBookManager');
const priceUpdater = require('../price-data/priceUpdater');

class MarginTradingManager {
  constructor() {
    this.maxLeverage = 10; // Maximum 10x leverage
    this.maintenanceMarginRate = 0.05; // 5% maintenance margin
    this.liquidationFee = 0.005; // 0.5% liquidation fee
    this.interestRate = 0.0001; // 0.01% per hour
    
    // Start monitoring positions for liquidation
    this.startLiquidationMonitoring();
  }

  // Open a margin position
  async openPosition(userId, positionData) {
    const {
      pair,
      side, // 'long' or 'short'
      size,
      leverage,
      entryPrice
    } = positionData;

    try {
      // Validate leverage
      if (leverage < 1 || leverage > this.maxLeverage) {
        throw new Error(`Leverage must be between 1 and ${this.maxLeverage}`);
      }

      // Calculate required margin
      const notionalValue = size * entryPrice;
      const requiredMargin = notionalValue / leverage;

      // Check user has sufficient collateral
      const userBalance = this.getUserMarginBalance(userId, pair);
      if (userBalance.availableCollateral < requiredMargin) {
        throw new Error('Insufficient collateral for margin position');
      }

      // Calculate liquidation price
      const liquidationPrice = this.calculateLiquidationPrice(
        entryPrice, 
        leverage, 
        side, 
        this.maintenanceMarginRate
      );

      // Create position record
      const position = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        pair,
        side,
        size,
        entryPrice,
        leverage,
        margin: requiredMargin,
        liquidationPrice,
        unrealizedPnl: 0,
        status: 'open',
        createdAt: Date.now()
      };

      // Save position to database
      this.savePositionToDatabase(position);

      // Update user's margin balance
      this.updateMarginBalance(userId, pair, {
        usedMargin: requiredMargin,
        collateral: -requiredMargin
      });

      console.log(`Opened ${side} position for user ${userId}: ${size} ${pair} at ${entryPrice} with ${leverage}x leverage`);

      return {
        success: true,
        position,
        message: 'Margin position opened successfully'
      };

    } catch (error) {
      console.error('Error opening margin position:', error);
      throw error;
    }
  }

  // Close a margin position
  async closePosition(userId, positionId, closePrice) {
    try {
      const position = this.getPosition(positionId);
      
      if (!position || position.userId !== userId) {
        throw new Error('Position not found or access denied');
      }

      if (position.status !== 'open') {
        throw new Error('Position is not open');
      }

      // Calculate PnL
      const pnl = this.calculatePnL(position, closePrice);

      // Update position
      position.status = 'closed';
      position.closedAt = Date.now();
      position.closePrice = closePrice;
      position.realizedPnl = pnl;

      // Return margin to user balance
      this.updateMarginBalance(userId, position.pair, {
        usedMargin: -position.margin,
        collateral: position.margin + pnl
      });

      // Update database
      this.updatePositionInDatabase(positionId, {
        status: 'closed',
        close_price: closePrice,
        realized_pnl: pnl,
        closed_at: new Date().toISOString()
      });

      console.log(`Closed position ${positionId} with PnL: ${pnl}`);

      return {
        success: true,
        position,
        pnl,
        message: 'Position closed successfully'
      };

    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  // Calculate liquidation price
  calculateLiquidationPrice(entryPrice, leverage, side, maintenanceMarginRate) {
    const leverageFactor = 1 / leverage;
    const liquidationFactor = leverageFactor - maintenanceMarginRate - this.liquidationFee;

    if (side === 'long') {
      return entryPrice * (1 - liquidationFactor);
    } else {
      return entryPrice * (1 + liquidationFactor);
    }
  }

  // Calculate unrealized PnL
  calculatePnL(position, currentPrice) {
    const priceChange = currentPrice - position.entryPrice;
    
    if (position.side === 'long') {
      return position.size * priceChange;
    } else {
      return position.size * -priceChange;
    }
  }

  // Monitor positions for liquidation
  startLiquidationMonitoring() {
    setInterval(() => {
      this.checkLiquidations();
    }, 5000); // Check every 5 seconds
  }

  // Check all positions for liquidation
  checkLiquidations() {
    const openPositions = this.getAllOpenPositions();

    for (const position of openPositions) {
      const currentPrice = this.getCurrentPrice(position.pair);
      if (!currentPrice) continue;

      // Update unrealized PnL
      position.unrealizedPnl = this.calculatePnL(position, currentPrice);

      // Check if position should be liquidated
      let shouldLiquidate = false;

      if (position.side === 'long') {
        shouldLiquidate = currentPrice <= position.liquidationPrice;
      } else {
        shouldLiquidate = currentPrice >= position.liquidationPrice;
      }

      if (shouldLiquidate) {
        this.liquidatePosition(position.id, currentPrice);
      }
    }
  }

  // Liquidate a position
  async liquidatePosition(positionId, liquidationPrice) {
    try {
      const position = this.getPosition(positionId);
      if (!position || position.status !== 'open') {
        return;
      }

      console.log(`Liquidating position ${positionId} at price ${liquidationPrice}`);

      // Calculate liquidation PnL (should be negative)
      const pnl = this.calculatePnL(position, liquidationPrice);
      const liquidationFeeAmount = position.size * liquidationPrice * this.liquidationFee;

      // Update position
      position.status = 'liquidated';
      position.liquidatedAt = Date.now();
      position.liquidationPrice = liquidationPrice;
      position.realizedPnl = pnl - liquidationFeeAmount;

      // Return remaining margin (if any) to user
      const remainingMargin = Math.max(0, position.margin + pnl - liquidationFeeAmount);
      
      this.updateMarginBalance(position.userId, position.pair, {
        usedMargin: -position.margin,
        collateral: remainingMargin
      });

      // Update database
      this.updatePositionInDatabase(positionId, {
        status: 'liquidated',
        liquidation_price: liquidationPrice,
        realized_pnl: position.realizedPnl,
        closed_at: new Date().toISOString()
      });

      // Create liquidation order to close position in order book
      const liquidationOrder = {
        id: `liq_${positionId}`,
        userId: position.userId,
        pair: position.pair,
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market',
        quantity: position.size,
        isLiquidation: true
      };

      // Execute liquidation order
      orderBookManager.addOrder(liquidationOrder);

      return {
        success: true,
        message: 'Position liquidated',
        pnl: position.realizedPnl
      };

    } catch (error) {
      console.error('Error liquidating position:', error);
    }
  }

  // Get user's margin account balance
  getUserMarginBalance(userId, pair) {
    // This would fetch from database in real implementation
    return {
      totalCollateral: 10000, // USD value of all collateral
      usedMargin: 0,
      availableCollateral: 10000,
      marginLevel: 100, // Percentage
      totalUnrealizedPnl: 0
    };
  }

  // Update margin balance
  updateMarginBalance(userId, pair, changes) {
    // This would update database in real implementation
    console.log(`Updating margin balance for user ${userId}:`, changes);
  }

  // Get user's open positions
  getUserPositions(userId) {
    // This would fetch from database in real implementation
    return [];
  }

  // Get all open positions (for liquidation monitoring)
  getAllOpenPositions() {
    // This would fetch from database in real implementation
    return [];
  }

  // Get specific position
  getPosition(positionId) {
    // This would fetch from database in real implementation
    return null;
  }

  // Calculate position health metrics
  calculatePositionHealth(position, currentPrice) {
    const unrealizedPnl = this.calculatePnL(position, currentPrice);
    const equity = position.margin + unrealizedPnl;
    const marginLevel = (equity / position.margin) * 100;
    
    const distanceToLiquidation = position.side === 'long' 
      ? ((currentPrice - position.liquidationPrice) / currentPrice) * 100
      : ((position.liquidationPrice - currentPrice) / currentPrice) * 100;

    return {
      unrealizedPnl,
      equity,
      marginLevel,
      distanceToLiquidation,
      isHealthy: marginLevel > (this.maintenanceMarginRate * 100),
      riskLevel: marginLevel < 20 ? 'high' : marginLevel < 50 ? 'medium' : 'low'
    };
  }

  // Get current price for a pair
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

  // Database operations (placeholder implementations)
  savePositionToDatabase(position) {
    console.log(`Saving position to database:`, position);
    // dbOps.createPosition.run(...);
  }

  updatePositionInDatabase(positionId, updates) {
    console.log(`Updating position ${positionId}:`, updates);
    // dbOps.updatePosition.run(...);
  }

  // Calculate borrowing interest
  calculateInterest(position, hoursElapsed) {
    const notionalValue = position.size * position.entryPrice;
    const borrowedAmount = notionalValue * (position.leverage - 1) / position.leverage;
    return borrowedAmount * this.interestRate * hoursElapsed;
  }

  // Get margin trading statistics
  getMarginStats(userId) {
    const positions = this.getUserPositions(userId);
    const openPositions = positions.filter(p => p.status === 'open');
    
    let totalUnrealizedPnl = 0;
    let totalMarginUsed = 0;
    
    for (const position of openPositions) {
      const currentPrice = this.getCurrentPrice(position.pair);
      if (currentPrice) {
        totalUnrealizedPnl += this.calculatePnL(position, currentPrice);
        totalMarginUsed += position.margin;
      }
    }

    return {
      openPositions: openPositions.length,
      totalPositions: positions.length,
      totalMarginUsed,
      totalUnrealizedPnl,
      availableLeverage: this.maxLeverage
    };
  }

  // Risk management - check if user can open more positions
  canOpenPosition(userId, requiredMargin) {
    const balance = this.getUserMarginBalance(userId, 'USD');
    const riskLimit = balance.totalCollateral * 0.8; // Max 80% of collateral can be used
    
    return (balance.usedMargin + requiredMargin) <= riskLimit;
  }
}

module.exports = new MarginTradingManager();
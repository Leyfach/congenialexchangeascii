const priceService = require('./priceService');
const { dbOps } = require('../../database/db');

class PriceUpdater {
  constructor() {
    this.updateInterval = 300000; // Update every 5 minutes to respect rate limits
    this.isRunning = false;
    this.intervalId = null;
    
    // Coins to track
    this.trackedCoins = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX', 'MATIC'];
  }

  // Start the background price update service
  start() {
    if (this.isRunning) {
      console.log('Price updater is already running');
      return;
    }

    console.log('Starting price updater service...');
    this.isRunning = true;
    
    // Update prices immediately on start
    this.updatePrices();
    
    // Set up recurring updates
    this.intervalId = setInterval(() => {
      this.updatePrices();
    }, this.updateInterval);
    
    console.log(`Price updater started - updating every ${this.updateInterval / 1000} seconds`);
  }

  // Stop the background price update service
  stop() {
    if (!this.isRunning) {
      console.log('Price updater is not running');
      return;
    }

    console.log('Stopping price updater service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('Price updater stopped');
  }

  // Update prices from CoinGecko API
  async updatePrices() {
    try {
      console.log('Updating crypto prices...');
      
      const prices = await priceService.getCurrentPrices(this.trackedCoins);
      
      let updatedCount = 0;
      
      // Store prices in database
      Object.entries(prices).forEach(([symbol, data]) => {
        try {
          dbOps.upsertPriceData.run(
            symbol,
            data.price,
            data.change24h,
            data.volume24h,
            data.marketCap
          );
          updatedCount++;
        } catch (error) {
          console.error(`Error storing price data for ${symbol}:`, error.message);
        }
      });
      
      console.log(`Successfully updated ${updatedCount} crypto prices`);
      
      // Log some sample prices
      if (prices.BTC) {
        console.log(`BTC: $${prices.BTC.price.toFixed(2)} (${prices.BTC.change24h > 0 ? '+' : ''}${prices.BTC.change24h.toFixed(2)}%)`);
      }
      if (prices.ETH) {
        console.log(`ETH: $${prices.ETH.price.toFixed(2)} (${prices.ETH.change24h > 0 ? '+' : ''}${prices.ETH.change24h.toFixed(2)}%)`);
      }
      
    } catch (error) {
      console.error('Error updating prices:', error.message);
      
      // If API fails, try to get cached data
      try {
        const cachedPrices = dbOps.getRecentPriceData.all();
        if (cachedPrices.length > 0) {
          console.log(`Using ${cachedPrices.length} cached prices`);
        } else {
          console.log('No cached price data available');
        }
      } catch (dbError) {
        console.error('Error fetching cached prices:', dbError.message);
      }
    }
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      updateInterval: this.updateInterval,
      trackedCoins: this.trackedCoins,
      lastUpdate: new Date().toISOString()
    };
  }

  // Manually trigger price update
  async forceUpdate() {
    console.log('Manual price update triggered');
    await this.updatePrices();
  }

  // Get prices from database
  getCachedPrices() {
    try {
      const prices = dbOps.getAllPriceData.all();
      return prices.reduce((acc, price) => {
        acc[price.symbol] = {
          price: price.price,
          change24h: price.change_24h,
          volume24h: price.volume_24h,
          marketCap: price.market_cap,
          lastUpdated: price.last_updated
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching cached prices:', error);
      return {};
    }
  }

  // Update specific coin
  async updateCoin(symbol) {
    try {
      console.log(`Updating price for ${symbol}...`);
      const prices = await priceService.getCurrentPrices([symbol]);
      
      if (prices[symbol]) {
        const data = prices[symbol];
        dbOps.upsertPriceData.run(
          symbol,
          data.price,
          data.change24h,
          data.volume24h,
          data.marketCap
        );
        console.log(`Updated ${symbol}: $${data.price.toFixed(2)}`);
        return true;
      } else {
        console.log(`No price data found for ${symbol}`);
        return false;
      }
    } catch (error) {
      console.error(`Error updating price for ${symbol}:`, error.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new PriceUpdater();
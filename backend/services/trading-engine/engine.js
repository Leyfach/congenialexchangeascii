class TradingEngine {
  constructor() {
    this.orderBook = {
      buy: [],
      sell: []
    };
  }

  addOrder(order) {
    const side = order.side.toLowerCase();
    this.orderBook[side].push(order);
    this.sortOrders(side);
    return this.matchOrders();
  }

  sortOrders(side) {
    if (side === 'buy') {
      this.orderBook.buy.sort((a, b) => b.price - a.price);
    } else {
      this.orderBook.sell.sort((a, b) => a.price - b.price);
    }
  }

  matchOrders() {
    const matches = [];
    
    while (this.orderBook.buy.length > 0 && this.orderBook.sell.length > 0) {
      const buyOrder = this.orderBook.buy[0];
      const sellOrder = this.orderBook.sell[0];
      
      if (buyOrder.price >= sellOrder.price) {
        const quantity = Math.min(buyOrder.quantity, sellOrder.quantity);
        
        matches.push({
          price: sellOrder.price,
          quantity: quantity,
          buyOrder: buyOrder.id,
          sellOrder: sellOrder.id
        });
        
        buyOrder.quantity -= quantity;
        sellOrder.quantity -= quantity;
        
        if (buyOrder.quantity === 0) this.orderBook.buy.shift();
        if (sellOrder.quantity === 0) this.orderBook.sell.shift();
      } else {
        break;
      }
    }
    
    return matches;
  }

  getOrderBook() {
    return this.orderBook;
  }
}

module.exports = TradingEngine;
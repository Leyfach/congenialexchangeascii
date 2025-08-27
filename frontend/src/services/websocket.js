const defaultPairs = [
    'BTC/USD','ETH/USD','SOL/USD','BNB/USD','XRP/USD','ADA/USD','DOGE/USD','DOT/USD','AVAX/USD','ARB/USD','TON/USD'
  ]
  
  let state = Object.fromEntries(defaultPairs.map(p => [p, { price: 0, change: '+0.00%' }]))
  let subs = new Set()
  
  // Fetch real prices from backend
  async function updatePricesFromBackend() {
    try {
      const response = await fetch('http://localhost:3001/api/markets')
      const markets = await response.json()
      
      markets.forEach(market => {
        const currentPrice = state[market.pair]?.price || 0
        const newPrice = market.price
        const change = currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice * 100) : 0
        
        state[market.pair] = {
          price: newPrice,
          change: market.change || `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
        }
      })
      
      // Notify subscribers
      subs.forEach(cb => cb(state))
    } catch (error) {
      console.error('Failed to update prices:', error)
    }
  }
  
  // Initial load and periodic updates every 2 seconds
  updatePricesFromBackend()
  setInterval(updatePricesFromBackend, 2000)
  
  export function primeTickersFromBackend(list){
    // list: [{pair, price, change}]
    list.forEach(({pair, price, change})=>{ state[pair] = { price, change } })
  }
  
  export function subscribeTickers(cb){
    subs.add(cb)
    cb(state)
    return () => subs.delete(cb)
  }
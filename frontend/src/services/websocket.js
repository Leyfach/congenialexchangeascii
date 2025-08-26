const defaultPairs = [
    'BTC/USD','ETH/USD','SOL/USD','BNB/USD','XRP/USD','ADA/USD','DOGE/USD','DOT/USD','AVAX/USD','ARB/USD','TON/USD'
  ]
  
  let state = Object.fromEntries(defaultPairs.map(p => [p, { price: 100 + Math.random()*50000, change: '+0.00%' }]))
  let subs = new Set()
  
  function tick(){
    Object.keys(state).forEach(pair => {
      const p = state[pair].price
      const drift = (Math.random()-0.5) * (p*0.002)
      const np = Math.max(0.0001, p + drift)
      const ch = ((np - p) / p * 100)
      state[pair] = { price: np, change: `${ch>=0?'+':''}${ch.toFixed(2)}%` }
    })
    subs.forEach(cb => cb(state))
  }
  
  setInterval(tick, 1200)
  
  export function primeTickersFromBackend(list){
    // list: [{pair, price, change}]
    list.forEach(({pair, price, change})=>{ state[pair] = { price, change } })
  }
  
  export function subscribeTickers(cb){
    subs.add(cb)
    cb(state)
    return () => subs.delete(cb)
  }
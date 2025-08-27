import { subscribeTickers as _subscribe, primeTickersFromBackend } from '../services/websocket.js'

export function formatCurrency(n, showSymbol = true){
  if (n == null) return '—'
  const num = Number(n);
  
  if (showSymbol) {
    // For prices < $1, show more decimal places
    if (num < 1) {
      return new Intl.NumberFormat(undefined, { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 6 
      }).format(num);
    } else if (num < 100) {
      return new Intl.NumberFormat(undefined, { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 4 
      }).format(num);
    } else {
      return new Intl.NumberFormat(undefined, { 
        style: 'currency', 
        currency: 'USD', 
        maximumFractionDigits: 2 
      }).format(num);
    }
  } else {
    // For volumes and large numbers, no currency symbol
    return new Intl.NumberFormat(undefined, { 
      maximumFractionDigits: 0 
    }).format(num);
  }
}

export function formatPct(s){
  if (typeof s === 'number') return `${s>=0?'+':''}${s.toFixed(2)}%`
  if (typeof s === 'string' && s.includes('%')) return s
  return s
}

export function subscribeTickers(cb){
  return _subscribe(cb)
}

export function generateOrderBook(center=45000){
  const rand = (min,max) => Math.random()*(max-min)+min
  const bids = Array.from({length: 16}, () => ({ price: center - rand(0, 50), amount: rand(0.01, 0.8) }))
  const asks = Array.from({length: 16}, () => ({ price: center + rand(0, 50), amount: rand(0.01, 0.8) }))
  bids.sort((a,b)=> b.price-a.price)
  asks.sort((a,b)=> a.price-b.price)
  return { bids, asks }
}
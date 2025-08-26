import { subscribeTickers as _subscribe, primeTickersFromBackend } from '../services/websocket.js'

export function formatCurrency(n){
  if (n == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(n))
}

export function formatPct(s){
  if (typeof s === 'number') return `${s>=0?'+':''}${s.toFixed(2)}%`
  return s
}

export function subscribeTickers(cb){
  return _subscribe(cb)
}

export function generateOrderBook(center=45000){
  const rand = (min,max) => Math.random()*(max-min)+min
  const bids = Array.from({length: 16}, () => ({ price: center - rand(0, 150), amount: rand(0.01, 0.8) }))
  const asks = Array.from({length: 16}, () => ({ price: center + rand(0, 150), amount: rand(0.01, 0.8) }))
  bids.sort((a,b)=> b.price-a.price)
  asks.sort((a,b)=> a.price-b.price)
  return { bids, asks }
}
import { useState } from 'react'
import api from '../../services/api.js'

export default function OrderForm({ pair = 'BTC/USD' }) {
  const [form, setForm] = useState({ pair, type: 'limit', side: 'buy', amount: '', price: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setStatus('')
    try {
      const { data } = await api.post('/api/trading/order', form)
      setStatus(`ORDER ACCEPTED #${data?.id || '—'}`)
      setForm({ ...form, amount: '', price: '' })
    } catch (e) {
      setStatus('ORDER REJECTED')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">ORDER_FORM ▷ {pair}</h3>
        <span className="badge-green">SIM</span>
      </div>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-green-300">type</label>
          <select className="ascii-input" value={form.type} onChange={e=>setField('type', e.target.value)}>
            <option value="limit">limit</option>
            <option value="market">market</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-green-300">side</label>
          <select className="ascii-input" value={form.side} onChange={e=>setField('side', e.target.value)}>
            <option value="buy">buy</option>
            <option value="sell">sell</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-green-300">pair</label>
          <input className="ascii-input" value={form.pair} onChange={e=>setField('pair', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-green-300">amount</label>
          <input className="ascii-input" value={form.amount} onChange={e=>setField('amount', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-xs text-green-300">price</label>
          <input className="ascii-input" value={form.price} onChange={e=>setField('price', e.target.value)} placeholder="0.00" />
        </div>
        <button className="ascii-btn col-span-2 py-2 glow" disabled={loading}>{loading?'SENDING…':'PLACE ORDER'}</button>
        {status && <div className="col-span-2 text-sm text-green-300/80">{status}</div>}
      </form>
    </div>
  )
}
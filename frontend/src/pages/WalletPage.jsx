import { useEffect, useState } from 'react'
import api from '../services/api.js'

export default function WalletPage(){
  const [data, setData] = useState(null)
  useEffect(()=>{
    const load = async()=> {
      try { const {data} = await api.get('/api/user/wallet'); setData(data) } catch {}
    }
    load()
  },[])

  return (
    <div className="max-w-5xl mx-auto card ascii-border">
      <div className="card-header"><h3 className="card-title">WALLET</h3><span className="badge-green">/api/user/wallet</span></div>
      {!data ? 'Loading…' : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="ascii-panel p-4">
            <div className="text-green-300/80 mb-2">Balances</div>
            <div className="space-y-1 text-sm">
              {Object.entries(data.balances || {}).map(([k,v])=> (
                <div key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
          <div className="ascii-panel p-4">
            <div className="text-green-300/80 mb-2">Deposit / Withdraw (simulation)</div>
            <div className="text-sm text-green-300/70">Generate addresses and update balances in backend as needed.</div>
          </div>
        </div>
      )}
    </div>
  )
}
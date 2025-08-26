import { useState } from 'react'
import OrderForm from '../components/trading/OrderForm.jsx'
import OrderBook from '../components/trading/OrderBook.jsx'
import PriceChart from '../components/trading/PriceChart.jsx'

export default function TradingPage(){
  const [selectedPair, setSelectedPair] = useState('BTC/USD')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <PriceChart pair={selectedPair} />
          <OrderBook pair={selectedPair} />
        </div>
        <div>
          <OrderForm pair={selectedPair} onPairChange={setSelectedPair} />
        </div>
      </div>
    </div>
  )
}
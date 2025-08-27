import { useState } from 'react'
import OrderForm from '../components/trading/OrderForm.jsx'
import OrderBook from '../components/trading/OrderBook.jsx'
import PriceChart from '../components/trading/PriceChart.jsx'
import ActiveOrders from '../components/trading/ActiveOrders.jsx'
import AdvancedOrderForm from '../components/trading/AdvancedOrderForm.jsx'
import MarginTradingPanel from '../components/trading/MarginTradingPanel.jsx'

export default function TradingPage(){
  const [selectedPair, setSelectedPair] = useState('BTC/USD')
  const [activeTab, setActiveTab] = useState('spot') // spot, advanced, margin

  const tabs = [
    { id: 'spot', label: 'SPOT TRADING', icon: '📈' },
    { id: 'advanced', label: 'ADVANCED ORDERS', icon: '⚡' },
    { id: 'margin', label: 'MARGIN TRADING', icon: '💰' }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Trading Mode Tabs */}
      <div className="card ascii-border">
        <div className="flex border-b border-gray-600">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-bold border-r border-gray-600 transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <PriceChart pair={selectedPair} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderBook pair={selectedPair} compact={true} />
            <ActiveOrders pair={selectedPair} />
          </div>
        </div>
        
        <div className="space-y-6">
          {activeTab === 'spot' && (
            <OrderForm pair={selectedPair} onPairChange={setSelectedPair} />
          )}
          
          {activeTab === 'advanced' && (
            <AdvancedOrderForm pair={selectedPair} onOrderPlaced={() => {}} />
          )}
          
          {activeTab === 'margin' && (
            <MarginTradingPanel pair={selectedPair} />
          )}
        </div>
      </div>
    </div>
  )
}
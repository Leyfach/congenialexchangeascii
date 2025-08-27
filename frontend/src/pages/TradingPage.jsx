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
  <div className="flex items-stretch border-b border-gray-600 bg-[#0a0a0a]">
    {tabs.map(tab => {
      const isActive = activeTab === tab.id
      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={[
            'relative px-4 py-2 md:px-6 md:py-3',
            'font-mono text-xs md:text-sm tracking-wider',
            'border-r border-gray-600',
            'overflow-hidden',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-green-500',
            'active:scale-95' // импульс при клике
          ].join(' ')}
          aria-pressed={isActive}
        >
          {/* Пульсирующий фон */}
          <span
            className={[
              'absolute inset-0 rounded-sm',
              'bg-green-500 opacity-0',
              'transition-opacity duration-500 ease-out',
              isActive ? 'opacity-10 animate-pulse' : ''
            ].join(' ')}
          />
          <span
            className={[
              'relative whitespace-nowrap select-none',
              'transition-transform duration-200',
              isActive ? 'scale-105' : 'scale-100'
            ].join(' ')}
          >
            {isActive ? `[ ${tab.label} ]` : `  ${tab.label}  `}
          </span>
        </button>
      )
    })}
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
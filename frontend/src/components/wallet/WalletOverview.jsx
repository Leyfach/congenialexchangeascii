import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api.js'

export default function WalletOverview() {
  const { t } = useTranslation()
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBalances()
  }, [])

  const fetchBalances = async () => {
    try {
      const { data } = await api.get('/api/user/wallet')
      const walletsObj = {}
      if (data.balances && Array.isArray(data.balances)) {
        data.balances.forEach(item => {
          walletsObj[item.currency] = parseFloat(item.balance) || 0
        })
      }
      setBalances(walletsObj)
    } catch (error) {
      console.error('Error fetching wallet balances:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">{t('wallet.overview').toUpperCase()}</h3>
        </div>
        <div className="p-4 text-center text-green-300/70">
          {t('common.loading')}...
        </div>
      </div>
    )
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">{t('wallet.overview').toUpperCase()}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {Object.entries(balances).map(([currency, balance]) => (
          <div key={currency} className="border border-green-500/30 p-3 bg-black/20">
            <div className="text-xs text-green-300/70">{currency}</div>
            <div className="text-lg font-mono text-neon-matrix">
              {parseFloat(balance).toFixed(currency === 'USD' ? 2 : 6)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
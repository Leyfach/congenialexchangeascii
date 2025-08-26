import { useState } from 'react'
import { authService } from '../../services/auth.js'

export default function TokenFixer({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClearAndLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Force clear all tokens
      localStorage.clear()
      
      // Login with demo credentials
      await authService.login({ email: 'test@test.com', password: 'password123' })
      
      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError('Failed to login: ' + (err?.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card ascii-border max-w-md">
        <div className="card-header">
          <h3 className="card-title">ACCESS_REQUIRED</h3>
          <span className="badge-green">DEMO</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-green-300/80 text-sm">
            Authentication token invalid. Click to get demo access:
          </div>
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          <button 
            onClick={handleClearAndLogin}
            disabled={loading}
            className="ascii-btn w-full py-3 glow"
          >
            {loading ? 'CONNECTING...' : 'GET DEMO ACCESS'}
          </button>
        </div>
      </div>
    </div>
  )
}
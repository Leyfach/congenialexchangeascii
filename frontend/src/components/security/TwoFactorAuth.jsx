import { useState, useEffect } from 'react'
import api from '../../services/api.js'

export default function TwoFactorAuth() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setupData, setSetupData] = useState(null)
  const [step, setStep] = useState('status') // status, setup, verify
  const [token, setToken] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    check2FAStatus()
  }, [])

  const check2FAStatus = async () => {
    try {
      const response = await api.get('/api/auth/2fa/status')
      if (response.data.success) {
        setIsEnabled(response.data.data.enabled)
        setBackupCodesRemaining(response.data.data.backupCodesRemaining)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      setError('Failed to check 2FA status')
      setLoading(false)
    }
  }

  const start2FASetup = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await api.post('/api/auth/2fa/setup')
      if (response.data.success) {
        setSetupData(response.data.data)
        setStep('setup')
      } else {
        setError('Failed to setup 2FA')
      }
      setLoading(false)
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      setError('Failed to setup 2FA')
      setLoading(false)
    }
  }

  const verify2FASetup = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!token.trim()) {
        setError('Please enter the verification code')
        setLoading(false)
        return
      }
      
      const response = await api.post('/api/auth/2fa/verify-setup', {
        token: token.trim()
      })
      
      if (response.data.success) {
        setSuccess('2FA has been enabled successfully!')
        setBackupCodes(setupData.backupCodes)
        setShowBackupCodes(true)
        setIsEnabled(true)
        setStep('backup-codes')
      } else {
        setError(response.data.error || 'Invalid verification code')
      }
      setLoading(false)
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      setError(error.response?.data?.error || 'Failed to verify 2FA')
      setLoading(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      if (!token.trim()) {
        setError('Please enter your current 2FA code to disable')
        setLoading(false)
        return
      }
      
      const response = await api.post('/api/auth/2fa/disable', {
        token: token.trim()
      })
      
      if (response.data.success) {
        setSuccess('2FA has been disabled')
        setIsEnabled(false)
        setToken('')
        setStep('status')
      } else {
        setError(response.data.error || 'Invalid verification code')
      }
      setLoading(false)
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      setError(error.response?.data?.error || 'Failed to disable 2FA')
      setLoading(false)
    }
  }

  const regenerateBackupCodes = async () => {
    if (!confirm('This will invalidate your current backup codes and generate new ones. Continue?')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      if (!token.trim()) {
        setError('Please enter your current 2FA code')
        setLoading(false)
        return
      }
      
      const response = await api.post('/api/auth/2fa/regenerate-backup-codes', {
        token: token.trim()
      })
      
      if (response.data.success) {
        setSuccess('New backup codes generated')
        setBackupCodes(response.data.data.backupCodes)
        setShowBackupCodes(true)
        setToken('')
        await check2FAStatus()
      } else {
        setError(response.data.error || 'Invalid verification code')
      }
      setLoading(false)
    } catch (error) {
      console.error('Error regenerating backup codes:', error)
      setError(error.response?.data?.error || 'Failed to regenerate backup codes')
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Copied to clipboard!')
      setTimeout(() => setSuccess(''), 2000)
    })
  }

  const downloadBackupCodes = () => {
    const content = `CryptoExchange 2FA Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes in a safe place. 
Each code can only be used once.

${backupCodes.join('\n')}

Keep these codes secure and do not share them with anyone.`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'crypto-exchange-backup-codes.txt'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">TWO_FACTOR_AUTHENTICATION</h3>
        </div>
        <div className="p-6 text-center">
          <span className="text-blue-400">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">TWO_FACTOR_AUTHENTICATION</h3>
        <span className={`badge-${isEnabled ? 'green' : 'red'}`}>
          {isEnabled ? 'ENABLED' : 'DISABLED'}
        </span>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded px-4 py-2 mb-4">
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-900/30 border border-green-500 rounded px-4 py-2 mb-4">
            <span className="text-green-400">{success}</span>
          </div>
        )}

        {step === 'status' && (
          <div className="space-y-4">
            {!isEnabled ? (
              <div>
                <p className="text-gray-300 mb-4">
                  Two-factor authentication adds an extra layer of security to your account.
                  Enable it using an authenticator app like Google Authenticator or Authy.
                </p>
                <button
                  onClick={start2FASetup}
                  disabled={loading}
                  className="ascii-btn bg-green-600 hover:bg-green-700"
                >
                  Enable 2FA
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-500 rounded p-4">
                  <h4 className="text-green-400 font-bold mb-2">✓ 2FA is Active</h4>
                  <p className="text-gray-300 text-sm">
                    Your account is protected with two-factor authentication.
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Backup codes remaining: {backupCodesRemaining}
                  </p>
                </div>

                <div className="flex gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Enter 2FA code"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="ascii-input w-32"
                      maxLength="6"
                    />
                  </div>
                  <button
                    onClick={regenerateBackupCodes}
                    disabled={loading || !token.trim()}
                    className="ascii-btn bg-blue-600 hover:bg-blue-700 text-sm"
                  >
                    New Backup Codes
                  </button>
                  <button
                    onClick={disable2FA}
                    disabled={loading || !token.trim()}
                    className="ascii-btn bg-red-600 hover:bg-red-700 text-sm"
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'setup' && setupData && (
          <div className="space-y-6">
            <div>
              <h4 className="text-white font-bold mb-3">Step 1: Scan QR Code</h4>
              <div className="bg-white p-4 rounded inline-block mb-4">
                <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <p className="text-gray-400 text-sm mb-2">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-2">Manual Entry Key:</h4>
              <div className="flex items-center gap-2 mb-4">
                <code className="bg-gray-800 px-3 py-1 rounded font-mono text-sm">
                  {setupData.manualEntryKey}
                </code>
                <button
                  onClick={() => copyToClipboard(setupData.manualEntryKey)}
                  className="ascii-btn-small bg-gray-600 hover:bg-gray-700"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3">Step 2: Verify Setup</h4>
              <p className="text-gray-400 text-sm mb-3">
                Enter the 6-digit code from your authenticator app:
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="000000"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  className="ascii-input w-24 text-center font-mono"
                  maxLength="6"
                />
                <button
                  onClick={verify2FASetup}
                  disabled={loading || token.length !== 6}
                  className="ascii-btn bg-green-600 hover:bg-green-700"
                >
                  Verify & Enable
                </button>
                <button
                  onClick={() => setStep('status')}
                  className="ascii-btn bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'backup-codes' && showBackupCodes && (
          <div className="space-y-4">
            <div className="bg-yellow-900/30 border border-yellow-500 rounded p-4 mb-4">
              <h4 className="text-yellow-400 font-bold mb-2">⚠️ Important: Save Your Backup Codes</h4>
              <p className="text-gray-300 text-sm">
                Store these backup codes in a safe place. Each code can only be used once 
                if you lose access to your authenticator app.
              </p>
            </div>

            <div className="bg-gray-800 rounded p-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2">
                    <code className="font-mono text-sm">{code}</code>
                    <button
                      onClick={() => copyToClipboard(code)}
                      className="ascii-btn-small bg-gray-600 hover:bg-gray-500 ml-2"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={downloadBackupCodes}
                  className="ascii-btn bg-blue-600 hover:bg-blue-700"
                >
                  Download Codes
                </button>
                <button
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  className="ascii-btn bg-gray-600 hover:bg-gray-700"
                >
                  Copy All
                </button>
                <button
                  onClick={() => {
                    setStep('status')
                    setShowBackupCodes(false)
                    setSuccess('')
                  }}
                  className="ascii-btn bg-green-600 hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
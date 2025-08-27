import { useState, useEffect } from 'react'
import api from '../../services/api.js'

export default function SecurityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSecurityLogs()
  }, [])

  const fetchSecurityLogs = async () => {
    try {
      const response = await api.get('/api/user/security-logs')
      if (response.data.success) {
        setLogs(response.data.data)
      } else {
        setError('Failed to fetch security logs')
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching security logs:', error)
      setError('Failed to fetch security logs')
      setLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const getEventIcon = (eventType) => {
    const icons = {
      '2fa_enabled': '🔐',
      '2fa_disabled': '🔓',
      '2fa_login_success': '✅',
      '2fa_login_failed': '❌',
      '2fa_backup_code_used': '🔑',
      '2fa_backup_code_failed': '⚠️',
      '2fa_backup_codes_regenerated': '🔄',
      'login_success': '👤',
      'login_failed': '🚫',
      'password_changed': '🔒',
      'withdrawal_attempted': '💸',
      'api_key_created': '🔗',
      'api_key_deleted': '🗑️'
    }
    return icons[eventType] || '📝'
  }

  const getEventColor = (eventType) => {
    if (eventType.includes('success') || eventType.includes('enabled') || eventType.includes('regenerated')) {
      return 'text-green-400'
    }
    if (eventType.includes('failed') || eventType.includes('disabled')) {
      return 'text-red-400'
    }
    if (eventType.includes('attempted') || eventType.includes('backup_code')) {
      return 'text-yellow-400'
    }
    return 'text-blue-400'
  }

  const formatEventDescription = (eventType) => {
    const descriptions = {
      '2fa_enabled': '2FA Authentication Enabled',
      '2fa_disabled': '2FA Authentication Disabled',
      '2fa_login_success': '2FA Login Successful',
      '2fa_login_failed': '2FA Login Failed',
      '2fa_backup_code_used': 'Backup Code Used',
      '2fa_backup_code_failed': 'Invalid Backup Code',
      '2fa_backup_codes_regenerated': 'Backup Codes Regenerated',
      'login_success': 'Login Successful',
      'login_failed': 'Login Failed',
      'password_changed': 'Password Changed',
      'withdrawal_attempted': 'Withdrawal Attempted',
      'api_key_created': 'API Key Created',
      'api_key_deleted': 'API Key Deleted'
    }
    return descriptions[eventType] || eventType.replace(/_/g, ' ').toUpperCase()
  }

  if (loading) {
    return (
      <div className="card ascii-border">
        <div className="card-header">
          <h3 className="card-title">SECURITY_LOGS</h3>
        </div>
        <div className="p-6 text-center">
          <span className="text-blue-400">Loading security logs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">SECURITY_LOGS</h3>
        <span className="badge-blue">
          {logs.length} EVENTS
        </span>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded px-4 py-2 mb-4">
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No security events recorded yet
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className="bg-gray-800/50 rounded border border-gray-700 p-4 hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {getEventIcon(log.event_type)}
                    </span>
                    <div>
                      <h4 className={`font-semibold ${getEventColor(log.event_type)}`}>
                        {formatEventDescription(log.event_type)}
                      </h4>
                      {log.details && (
                        <p className="text-gray-400 text-sm mt-1">
                          {log.details}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>Security events from the last 30 days</span>
            <button
              onClick={fetchSecurityLogs}
              className="ascii-btn-small bg-blue-600 hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
import TwoFactorAuth from '../components/security/TwoFactorAuth.jsx'
import SecurityLogs from '../components/security/SecurityLogs.jsx'

export default function Security() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">SECURITY_SETTINGS</h1>
        <p className="text-gray-400">Manage your account security and authentication settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <TwoFactorAuth />
        </div>
        
        <div className="space-y-6">
          <SecurityLogs />
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500 rounded">
        <h3 className="text-blue-400 font-bold mb-2">🔒 Security Best Practices</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Enable two-factor authentication for enhanced security</li>
          <li>• Use a strong, unique password for your account</li>
          <li>• Regularly review your security logs for suspicious activity</li>
          <li>• Keep your backup codes in a safe, offline location</li>
          <li>• Never share your credentials or 2FA codes with anyone</li>
        </ul>
      </div>
    </div>
  )
}
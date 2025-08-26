import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import './AccountPage.css';

const AccountPage = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    dateJoined: ''
  });
  const [securityData, setSecurityData] = useState({
    twoFactorEnabled: false,
    lastLogin: '',
    loginHistory: []
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    tradingNotifications: true,
    theme: 'light',
    language: 'en'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setProfileData({
        email: currentUser.email,
        firstName: 'John', // Mock data
        lastName: 'Doe',
        phone: '+1 (555) 123-4567',
        country: 'United States',
        dateJoined: new Date().toLocaleDateString()
      });
      setSecurityData({
        twoFactorEnabled: false,
        lastLogin: new Date().toLocaleString(),
        loginHistory: [
          { ip: '192.168.1.100', location: 'New York, US', time: new Date(Date.now() - 3600000).toLocaleString() },
          { ip: '192.168.1.101', location: 'New York, US', time: new Date(Date.now() - 86400000).toLocaleString() },
          { ip: '10.0.0.1', location: 'Chicago, US', time: new Date(Date.now() - 172800000).toLocaleString() }
        ]
      });
    }
    setLoading(false);
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    console.log('Profile updated:', profileData);
    alert('Profile updated successfully!');
  };

  const handleSecurityUpdate = (setting, value) => {
    setSecurityData(prev => ({
      ...prev,
      [setting]: value
    }));
    console.log(`Security setting ${setting} updated to:`, value);
  };

  const handlePreferenceUpdate = (preference, value) => {
    setPreferences(prev => ({
      ...prev,
      [preference]: value
    }));
    console.log(`Preference ${preference} updated to:`, value);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters!');
      return;
    }
    
    console.log('Password change requested');
    alert('Password changed successfully!');
    e.target.reset();
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="loading">Loading account...</div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-header">
        <h1>Account Settings</h1>
        <p>Manage your account information and preferences</p>
      </div>

      <div className="account-content">
        <div className="account-tabs">
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
          <button 
            className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button 
            className={`tab ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            Verification
          </button>
        </div>

        <div className="account-content-area">
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h2>Profile Information</h2>
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    readOnly
                    className="readonly"
                  />
                  <small>Email cannot be changed. Contact support if needed.</small>
                </div>
                
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Country</label>
                  <select
                    value={profileData.country}
                    onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Date Joined</label>
                  <input
                    type="text"
                    value={profileData.dateJoined}
                    readOnly
                    className="readonly"
                  />
                </div>
                
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="security-section">
              <h2>Security Settings</h2>
              
              <div className="security-card">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordChange} className="password-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input type="password" name="currentPassword" required />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" name="newPassword" required minLength="6" />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" name="confirmPassword" required minLength="6" />
                  </div>
                  <button type="submit" className="change-password-btn">
                    Change Password
                  </button>
                </form>
              </div>
              
              <div className="security-card">
                <h3>Two-Factor Authentication</h3>
                <div className="setting-row">
                  <div>
                    <strong>2FA Status:</strong>
                    <span className={`status ${securityData.twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                      {securityData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <button 
                    className={`toggle-btn ${securityData.twoFactorEnabled ? 'disable' : 'enable'}`}
                    onClick={() => handleSecurityUpdate('twoFactorEnabled', !securityData.twoFactorEnabled)}
                  >
                    {securityData.twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
                  </button>
                </div>
                <p className="setting-description">
                  Add an extra layer of security to your account using an authenticator app.
                </p>
              </div>
              
              <div className="security-card">
                <h3>Login History</h3>
                <div className="login-history">
                  {securityData.loginHistory.map((login, index) => (
                    <div key={index} className="login-item">
                      <div className="login-info">
                        <strong>{login.location}</strong>
                        <span>{login.ip}</span>
                      </div>
                      <span className="login-time">{login.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="preferences-section">
              <h2>Preferences</h2>
              
              <div className="preference-card">
                <h3>Notifications</h3>
                <div className="setting-row">
                  <label>Email Notifications</label>
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => handlePreferenceUpdate('emailNotifications', e.target.checked)}
                  />
                </div>
                <div className="setting-row">
                  <label>SMS Notifications</label>
                  <input
                    type="checkbox"
                    checked={preferences.smsNotifications}
                    onChange={(e) => handlePreferenceUpdate('smsNotifications', e.target.checked)}
                  />
                </div>
                <div className="setting-row">
                  <label>Trading Notifications</label>
                  <input
                    type="checkbox"
                    checked={preferences.tradingNotifications}
                    onChange={(e) => handlePreferenceUpdate('tradingNotifications', e.target.checked)}
                  />
                </div>
              </div>
              
              <div className="preference-card">
                <h3>Display</h3>
                <div className="setting-row">
                  <label>Theme</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceUpdate('theme', e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label>Language</label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handlePreferenceUpdate('language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="verification-section">
              <h2>Account Verification</h2>
              
              <div className="verification-card">
                <div className="verification-status">
                  <h3>Identity Verification</h3>
                  <span className="status pending">Pending</span>
                </div>
                <p>Complete your identity verification to unlock higher trading limits and additional features.</p>
                <div className="verification-requirements">
                  <div className="requirement">
                    <span className="requirement-icon">📄</span>
                    <span>Government-issued ID</span>
                    <span className="requirement-status pending">Pending</span>
                  </div>
                  <div className="requirement">
                    <span className="requirement-icon">🏠</span>
                    <span>Proof of address</span>
                    <span className="requirement-status pending">Pending</span>
                  </div>
                </div>
                <button className="verify-btn">Start Verification</button>
              </div>
              
              <div className="limits-card">
                <h3>Current Limits</h3>
                <div className="limit-item">
                  <span>Daily Withdrawal:</span>
                  <span>$10,000</span>
                </div>
                <div className="limit-item">
                  <span>Monthly Withdrawal:</span>
                  <span>$100,000</span>
                </div>
                <div className="limit-item">
                  <span>Daily Trading:</span>
                  <span>Unlimited</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
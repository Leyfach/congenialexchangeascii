const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { dbOps } = require('../../database/db');

class TwoFactorAuth {
  constructor() {
    this.appName = 'CryptoExchange';
  }

  generateSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: this.appName,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  }

  async generateQRCode(otpauthUrl) {
    try {
      return await qrcode.toDataURL(otpauthUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 60 seconds window (2 * 30s periods)
    });
  }

  verifyBackupCode(backupCodes, code) {
    const codes = JSON.parse(backupCodes || '[]');
    const codeIndex = codes.indexOf(code.toUpperCase());
    
    if (codeIndex !== -1) {
      codes.splice(codeIndex, 1);
      return {
        valid: true,
        updatedCodes: JSON.stringify(codes)
      };
    }
    
    return { valid: false };
  }

  async setup2FA(userId, userEmail) {
    try {
      const { secret, otpauth_url } = this.generateSecret(userEmail);
      const backupCodes = this.generateBackupCodes();
      const qrCodeDataUrl = await this.generateQRCode(otpauth_url);

      dbOps.create2FASecret.run(userId, secret, JSON.stringify(backupCodes));

      return {
        qrCode: qrCodeDataUrl,
        secret: secret,
        backupCodes: backupCodes,
        manualEntryKey: secret
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw new Error('Failed to setup 2FA');
    }
  }

  async verify2FASetup(userId, token) {
    try {
      const settings = dbOps.get2FASettings.get(userId);
      if (!settings) {
        throw new Error('2FA not initialized for this user');
      }

      const isValid = this.verifyToken(settings.secret, token);
      if (isValid) {
        dbOps.enable2FA.run(userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying 2FA setup:', error);
      throw new Error('Failed to verify 2FA setup');
    }
  }

  async authenticate(userId, token, isBackupCode = false) {
    try {
      const settings = dbOps.get2FASettings.get(userId);
      if (!settings || !settings.enabled) {
        throw new Error('2FA is not enabled for this user');
      }

      if (isBackupCode) {
        const result = this.verifyBackupCode(settings.backup_codes, token);
        if (result.valid) {
          dbOps.create2FASecret.run(userId, settings.secret, result.updatedCodes);
          return true;
        }
        return false;
      } else {
        return this.verifyToken(settings.secret, token);
      }
    } catch (error) {
      console.error('Error authenticating with 2FA:', error);
      throw new Error('Failed to authenticate with 2FA');
    }
  }

  async get2FAStatus(userId) {
    try {
      const settings = dbOps.get2FASettings.get(userId);
      return {
        enabled: settings ? settings.enabled : false,
        setupDate: settings ? settings.enabled_at : null,
        backupCodesRemaining: settings ? JSON.parse(settings.backup_codes || '[]').length : 0
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw new Error('Failed to get 2FA status');
    }
  }

  async disable2FA(userId) {
    try {
      dbOps.disable2FA.run(userId);
      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  async regenerateBackupCodes(userId) {
    try {
      const settings = dbOps.get2FASettings.get(userId);
      if (!settings || !settings.enabled) {
        throw new Error('2FA is not enabled for this user');
      }

      const newBackupCodes = this.generateBackupCodes();
      dbOps.create2FASecret.run(userId, settings.secret, JSON.stringify(newBackupCodes));

      return newBackupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }
}

module.exports = new TwoFactorAuth();
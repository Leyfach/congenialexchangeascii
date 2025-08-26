const { ethers } = require('ethers');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const crypto = require('crypto');

/**
 * Generate ETH wallet with private key and address
 */
function generateETHWallet() {
  try {
    // Generate random wallet
    const wallet = ethers.Wallet.createRandom();
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      network: 'ethereum'
    };
  } catch (error) {
    console.error('Error generating ETH wallet:', error);
    throw error;
  }
}

/**
 * Generate Solana wallet with keypair
 */
function generateSOLWallet() {
  try {
    // Generate random keypair
    const keypair = Keypair.generate();
    
    return {
      address: keypair.publicKey.toBase58(),
      privateKey: Buffer.from(keypair.secretKey).toString('base64'),
      publicKey: keypair.publicKey.toBase58(),
      network: 'solana'
    };
  } catch (error) {
    console.error('Error generating SOL wallet:', error);
    throw error;
  }
}

/**
 * Generate BTC wallet (simplified - for demo purposes)
 * Note: In production, use proper Bitcoin libraries like bitcoinjs-lib
 */
function generateBTCWallet() {
  try {
    // This is a simplified version for demo
    // In production, use proper BTC wallet generation
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
    
    // Mock BTC address generation (not real BTC address format)
    const address = '1' + crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 33);
    
    return {
      address: address,
      privateKey: privateKey,
      publicKey: publicKey,
      network: 'bitcoin'
    };
  } catch (error) {
    console.error('Error generating BTC wallet:', error);
    throw error;
  }
}

/**
 * Generate all wallets for a user
 */
function generateUserWallets(userId) {
  try {
    const wallets = {
      eth: generateETHWallet(),
      sol: generateSOLWallet(),
      btc: generateBTCWallet()
    };
    
    console.log(`Generated wallets for user ${userId}:`);
    console.log(`ETH: ${wallets.eth.address}`);
    console.log(`SOL: ${wallets.sol.address}`);
    console.log(`BTC: ${wallets.btc.address}`);
    
    return wallets;
  } catch (error) {
    console.error('Error generating user wallets:', error);
    throw error;
  }
}

/**
 * Validate ETH address
 */
function isValidETHAddress(address) {
  return ethers.isAddress(address);
}

/**
 * Validate Solana address
 */
function isValidSOLAddress(address) {
  try {
    // Simple length check for Solana address
    return address.length >= 32 && address.length <= 44;
  } catch {
    return false;
  }
}

/**
 * Generate deposit address for specific currency
 */
function generateDepositAddress(currency, userId) {
  switch (currency.toUpperCase()) {
    case 'ETH':
    case 'USDT':
    case 'USDC':
      return generateETHWallet();
    
    case 'SOL':
    case 'WSOL':
      return generateSOLWallet();
      
    case 'BTC':
      return generateBTCWallet();
      
    default:
      throw new Error(`Unsupported currency: ${currency}`);
  }
}

/**
 * Encrypt private key for secure storage
 */
function encryptPrivateKey(privateKey, password = process.env.WALLET_ENCRYPTION_KEY || 'default_key') {
  const algorithm = 'aes-256-ctr';
  const secretKey = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
  
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex')
  };
}

/**
 * Decrypt private key
 */
function decryptPrivateKey(encrypted, password = process.env.WALLET_ENCRYPTION_KEY || 'default_key') {
  const algorithm = 'aes-256-ctr';
  const secretKey = crypto.createHash('sha256').update(password).digest();
  const iv = Buffer.from(encrypted.iv, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.content, 'hex')),
    decipher.final()
  ]);
  
  return decrypted.toString();
}

module.exports = {
  generateETHWallet,
  generateSOLWallet,
  generateBTCWallet,
  generateUserWallets,
  generateDepositAddress,
  isValidETHAddress,
  isValidSOLAddress,
  encryptPrivateKey,
  decryptPrivateKey
};
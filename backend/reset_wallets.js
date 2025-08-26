const { DatabaseOperations } = require('./database/operations');
const { generateUserWallets } = require('./services/walletGenerator');

async function resetUserWallets() {
  const db = new DatabaseOperations();
  
  try {
    await db.init();
    console.log('🔧 Resetting user wallets...\n');
    
    // Get demo user
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      console.log('❌ Demo user not found');
      return;
    }
    
    console.log(`👤 User: ${user.email} (ID: ${user.id})\n`);
    
    // Delete existing wallets
    await db.db.query('DELETE FROM user_wallets WHERE user_id = $1', [user.id]);
    console.log('🗑️  Deleted existing wallets\n');
    
    // Generate new wallets
    console.log('🔄 Generating new wallets...');
    const wallets = generateUserWallets(user.id);
    
    // Create ETH wallet with encrypted private key
    console.log('💰 Creating ETH wallet...');
    const ethEncrypted = db.db.encrypt(wallets.eth.privateKey);
    await db.createWallet(
      user.id, 'ethereum', 'ETH', 
      wallets.eth.address, 
      ethEncrypted,
      wallets.eth.publicKey
    );
    console.log(`   Address: ${wallets.eth.address}`);
    
    // Create SOL wallet  
    console.log('☀️ Creating SOL wallet...');
    const solEncrypted = db.db.encrypt(wallets.sol.privateKey);
    await db.createWallet(
      user.id, 'solana', 'SOL',
      wallets.sol.address,
      solEncrypted, 
      wallets.sol.publicKey
    );
    console.log(`   Address: ${wallets.sol.address}`);
    
    // Create BTC wallet
    console.log('₿ Creating BTC wallet...');
    const btcEncrypted = db.db.encrypt(wallets.btc.privateKey);
    await db.createWallet(
      user.id, 'bitcoin', 'BTC',
      wallets.btc.address,
      btcEncrypted,
      wallets.btc.publicKey
    );
    console.log(`   Address: ${wallets.btc.address}`);
    
    console.log('\n✅ Wallets reset successfully!');
    console.log('🔍 Use node check_wallets.js to verify');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

// CLI usage
if (require.main === module) {
  resetUserWallets();
}

module.exports = { resetUserWallets };
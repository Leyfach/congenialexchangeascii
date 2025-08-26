const { DatabaseOperations } = require('./database/operations');

async function checkUserWallets() {
  const db = new DatabaseOperations();
  
  try {
    await db.init();
    console.log('🔍 Checking user wallets in database...\n');
    
    // Get demo user
    const user = await db.getUserByEmail('demo@example.com');
    if (!user) {
      console.log('❌ Demo user not found');
      return;
    }
    
    console.log(`👤 User: ${user.email} (ID: ${user.id})`);
    console.log(`📅 Created: ${user.created_at}\n`);
    
    // Get user wallets
    const wallets = await db.getUserWallets(user.id);
    
    if (wallets.length === 0) {
      console.log('📱 No wallets found for this user');
      console.log('💡 Use POST /api/user/generate-wallets to create wallets\n');
      return;
    }
    
    console.log(`📱 Found ${wallets.length} wallet(s):\n`);
    
    for (const wallet of wallets) {
      console.log(`🏦 ${wallet.currency} (${wallet.network})`);
      console.log(`   Address: ${wallet.address}`);
      console.log(`   Public Key: ${wallet.public_key}`);
      console.log(`   Created: ${new Date(wallet.created_at).toLocaleString()}`);
      console.log(`   Status: ${wallet.is_active ? '✅ Active' : '❌ Inactive'}\n`);
      
      // Get wallet with private key
      try {
        const walletWithKey = await db.getWalletWithPrivateKey(user.id, wallet.network, wallet.currency);
        if (walletWithKey && walletWithKey.private_key_decrypted) {
          console.log(`   🔑 Private Key: ${walletWithKey.private_key_decrypted.substring(0, 20)}...`);
        }
      } catch (error) {
        console.log(`   🔑 Private Key: ❌ Failed to decrypt`);
      }
      console.log('');
    }
    
    // Check deposits
    const deposits = await db.getUserDeposits(user.id);
    console.log(`💰 Deposits: ${deposits.length} found`);
    
    // Check withdrawals
    const withdrawals = await db.getUserWithdrawals(user.id);
    console.log(`💸 Withdrawals: ${withdrawals.length} found`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

// CLI usage
if (require.main === module) {
  checkUserWallets();
}

module.exports = { checkUserWallets };
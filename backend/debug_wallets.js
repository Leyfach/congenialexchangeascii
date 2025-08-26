const { DatabaseOperations } = require('./database/operations');

async function debugWallets() {
  const db = new DatabaseOperations();
  
  try {
    await db.init();
    
    const user = await db.getUserByEmail('demo@example.com');
    
    // Get raw wallet data from database
    const result = await db.db.query(`
      SELECT id, network, currency, address, private_key_encrypted, public_key
      FROM user_wallets 
      WHERE user_id = $1
      LIMIT 1
    `, [user.id]);
    
    if (result.rows[0]) {
      const wallet = result.rows[0];
      
      console.log('🔍 Raw wallet data from database:');
      console.log('Network:', wallet.network);
      console.log('Currency:', wallet.currency);
      console.log('Address:', wallet.address);
      console.log('Public Key:', wallet.public_key);
      console.log('Private Key Encrypted Type:', typeof wallet.private_key_encrypted);
      console.log('Private Key Encrypted Value:', wallet.private_key_encrypted);
      
      // Try to decrypt directly (since it's already an object)
      try {
        console.log('🔄 Attempting to decrypt directly...');
        const decrypted = db.db.decrypt(wallet.private_key_encrypted);
        console.log('🔑 Decrypted private key:', decrypted);
        
      } catch (error) {
        console.error('❌ Error decrypting:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

debugWallets();
const { DatabaseOperations } = require('./operations');
const { dbOps } = require('./db');
const crypto = require('crypto');

class DatabaseMigration {
  constructor() {
    this.postgresOps = new DatabaseOperations();
  }

  async migrate() {
    console.log('Starting migration from SQLite to PostgreSQL...');

    try {
      // Initialize PostgreSQL
      await this.postgresOps.init();

      // Check if demo user already exists in PostgreSQL
      const existingUser = await this.postgresOps.getUserByEmail('demo@example.com');
      if (existingUser) {
        console.log('PostgreSQL already contains demo user, skipping migration');
        return;
      }

      // Get demo user from SQLite
      const sqliteUser = dbOps.getUserByEmail.get('demo@example.com');
      if (!sqliteUser) {
        console.log('No demo user found in SQLite to migrate');
        return;
      }

      console.log('Migrating user data...');

      // Create user in PostgreSQL
      const pgUser = await this.postgresOps.createUser(
        sqliteUser.email,
        sqliteUser.username,
        sqliteUser.password_hash
      );

      console.log(`Created user with ID: ${pgUser.id}`);

      // Migrate balances
      console.log('Migrating balances...');
      const sqliteBalances = dbOps.getUserBalances.all(sqliteUser.id);
      
      for (const balance of sqliteBalances) {
        await this.postgresOps.updateBalance(
          pgUser.id,
          balance.currency,
          balance.balance,
          balance.available,
          0 // locked
        );
        console.log(`Migrated ${balance.currency} balance: ${balance.balance}`);
      }

      // Migrate trades
      console.log('Migrating trades...');
      const sqliteTrades = dbOps.getUserTrades.all(sqliteUser.id);
      
      for (const trade of sqliteTrades) {
        // First create a dummy order for the trade
        const orderId = `migrated_order_${trade.id}`;
        const orderResult = await this.postgresOps.createOrder(
          pgUser.id,
          orderId,
          trade.pair,
          trade.type, // side
          'market', // type
          trade.amount, // quantity
          trade.price,
          'filled'
        );

        // Then create the trade
        await this.postgresOps.createTrade(
          pgUser.id,
          orderResult.id,
          trade.pair,
          trade.type, // side
          trade.amount, // quantity
          trade.price,
          trade.amount * trade.price // total
        );
        
        console.log(`Migrated trade: ${trade.type} ${trade.amount} ${trade.pair} at ${trade.price}`);
      }

      // Migrate wallets
      console.log('Migrating wallets...');
      const sqliteWallets = dbOps.getUserWallets.all(sqliteUser.id);
      
      for (const wallet of sqliteWallets) {
        // The private key is already encrypted in SQLite format
        // We need to re-encrypt it using PostgreSQL encryption
        let encryptedPrivateKey;
        
        try {
          // Parse the existing encrypted private key
          const existingEncryption = JSON.parse(wallet.private_key_encrypted);
          
          // For migration, we'll use a placeholder since we can't decrypt the old format
          // In a real scenario, you'd need the decryption key to properly migrate
          const placeholderPrivateKey = `migrated_private_key_${wallet.currency.toLowerCase()}`;
          encryptedPrivateKey = this.postgresOps.db.encrypt(placeholderPrivateKey);
          
        } catch (error) {
          console.warn(`Could not decrypt wallet ${wallet.currency}, using placeholder`);
          const placeholderPrivateKey = `migrated_private_key_${wallet.currency.toLowerCase()}`;
          encryptedPrivateKey = this.postgresOps.db.encrypt(placeholderPrivateKey);
        }

        await this.postgresOps.createWallet(
          pgUser.id,
          wallet.network,
          wallet.currency,
          wallet.address,
          encryptedPrivateKey,
          wallet.public_key
        );
        
        console.log(`Migrated ${wallet.currency} wallet: ${wallet.address}`);
      }

      console.log('Migration completed successfully!');
      console.log('Note: Wallet private keys were migrated with placeholders due to encryption format changes.');
      console.log('Users should regenerate their wallets for security.');

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.postgresOps.init();
      console.log('PostgreSQL connection successful');
      return true;
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      return false;
    }
  }

  async close() {
    await this.postgresOps.close();
  }
}

// CLI usage
if (require.main === module) {
  const migration = new DatabaseMigration();
  
  const command = process.argv[2];
  
  if (command === 'test') {
    migration.testConnection()
      .then((success) => {
        if (success) {
          console.log('✅ PostgreSQL connection test passed');
        } else {
          console.log('❌ PostgreSQL connection test failed');
        }
        process.exit(success ? 0 : 1);
      });
  } else if (command === 'migrate') {
    migration.migrate()
      .then(() => {
        console.log('✅ Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node database/migration.js test     - Test PostgreSQL connection');
    console.log('  node database/migration.js migrate  - Migrate from SQLite to PostgreSQL');
  }
}

module.exports = { DatabaseMigration };
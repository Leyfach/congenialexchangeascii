const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  // Connect to default postgres database first
  const defaultPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres', // Connect to default database
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('Connecting to PostgreSQL...');
    
    // Check if crypto_exchange database exists
    const result = await defaultPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'crypto_exchange'"
    );
    
    if (result.rows.length === 0) {
      console.log('Creating crypto_exchange database...');
      await defaultPool.query('CREATE DATABASE crypto_exchange');
      console.log('✅ Database crypto_exchange created successfully');
    } else {
      console.log('✅ Database crypto_exchange already exists');
    }
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await defaultPool.end();
  }
}

setupDatabase();
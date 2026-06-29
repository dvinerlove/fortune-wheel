import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

console.log('Testing Supabase connection...');

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful! Current time:', res.rows[0].now);
    
    // Try to create shares table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id VARCHAR(10) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ shares table created/already exists');
    
    // Try to create game_prices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_prices (
        app_id VARCHAR(50) PRIMARY KEY,
        price NUMERIC(10, 2),
        discount INTEGER,
        original_price NUMERIC(10, 2),
        currency VARCHAR(10),
        region VARCHAR(10),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ game_prices table created/already exists');
    
    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

test();

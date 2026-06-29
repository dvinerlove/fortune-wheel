import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import fetch from 'node-fetch'; // We'll need node-fetch
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'fortune_wheel',
});

// Create tables if not exists
async function initDB() {
  // Shares table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shares (
      id VARCHAR(10) PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Prices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_prices (
      app_id VARCHAR(50) PRIMARY KEY,
      price NUMERIC(10, 2),
      discount INTEGER,
      original_price NUMERIC(10, 2),
      currency VARCHAR(10),
      region VARCHAR(10),
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
initDB();

// Helper to get Steam price
async function fetchSteamPriceFromAPI(appId, region, currency) {
  const regionMap = {
    kz: 'kz', ru: 'ru', us: 'us', eu: 'eu'
  };
  const cc = regionMap[region] || 'kz';
  
  let url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${cc}&filters=price_overview`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data[appId]?.success) return null;
  
  const priceData = data[appId].data?.price_overview;
  if (!priceData) return null;
  
  return {
    price: priceData.final / 100,
    discount: priceData.discount_percent,
    originalPrice: priceData.initial / 100,
    currency: priceData.currency
  };
}

// Create share
app.post('/api/shares', async (req, res) => {
  try {
    const { data } = req.body;
    const id = Math.random().toString(36).substring(2, 8);
    await pool.query(
      'INSERT INTO shares (id, data) VALUES ($1, $2)',
      [id, data]
    );
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

// Get share
app.get('/api/shares/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT data FROM shares WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share not found' });
    }
    res.json(result.rows[0].data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get share' });
  }
});

// Get game price (with 4-day cache)
app.get('/api/price/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { region = 'kz', currency = 'KZT' } = req.query;
    
    // Check DB first
    const dbResult = await pool.query(
      'SELECT * FROM game_prices WHERE app_id = $1 AND region = $2',
      [appId, region]
    );
    
    const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    if (dbResult.rows.length > 0) {
      const { price, discount, original_price, last_updated } = dbResult.rows[0];
      const updatedAt = new Date(last_updated);
      
      if (now - updatedAt < FOUR_DAYS_MS) {
        return res.json({
          price,
          discount,
          originalPrice: original_price
        });
      }
    }
    
    // Fetch new price
    const priceData = await fetchSteamPriceFromAPI(appId, region, currency);
    if (!priceData) {
      return res.status(404).json({ error: 'Price not found' });
    }
    
    // Update DB
    await pool.query(`
      INSERT INTO game_prices (app_id, price, discount, original_price, currency, region, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (app_id) DO UPDATE SET
        price = EXCLUDED.price,
        discount = EXCLUDED.discount,
        original_price = EXCLUDED.original_price,
        currency = EXCLUDED.currency,
        region = EXCLUDED.region,
        last_updated = EXCLUDED.last_updated;
    `, [
      appId,
      priceData.price,
      priceData.discount,
      priceData.originalPrice,
      priceData.currency,
      region,
      now
    ]);
    
    res.json(priceData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get price' });
  }
});

// Preload multiple prices
app.post('/api/prices/preload', async (req, res) => {
  try {
    const { appIds, region = 'kz' } = req.body;
    const results = [];
    const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    for (const appId of appIds) {
      // Check DB first
      const dbResult = await pool.query(
        'SELECT * FROM game_prices WHERE app_id = $1 AND region = $2',
        [appId, region]
      );
      
      let priceData;
      if (dbResult.rows.length > 0) {
        const { price, discount, original_price, last_updated } = dbResult.rows[0];
        const updatedAt = new Date(last_updated);
        
        if (now - updatedAt < FOUR_DAYS_MS) {
          priceData = {
            price,
            discount,
            originalPrice: original_price
          };
        }
      }
      
      // If no cache or expired, fetch from API
      if (!priceData) {
        priceData = await fetchSteamPriceFromAPI(appId, region, 'KZT');
        if (priceData) {
          await pool.query(`
            INSERT INTO game_prices (app_id, price, discount, original_price, currency, region, last_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (app_id) DO UPDATE SET
              price = EXCLUDED.price,
              discount = EXCLUDED.discount,
              original_price = EXCLUDED.original_price,
              currency = EXCLUDED.currency,
              region = EXCLUDED.region,
              last_updated = EXCLUDED.last_updated;
          `, [
            appId,
            priceData.price,
            priceData.discount,
            priceData.originalPrice,
            priceData.currency,
            region,
            now
          ]);
        }
      }
      
      results.push({ appId, data: priceData });
    }
    
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to preload prices' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

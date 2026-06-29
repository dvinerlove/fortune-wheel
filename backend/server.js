import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY
);

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
    original_price: priceData.initial / 100,
    currency: priceData.currency
  };
}

// Create share
app.post('/api/shares', async (req, res) => {
  try {
    const { data } = req.body;
    const id = Math.random().toString(36).substring(2, 8);
    const { error } = await supabase
      .from('shares')
      .insert({ id, data });
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('shares')
      .select('data')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data.data);
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
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    
    // Check Supabase first
    const { data: existingPrice, error: selectError } = await supabase
      .from('game_prices')
      .select('*')
      .eq('app_id', appId)
      .eq('region', region)
      .gte('last_updated', fourDaysAgo)
      .single();
    
    if (!selectError && existingPrice) {
      return res.json({
        price: existingPrice.price,
        discount: existingPrice.discount,
        originalPrice: existingPrice.original_price
      });
    }
    
    // Fetch new price
    const priceData = await fetchSteamPriceFromAPI(appId, region, currency);
    if (!priceData) {
      return res.status(404).json({ error: 'Price not found' });
    }
    
    // Update Supabase
    const { error: upsertError } = await supabase
      .from('game_prices')
      .upsert({
        app_id: appId,
        price: priceData.price,
        discount: priceData.discount,
        original_price: priceData.original_price,
        currency: priceData.currency,
        region: region,
        last_updated: new Date().toISOString()
      });
    if (upsertError) console.error('Upsert error:', upsertError);
    
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
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    
    for (const appId of appIds) {
      // Check Supabase first
      const { data: existingPrice, error: selectError } = await supabase
        .from('game_prices')
        .select('*')
        .eq('app_id', appId)
        .eq('region', region)
        .gte('last_updated', fourDaysAgo)
        .single();
      
      let priceData = null;
      if (!selectError && existingPrice) {
        priceData = {
          price: existingPrice.price,
          discount: existingPrice.discount,
          originalPrice: existingPrice.original_price
        };
      }
      
      // If no cache or expired, fetch from API
      if (!priceData) {
        priceData = await fetchSteamPriceFromAPI(appId, region, 'KZT');
        if (priceData) {
          const { error: upsertError } = await supabase
            .from('game_prices')
            .upsert({
              app_id: appId,
              price: priceData.price,
              discount: priceData.discount,
              original_price: priceData.original_price,
              currency: priceData.currency,
              region: region,
              last_updated: new Date().toISOString()
            });
          if (upsertError) console.error('Upsert error:', upsertError);
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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase.from('shares').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'ok', database: 'connected', supabaseUrl: process.env.SUPABASE_URL });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

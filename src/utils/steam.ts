import type { Settings } from '../types';

interface SteamPriceData {
  price?: string;
  discount?: string;
  originalPrice?: string;
}

interface SteamSearchResult {
  appId: string;
  name: string;
  icon: string;
}

interface GameMapping {
  game_name: string;
  app_id: string;
  created_at: string;
  updated_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://tyxlbygyynhdxcexgaxf.functions.supabase.co/fortune-wheel';

export async function fetchSteamPrice(
  appId: string, 
  settings: Pick<Settings, 'steam'>
): Promise<SteamPriceData | undefined> {
  try {
    if (!settings.steam.enableIntegration) return undefined;

    console.log('Fetching Steam price for appId:', appId);
    
    // Try to use backend API first
    try {
      const response = await fetch(`${API_URL}/api/price/${appId}?region=${settings.steam.region}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data) {
          const result: SteamPriceData = {};
          
          // Format price with currency
          const currencySymbol = {
            'KZT': '₸',
            'USD': '$',
            'EUR': '€',
            'RUB': '₽'
          }[settings.steam.currency] || '';
          
          result.price = `${data.price} ${currencySymbol}`.trim();
          
          if (data.discount > 0) {
            result.discount = `-${data.discount}%`;
            result.originalPrice = `${data.originalPrice} ${currencySymbol}`.trim();
          }
          
          console.log('Successfully got price data from backend!');
          return result;
        }
      }
    } catch (apiErr) {
      console.warn('Backend API failed, falling back to proxies:', apiErr);
    }
    
    // Fallback to proxy method if backend is not available
    const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${settings.steam.region}&filters=price_overview`;
    
    // Попробуем несколько прокси по очереди
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(steamUrl)}`, // corsproxy.io - часто работает
      `https://api.allorigins.win/raw?url=${encodeURIComponent(steamUrl)}`, // allorigins raw
      `https://api.allorigins.win/get?url=${encodeURIComponent(steamUrl)}`, // allorigins get
    ];

    for (let i = 0; i < proxies.length; i++) {
      try {
        const proxyUrl = proxies[i];
        console.log(`Trying proxy ${i + 1}:`, proxyUrl);
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          console.warn(`Proxy ${i + 1} returned status:`, response.status);
          continue;
        }
        
        const responseText = await response.text();
        console.log(`Proxy ${i + 1} response (first 300 chars):`, responseText.substring(0, 300));
        
        let data: any;
        // Проверяем, какой формат у ответа
        if (responseText.includes('contents')) {
          try {
            const proxyData = JSON.parse(responseText);
            data = JSON.parse(proxyData.contents);
          } catch (parseErr) {
            console.warn('Failed to parse allorigins get response');
            continue;
          }
        } else {
          try {
            data = JSON.parse(responseText);
          } catch (parseErr) {
            console.warn('Failed to parse raw response');
            continue;
          }
        }
        
        console.log('Parsed data:', data);
        
        // Парсим данные
        if (data && data[appId] && data[appId].success) {
          const appData = data[appId].data;
          
          if (appData.is_free) {
            return { price: 'Бесплатно' };
          }
          
          const priceOverview = appData.price_overview;
          if (priceOverview) {
            const result: SteamPriceData = {
              price: priceOverview.final_formatted
            };
            
            if (priceOverview.discount_percent > 0) {
              result.discount = `-${priceOverview.discount_percent}%`;
              result.originalPrice = priceOverview.initial_formatted;
            }
            
            console.log('Successfully got price data!');
            return result;
          }
        }
      } catch (proxyErr) {
        console.warn(`Proxy ${i + 1} failed:`, proxyErr);
        continue;
      }
    }

    console.warn('All proxies failed to get price data');
    return undefined;
  } catch (error) {
    console.error('Error fetching steam price:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return undefined;
  }
}

export async function searchSteamGames(query: string): Promise<SteamSearchResult[]> {
  try {
    const response = await fetch(`${API_URL}/api/steam/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error searching Steam:', error);
    return [];
  }
}

export async function getGameMapping(gameName: string): Promise<GameMapping | null> {
  try {
    const response = await fetch(`${API_URL}/api/mappings?gameName=${encodeURIComponent(gameName)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting game mapping:', error);
    return null;
  }
}

export async function saveGameMapping(gameName: string, appId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, appId })
    });
    return response.ok;
  } catch (error) {
    console.error('Error saving game mapping:', error);
    return false;
  }
}

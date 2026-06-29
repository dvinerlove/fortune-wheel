import type { Settings } from '../types';

interface SteamPriceData {
  price?: string;
  discount?: string;
  originalPrice?: string;
}

interface RawSteamPriceData {
  price?: number;
  discount?: number;
  originalPrice?: number;
}

export interface SteamSearchResult {
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

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchSteamPrice(
  appId: string, 
  settings: Pick<Settings, 'steam'>
): Promise<SteamPriceData | undefined> {
  try {
    if (!settings.steam.enableIntegration) return undefined;
    
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
          
          if (data.price != null) {
            result.price = `${data.price} ${currencySymbol}`.trim();
          }
          
          if (data.discount > 0 && data.originalPrice != null) {
            result.discount = `-${data.discount}%`;
            result.originalPrice = `${data.originalPrice} ${currencySymbol}`.trim();
          }
          
          return result;
        }
      }
    } catch (apiErr) {
      // Backend API failed, falling back to proxies
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
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          continue;
        }
        
        const responseText = await response.text();
        
        let data: any;
        // Проверяем, какой формат у ответа
        if (responseText.includes('contents')) {
          try {
            const proxyData = JSON.parse(responseText);
            data = JSON.parse(proxyData.contents);
          } catch (parseErr) {
            continue;
          }
        } else {
          try {
            data = JSON.parse(responseText);
          } catch (parseErr) {
            continue;
          }
        }
        
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
            
            return result;
          }
        }
      } catch (proxyErr) {
        continue;
      }
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

export async function searchSteamGames(query: string): Promise<SteamSearchResult[]> {
  try {
    const response = await fetch(`${API_URL}/api/steam/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    return [];
  }
}

export async function getGameMapping(gameName: string): Promise<GameMapping | null> {
  try {
    const response = await fetch(`${API_URL}/api/mappings?gameName=${encodeURIComponent(gameName)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
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
    return false;
  }
}

export async function preloadPrices(appIds: string[], region: string, force: boolean = false): Promise<{ [appId: string]: RawSteamPriceData }> {
  try {
    const response = await fetch(`${API_URL}/api/prices/preload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appIds, region, force })
    });

    if (!response.ok) return {};

    const data = await response.json();
    const results: { [appId: string]: RawSteamPriceData } = {};

    if (data && data.results) {
      for (const result of data.results) {
        if (result.data) {
          results[result.appId] = {
            price: result.data.price,
            discount: result.data.discount,
            originalPrice: result.data.originalPrice
          };
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error preloading prices:', error);
    return {};
  }
}

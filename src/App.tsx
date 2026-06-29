import { useState, useEffect, useRef } from 'react';
import type { Game, Settings, HistoryItem } from './types';
import { INITIAL_GAMES, STEAM_APP_IDS, getGameColor } from './constants';
import { DEFAULT_SETTINGS } from './types';
import { fetchSteamPrice, searchSteamGames, getGameMapping, saveGameMapping, preloadPrices, getMappingSuggestions, type MappingSuggestion } from './utils/steam';
import type { SteamSearchResult } from './utils/steam';
import FortuneWheel from './components/FortuneWheel';
import SettingsPanel from './components/SettingsPanel';
import HistoryPanel from './components/HistoryPanel';
import SteamGameSelectionModal from './components/SteamGameSelectionModal';
import WinScreenSteamGameSelectionModal from './components/WinScreenSteamGameSelectionModal';
import { Trophy, RefreshCcw, Coins, Search, Plus, X, Settings as SettingsIcon, History as HistoryIcon, File, Trash2, Link2, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Функция для создания звуков с помощью Web Audio API
const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playSpinSound = (volume: number = 0.5) => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  };

  const playWinSound = (volume: number = 0.5) => {
    const ctx = getAudioContext();
    const frequencies = [440, 554, 659, 880]; // A4, C#5, E5, A5
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      
      gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);
      
      oscillator.start(ctx.currentTime + i * 0.1);
      oscillator.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  };

  return { playSpinSound, playWinSound };
};

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [confirmClearGamesOpen, setConfirmClearGamesOpen] = useState(false);
  const [steamSearchResults, setSteamSearchResults] = useState<SteamSearchResult[]>([]);
  const [showSteamSearchResultsModal, setShowSteamSearchResultsModal] = useState(false);
  const [gameNameToMap, setGameNameToMap] = useState<string>('');
  const [showWinScreenMappingModal, setShowWinScreenMappingModal] = useState(false);
  const [gameToMapOnWinScreen, setGameToMapOnWinScreen] = useState<Game | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [dbError, setDbError] = useState<string | null>(null);
  const [preloading, setPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; appId: string; color: string; image: string; }>({ name: '', appId: '', color: '#ffffff', image: '' });
  // State for mapping suggestions
  const [mappingSuggestions, setMappingSuggestions] = useState<{ [gameId: string]: MappingSuggestion[] }>({});
  const [showMappingSuggestionsFor, setShowMappingSuggestionsFor] = useState<string | null>(null);

  const clearAll = () => {
    setSettings(DEFAULT_SETTINGS);
    setGames([]);
    setHistory([]);
    localStorage.removeItem('fortuneWheelSettings');
    localStorage.removeItem('fortuneWheelGames');
    localStorage.removeItem('fortuneWheelHistory');
    // Don't clear shareDB so saved share links still work!
  };

  const handleCopyLink = async () => {
    const url = new URL(window.location.href);

    const state = {
      settings,
      games: games.map(game => ({ name: game.name, appId: game.appId })) // Only save necessary game data
    };
    const encodedState = btoa(encodeURIComponent(JSON.stringify(state)));

    // Try to save to DB
    try {
      const response = await fetch(`${API_URL}/api/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: state }) // Send actual state object, not encoded
      });

      if (response.ok) {
        const { shareId } = await response.json();
        url.searchParams.set('share', shareId);
        url.searchParams.delete('state'); // Remove old state param if exists
      } else {
        throw new Error('Failed to save to API');
      }
    } catch (error) {
      // Fallback to old method
      url.searchParams.set('state', encodedState);
      url.searchParams.delete('share');
    }

    await navigator.clipboard.writeText(url.toString());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handlePreloadPrices = async () => {
    setPreloading(true);
    setPreloadProgress(0);
    console.log('Preloading prices...');
    
    const gamesWithAppId = games.filter(g => g.appId);
    const appIds = gamesWithAppId.map(g => g.appId as string);
    
    if (appIds.length === 0) {
      setPreloading(false);
      return;
    }

    // Format currency symbol
    const currencySymbol = {
      'KZT': '₸',
      'USD': '$',
      'EUR': '€',
      'RUB': '₽'
    }[settings.steam.currency] || '';

    // Preload prices
    const priceResults = await preloadPrices(appIds, settings.steam.region, true); // force true
    const newGames = [...games];
    let processed = 0;

    for (const game of newGames) {
      if (game.appId && priceResults[game.appId]) {
        const priceData = priceResults[game.appId];
        const result: any = {};
        if (priceData.price != null) {
          result.price = `${priceData.price} ${currencySymbol}`.trim();
        }
        if (priceData.discount != null && priceData.discount > 0 && priceData.originalPrice != null) {
          result.discount = `-${priceData.discount}%`;
          result.originalPrice = `${priceData.originalPrice} ${currencySymbol}`.trim();
        }
        game.price = result.price;
        game.discount = result.discount;
        game.originalPrice = result.originalPrice;
      }
      processed++;
      setPreloadProgress(Math.round((processed / newGames.length) * 100));
    }

    setGames(newGames);
    setPreloadProgress(100);
    setPreloading(false);
  };

  // Helper function to fetch mapping suggestions for a game
  const fetchMappingSuggestionsForGame = async (game: Game) => {
    if (game.appId) return; // Already mapped
    const { suggestions } = await getMappingSuggestions(game.name);
    setMappingSuggestions(prev => ({ ...prev, [game.id]: suggestions }));
  };

  // Handle applying a mapping suggestion to game
  const handleApplyMappingSuggestion = async (gameId: string, appId: string) => {
    // Find game
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Save mapping (globally!)
    const success = await saveGameMapping(game.name, appId);
    if (success) {
      // Update game locally
      const updatedGames = games.map(g => g.id === gameId ? { ...g, appId: appId } : g);
      setGames(updatedGames);

      // Fetch price for this game
      if (settings.steam.enableIntegration) {
        setLoadingPrices(true);
        try {
          const priceData = await fetchSteamPrice(appId, settings);
          if (priceData) {
            const finalUpdatedGames = updatedGames.map(g => g.id === gameId ? {
              ...g,
              price: priceData.price,
              discount: priceData.discount,
              originalPrice: priceData.originalPrice
            } : g);
            setGames(finalUpdatedGames);
          }
        } catch (error) {
          console.error('Error fetching price:', error);
        } finally {
          setLoadingPrices(false);
        }
      }

      // Clear suggestions for this game
      setShowMappingSuggestionsFor(null);
      setMappingSuggestions(prev => {
        const newSuggestions = { ...prev };
        delete newSuggestions[gameId];
        return newSuggestions;
      });
    }
  };

  const saveEditedGame = () => {
    // Placeholder for saving edited game logic
    console.log('Saving edited game:', editingGame, editForm);
    if (editingGame) {
      setGames(games.map(g => g.id === editingGame.id ? { ...g, ...editForm } : g));
      setEditingGame(null);
    }
  };

  const handleEditGame = (game: Game) => {
    // Placeholder for handling game edit
    setEditingGame(game);
    setEditForm({ name: game.name, appId: game.appId || '', color: game.color, image: game.image || '' });
  };

  const handleSteamGameSelect = async (selectedAppId: string | undefined) => {
    let priceData: any = undefined;
    if (selectedAppId) {
      await saveGameMapping(gameNameToMap, selectedAppId);
      if (settings.steam.enableIntegration) {
        priceData = await fetchSteamPrice(selectedAppId, settings);
      }
    }
    const newGame: Game = {
      id: Math.random().toString(36).substr(2, 9),
      name: gameNameToMap,
      appId: selectedAppId,
      color: getGameColor(games.length), // Use current length for color calculation
      ...priceData
    };
    setGames([...games, newGame]);
    setNewGameName(''); // Clear new game input
    setSteamSearchResults([]);
    setShowSteamSearchResultsModal(false);
    setGameNameToMap('');
  };

  const handleWinScreenGameSelect = async (selectedAppId: string | undefined, originalGame: Game) => {
    if (selectedAppId) {
      await saveGameMapping(originalGame.name, selectedAppId);
    }

    const updatedGame = { ...originalGame, appId: selectedAppId };
    setGames(prevGames => prevGames.map(g => g.id === originalGame.id ? updatedGame : g));
    setSelectedGame(updatedGame); // Update the selected game on win screen

    // Re-fetch price for the updated game
    if (updatedGame.appId && settings.steam.enableIntegration) {
      setLoadingPrices(true);
      try {
        const data = await fetchSteamPrice(updatedGame.appId, settings);
        if (data) {
          const finalUpdatedGame = { 
            ...updatedGame, 
            price: data.price, 
            discount: data.discount, 
            originalPrice: data.originalPrice 
          };
          setSelectedGame(finalUpdatedGame);
          setGames(prevGames => prevGames.map(g => g.id === originalGame.id ? finalUpdatedGame : g));
        }
      } catch (error) {
        console.error('Error fetching price on win screen after mapping:', error);
      } finally {
        setLoadingPrices(false);
      }
    }

    setShowWinScreenMappingModal(false);
    setGameToMapOnWinScreen(null);
    setSteamSearchResults([]);
  };

  const { playSpinSound, playWinSound } = useAudio();

  const API_URL = import.meta.env.VITE_API_URL;

  // Fetch mapping suggestions for unmapped games when games list changes
  useEffect(() => {
    if (!initialized) return;

    // Fetch suggestions for all unmapped games
    for (const game of games) {
      if (!game.appId && !mappingSuggestions[game.id]) {
        fetchMappingSuggestionsForGame(game);
      }
    }
  }, [games, initialized, mappingSuggestions]);

  // Инициализация при первом запуске
  useEffect(() => {
    if (initialized) return;
    
    const init = async () => {
      let loadedFromShare = false;
      let loadedSettings = DEFAULT_SETTINGS;
      let loadedGames: Game[] = [];
      let loadedHistory: HistoryItem[] = [];

      // 1. Проверка на ссылку с шейрингом FIRST! BEFORE clearing shareDB!
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('share');
      const stateParam = params.get('state');
      
      if (shareId) {
        // First try API
        try {
          const response = await fetch(`${API_URL}/api/shares/${shareId}`);
          if (response.ok) {
            const sharedState = await response.json();
            
            if (sharedState.settings) {
              loadedSettings = { 
                ...DEFAULT_SETTINGS, 
                ...sharedState.settings,
                customization: {
                  ...DEFAULT_SETTINGS.customization,
                  ...sharedState.settings.customization
                },
                wheel: {
                  ...DEFAULT_SETTINGS.wheel,
                  ...sharedState.settings.wheel
                },
                spinButton: {
                  ...DEFAULT_SETTINGS.spinButton,
                  ...sharedState.settings.spinButton
                },
                sound: {
                  ...DEFAULT_SETTINGS.sound,
                  ...sharedState.settings.sound
                },
                titles: {
                  ...DEFAULT_SETTINGS.titles,
                  ...sharedState.settings.titles
                },
                steam: {
                  ...DEFAULT_SETTINGS.steam,
                  ...sharedState.settings.steam
                },
                prices: {
                  ...DEFAULT_SETTINGS.prices,
                  ...sharedState.settings.prices
                }
              };
            }
            if (sharedState.games) {
              loadedGames = sharedState.games;
              loadedFromShare = true;
            }
          } else {
            throw new Error('API share not found');
          }
        } catch (err) {
          setDbStatus('disconnected');
          setDbError('Не удалось загрузить из API. Проверьте подключение.');
          // Fallback to localStorage
          try {
            const shareDB = JSON.parse(localStorage.getItem('shareDB') || '{}');
            const sharedState = shareDB[shareId];
            
            if (sharedState) {
              if (sharedState.settings) {
                loadedSettings = { 
                  ...DEFAULT_SETTINGS, 
                  ...sharedState.settings,
                  customization: {
                    ...DEFAULT_SETTINGS.customization,
                    ...sharedState.settings.customization
                  },
                  wheel: {
                    ...DEFAULT_SETTINGS.wheel,
                    ...sharedState.settings.wheel
                  },
                  spinButton: {
                    ...DEFAULT_SETTINGS.spinButton,
                    ...sharedState.settings.spinButton
                  },
                  sound: {
                    ...DEFAULT_SETTINGS.sound,
                    ...sharedState.settings.sound
                  },
                  titles: {
                    ...DEFAULT_SETTINGS.titles,
                    ...sharedState.settings.titles
                  },
                  steam: {
                    ...DEFAULT_SETTINGS.steam,
                    ...sharedState.settings.steam
                  },
                  prices: {
                    ...DEFAULT_SETTINGS.prices,
                    ...sharedState.settings.prices
                  }
                };
              }
              if (sharedState.games) {
                loadedGames = sharedState.games;
                loadedFromShare = true;
              }
            }
          } catch (err2) {
            console.error('Failed to load from localStorage:', err2);
          }
        }
      } else if (stateParam) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(stateParam)));
          if (decoded.settings) {
            loadedSettings = { 
              ...DEFAULT_SETTINGS, 
              ...decoded.settings,
              customization: {
                ...DEFAULT_SETTINGS.customization,
                ...decoded.settings.customization
              },
              wheel: {
                ...DEFAULT_SETTINGS.wheel,
                ...decoded.settings.wheel
              },
              spinButton: {
                ...DEFAULT_SETTINGS.spinButton,
                ...decoded.settings.spinButton
              },
              sound: {
                ...DEFAULT_SETTINGS.sound,
                ...decoded.settings.sound
              },
              titles: {
                ...DEFAULT_SETTINGS.titles,
                ...decoded.settings.titles
              },
              steam: {
                ...DEFAULT_SETTINGS.steam,
                ...decoded.settings.steam
              },
              prices: {
                ...DEFAULT_SETTINGS.prices,
                ...decoded.settings.prices
              }
            };
          }
          if (decoded.games) {
            loadedGames = decoded.games;
            loadedFromShare = true;
          }
        } catch (err) {
          console.error('Failed to parse shared state:', err);
        }
      }

      // 2. Если не из шейринга, загружаем из localStorage
      if (!loadedFromShare) {
        try {
          const savedSettings = localStorage.getItem('fortuneWheelSettings');
          const savedGames = localStorage.getItem('fortuneWheelGames');
          const savedHistory = localStorage.getItem('fortuneWheelHistory');
          
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            loadedSettings = { 
              ...DEFAULT_SETTINGS, 
              ...parsed,
              customization: {
                ...DEFAULT_SETTINGS.customization,
                ...parsed.customization
              },
              wheel: {
                ...DEFAULT_SETTINGS.wheel,
                ...parsed.wheel
              },
              spinButton: {
                ...DEFAULT_SETTINGS.spinButton,
                ...parsed.spinButton
              },
              sound: {
                ...DEFAULT_SETTINGS.sound,
                ...parsed.sound
              },
              titles: {
                ...DEFAULT_SETTINGS.titles,
                ...parsed.titles
              },
              steam: {
                ...DEFAULT_SETTINGS.steam,
                ...parsed.steam
              },
              prices: {
                ...DEFAULT_SETTINGS.prices,
                ...parsed.prices
              }
            };
          }
          if (savedGames) {
            loadedGames = JSON.parse(savedGames);
          }
          if (savedHistory) {
            loadedHistory = JSON.parse(savedHistory);
          }
        } catch (err) {
          console.error('Failed to load from localStorage:', err);
        }
      }

      // 3. Если ничего не загружено, используем дефолтные игры
      if (loadedGames.length === 0) {
        loadedGames = INITIAL_GAMES.map((name, index) => ({
          id: Math.random().toString(36).substr(2, 9),
          name,
          appId: STEAM_APP_IDS[name],
          color: getGameColor(index)
        }));
      }

      // 4. Try to auto-map games using existing DB mappings (or most popular mappings)
      const mappedGames = await Promise.all(loadedGames.map(async game => {
        if (game.appId) return game; // Already mapped, skip

        // Try to get existing mapping first
        const { existing, suggestions } = await getMappingSuggestions(game.name);
        if (existing) {
          return { ...game, appId: existing };
        }

        // If no existing mapping, try the most used one
        const mostUsed = suggestions.find(s => s.isMostUsed);
        if (mostUsed) {
          return { ...game, appId: mostUsed.appId };
        }

        return game;
      }));

      setSettings(loadedSettings);
      setGames(mappedGames);
      setHistory(loadedHistory);
      setInitialized(true);
      setDbStatus('connected');
      setDbError(null);

      // Preload prices for loaded games
      if (loadedSettings.steam.enableIntegration) {
        const gamesWithAppId = mappedGames.filter(g => g.appId);
        const appIds = gamesWithAppId.map(g => g.appId as string);
        if (appIds.length > 0) {
          setPreloading(true);
          const priceResults = await preloadPrices(appIds, loadedSettings.steam.region, false);
          const currencySymbol = {
            'KZT': '₸',
            'USD': '$',
            'EUR': '€',
            'RUB': '₽'
          }[loadedSettings.steam.currency] || '';

          const updatedGames = mappedGames.map(game => {
            if (game.appId && priceResults[game.appId]) {
              const data = priceResults[game.appId];
              const priceData: any = {};
              if (data.price != null) {
                priceData.price = `${data.price} ${currencySymbol}`.trim();
              }
              if (data.discount != null && data.discount > 0 && data.originalPrice != null) {
                priceData.discount = `-${data.discount}%`;
                priceData.originalPrice = `${data.originalPrice} ${currencySymbol}`.trim();
              }
              return { ...game, ...priceData };
            }
            return game;
          });
          setGames(updatedGames);
          setPreloading(false);
        }
      }
      
      // Очищаем URL от state параметра, чтобы не дублировать при перезагрузке
      if (stateParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    init();
  }, [initialized]);

  // Сохранение настроек в localStorage при изменении
  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem('fortuneWheelSettings', JSON.stringify(settings));
    localStorage.setItem('fortuneWheelGames', JSON.stringify(games));
    localStorage.setItem('fortuneWheelHistory', JSON.stringify(history));

    const checkConnection = async () => {
      if (!API_URL) {
        setDbStatus('disconnected');
        setDbError('API URL не настроен. Проверьте переменную окружения VITE_API_URL.');
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.database === 'connected') {
            setDbStatus('connected');
            setDbError(null);
          } else {
            setDbStatus('disconnected');
            setDbError('Ошибка подключения к базе данных.');
          }
        } else {
          setDbStatus('disconnected');
          setDbError('Ошибка подключения к API.');
        }
      } catch (error) {
        setDbStatus('disconnected');
        setDbError('Не удалось подключиться к API.');
      }
    };

    checkConnection();
  }, [settings, games, history, initialized, API_URL]);

  const handleAddGame = async () => {
    if (!newGameName.trim()) return;

    const gameName = newGameName.trim();
    let appId: string | undefined = undefined;
    let priceData: any = undefined;

    if (settings.steam.enableIntegration) {
      // 1. Try to get mapping from DB
      const dbMapping = await getGameMapping(gameName);
      if (dbMapping) {
        appId = dbMapping.app_id;
        // Fetch price immediately
        priceData = await fetchSteamPrice(appId, settings);
      } else {
        // 2. Search Steam for the game
        const searchResults = await searchSteamGames(gameName);

        if (searchResults.length === 1) {
          appId = searchResults[0].appId;
          // Save this new mapping to DB
          await saveGameMapping(gameName, appId);
          // Fetch price
          priceData = await fetchSteamPrice(appId, settings);
        } else if (searchResults.length > 1) {
          // Show modal for user to choose
          setSteamSearchResults(searchResults);
          setGameNameToMap(gameName);
          setShowSteamSearchResultsModal(true);
          setNewGameName(''); // Clear input while modal is open
          return; // Exit as user needs to interact with modal
        }
      }
    }

    const newGame: Game = {
      id: Math.random().toString(36).substr(2, 9),
      name: gameName,
      appId: appId,
      color: getGameColor(games.length),
      ...priceData
    };
    setGames([...games, newGame]);
    setNewGameName('');
  };

  const handleImportGames = () => {
    const lines = importText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const newGames: Game[] = lines.map((name, index) => ({
      id: Math.random().toString(36).substr(2, 9),
      name,
      appId: STEAM_APP_IDS[name],
      color: getGameColor(games.length + index)
    }));
    setGames([...games, ...newGames]);
    setImportText('');
    setImportOpen(false);
  };

  const handleRemoveGame = (id: string) => {
    setGames(games.filter(g => g.id !== id));
  };

  const handleResult = async (game: Game) => {
    setSelectedGame(game);
    if (settings.sound.enabled) {
      playWinSound(settings.sound.volume);
    }
    
    // Добавляем в историю
    const historyItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      game
    };
    setHistory(h => [...h, historyItem]);
    
    let gameWithAppId = { ...game };

    if (!game.appId && settings.steam.enableIntegration) {
      // Try to find mapping if appId is missing
      const dbMapping = await getGameMapping(game.name);
      if (dbMapping) {
        gameWithAppId = { ...game, appId: dbMapping.app_id };
      } else {
        const searchResults = await searchSteamGames(game.name);
        if (searchResults.length === 1) {
          gameWithAppId = { ...game, appId: searchResults[0].appId };
          await saveGameMapping(game.name, searchResults[0].appId);
        } else if (searchResults.length > 1) {
          setGameToMapOnWinScreen(game);
          setSteamSearchResults(searchResults);
          setShowWinScreenMappingModal(true);
          // Don't proceed with price fetching yet, wait for user selection
          return; 
        }
      }
    }

    if (gameWithAppId.appId && !gameWithAppId.price && settings.steam.enableIntegration) {
      setLoadingPrices(true);
      try {
        const data = await fetchSteamPrice(gameWithAppId.appId as string, settings);
        if (data) {
          const updatedGame = { 
            ...gameWithAppId, 
            price: data.price, 
            discount: data.discount, 
            originalPrice: data.originalPrice 
          };
          setSelectedGame(updatedGame);
          setGames(games.map(g => g.id === game.id ? updatedGame : g));
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      } finally {
        setLoadingPrices(false);
      }
    }
  };

  const handleSpinStart = () => {
    if (settings.sound.enabled) {
      playSpinSound(settings.sound.volume);
    }
    setSelectedGame(null);
  };

  return (
    <div 
      className="h-screen text-slate-100 font-sans p-4 md:p-8 transition-all duration-300 overflow-auto"
      style={{
        backgroundImage: settings.customization.backgroundImage 
          ? `url(${settings.customization.backgroundImage})` 
          : 'linear-gradient(135deg, #0f172a, #1e293b)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-8 relative px-4 order-1 lg:order-2">
          <div className="text-center space-y-4">
            <h1 className="text-2xl md:text-5xl lg:text-7xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
              {settings.titles.main}
            </h1>
            <p className="text-slate-200 font-medium text-sm md:text-xl">{settings.titles.subtitle}</p>
          </div>

          <div className="relative">
            <FortuneWheel 
              games={games} 
              onResult={handleResult} 
              isSpinning={isSpinning} 
              setIsSpinning={setIsSpinning}
              settings={settings}
              onSpinStart={handleSpinStart}
              isWinPopupOpen={selectedGame !== null}
            />
          </div>

          {/* Модалка с результатом по центру колеса */}
          <AnimatePresence>
            {selectedGame && !isSpinning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 15 }}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
              >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedGame(null)} />
                <div className="relative bg-slate-900/95 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm sm:max-w-md">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => setSelectedGame(null)} className="text-white/60 hover:text-white transition-colors p-2">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                    <div className="bg-yellow-400 p-4 rounded-full shadow-lg animate-bounce">
                      <Trophy className="text-slate-900" size={40} />
                    </div>
                    
                    <div>
                      <h3 className="text-white/70 uppercase tracking-widest text-xs font-bold mb-1">Выпавшая игра</h3>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">{selectedGame.name}</h2>
                    </div>

                    {(settings.prices.showPrices || settings.prices.showDiscounts) && (
                      <div className="w-full bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 mt-4">
                        {loadingPrices ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <RefreshCcw className="animate-spin text-indigo-300" size={24} />
                            <span className="text-lg font-medium">Загрузка...</span>
                          </div>
                        ) : selectedGame.price ? (
                          <>
                            <div className="flex items-center justify-center gap-2 text-indigo-200 mb-1">
                              <Coins size={20} />
                              <span className="text-sm font-semibold uppercase tracking-wider">Цена</span>
                            </div>
                            <div className="flex items-center justify-center gap-4 flex-wrap">
                              {selectedGame.originalPrice && settings.prices.showDiscounts && (
                                <span className="text-lg text-slate-400 line-through">{selectedGame.originalPrice}</span>
                              )}
                              <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{selectedGame.price}</span>
                              {selectedGame.discount && settings.prices.showDiscounts && (
                                <span className="text-lg font-bold text-yellow-300 bg-yellow-500/30 px-3 py-1 rounded">{selectedGame.discount}</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-indigo-200/60 py-2 italic">
                            {selectedGame.appId ? 'Цена не найдена' : 'Не в Steam'}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedGame.appId && settings.steam.enableIntegration && (
                      <a
                        href={`https://store.steampowered.com/app/${selectedGame.appId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors mt-2 underline underline-offset-4"
                      >
                        Смотреть в Steam
                      </a>
                    )}
                  </div>

                  {/* Декоративный фон */}
                  <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1 space-y-6 bg-slate-800/70 backdrop-blur-md p-6 rounded-2xl border border-slate-700 h-fit order-2 lg:order-1">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Coins className="text-yellow-400" />
                Список игр ({games.length})
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setImportOpen(true)} className="flex-1 min-w-[44px] text-slate-400 hover:text-white p-3 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2" title="Импорт игр">
                <File size={20} />
                <span className="text-sm hidden sm:inline">Импорт</span>
              </button>
              <button onClick={() => setConfirmClearGamesOpen(true)} className="flex-1 min-w-[44px] text-slate-400 hover:text-red-400 p-3 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2" title="Очистить список игр">
                <Trash2 size={20} />
                <span className="text-sm hidden sm:inline">Очистить</span>
              </button>
              <button onClick={handleCopyLink} className="flex-1 min-w-[44px] text-slate-400 hover:text-white p-3 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2" title="Короткая ссылка">
                {linkCopied ? <Check size={20} /> : <Link2 size={20} />}
                <span className="text-sm hidden sm:inline">{linkCopied ? 'Скопировано' : 'Ссылка'}</span>
              </button>
              <button onClick={() => setHistoryOpen(true)} className="flex-1 min-w-[44px] text-slate-400 hover:text-white p-3 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2" title="История">
                <HistoryIcon size={20} />
                <span className="text-sm hidden sm:inline">История</span>
              </button>
              <button onClick={() => setSettingsOpen(true)} className="flex-1 min-w-[44px] text-slate-400 hover:text-white p-3 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2" title="Настройки">
                <SettingsIcon size={20} />
                <span className="text-sm hidden sm:inline">Настройки</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGame()}
                placeholder="Добавить игру..."
                className="w-full bg-slate-700 border-none rounded-lg py-2 pl-3 pr-10 focus:ring-2 focus:ring-indigo-500 text-slate-100"
              />
              <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
            </div>
            <button
              onClick={handleAddGame}
              className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg transition-colors"
            >
              <Plus size={24} />
            </button>
          </div>



          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {games.map((game) => (
              <div 
                key={game.id}
                className="flex flex-col bg-slate-700/50 p-3 rounded-lg border border-slate-600"
              >
                {editingGame?.id === game.id ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-slate-400 text-xs">Название</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-400 text-xs">Steam App ID</label>
                      <input 
                        type="text" 
                        value={editForm.appId} 
                        onChange={(e) => setEditForm({ ...editForm, appId: e.target.value })} 
                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-400 text-xs">Цвет</label>
                      <input 
                        type="color" 
                        value={editForm.color} 
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} 
                        className="w-full h-10 rounded" 
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEditedGame} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded text-base font-medium">Сохранить</button>
                      <button onClick={() => setEditingGame(null)} className="px-6 bg-slate-600 hover:bg-slate-500 text-white py-3 rounded text-base font-medium">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: game.color }} />
                        <div className="overflow-hidden">
                          <span className="truncate text-sm font-medium block">{game.name}</span>
                          {settings.prices.showPrices && game.price && (
                            <span className="text-xs text-green-400 block">{game.price}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!game.appId && mappingSuggestions[game.id] && mappingSuggestions[game.id].length > 0 && (
                          <button
                            onClick={() => setShowMappingSuggestionsFor(game.id)}
                            className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2 py-1 bg-indigo-900/30 rounded transition-all"
                          >
                            Подобрать
                          </button>
                        )}
                        <button
                          onClick={() => handleEditGame(game)}
                          className="text-slate-400 hover:text-indigo-400 p-2 rounded-lg hover:bg-slate-700 transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveGame(game.id)}
                          className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-700 transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                    {showMappingSuggestionsFor === game.id && (
                      <div className="mt-2 space-y-2 bg-slate-800/70 p-3 rounded-lg">
                        <h4 className="text-xs font-bold text-slate-300 mb-2">Выберите игру:</h4>
                        {mappingSuggestions[game.id].map((suggestion) => (
                          <button
                            key={suggestion.appId}
                            onClick={() => handleApplyMappingSuggestion(game.id, suggestion.appId)}
                            className="w-full flex items-center gap-2 p-3 rounded bg-slate-700 hover:bg-slate-600 transition-all text-left"
                          >
                            {suggestion.icon && (
                              <img src={suggestion.icon} alt="" className="w-10 h-10 rounded flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <span className="text-sm font-medium text-white">{suggestion.name}</span>
                              <div className="flex gap-1 mt-1">
                                {suggestion.isExisting && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">Текущий</span>
                                )}
                                {suggestion.isMostUsed && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">Популярный</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => setShowMappingSuggestionsFor(null)}
                          className="mt-2 text-sm text-slate-400 hover:text-white"
                        >
                          Отмена
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <SettingsPanel
        games={games}
        setGames={setGames}
        settings={settings}
        setSettings={setSettings}
        isOpen={settingsOpen}
        setIsOpen={setSettingsOpen}
        clearAll={clearAll}
        dbStatus={dbStatus}
        dbError={dbError}
        preloading={preloading}
        preloadProgress={preloadProgress}
        handlePreloadPrices={handlePreloadPrices}
        editingGame={editingGame}
        setEditingGame={setEditingGame}
        editForm={editForm}
        setEditForm={setEditForm}
        saveEditedGame={saveEditedGame}
        handleEditGame={handleEditGame}
      />

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onClearHistory={() => setHistory([])}
      />

      <SteamGameSelectionModal
        isOpen={showSteamSearchResultsModal}
        onClose={() => setShowSteamSearchResultsModal(false)}
        gameName={gameNameToMap}
        searchResults={steamSearchResults}
        onSelect={handleSteamGameSelect}
      />

      <WinScreenSteamGameSelectionModal
        isOpen={showWinScreenMappingModal}
        onClose={() => setShowWinScreenMappingModal(false)}
        game={gameToMapOnWinScreen}
        searchResults={steamSearchResults}
        onSelect={handleWinScreenGameSelect}
      />

      {/* Импорт игр модалка */}
      <AnimatePresence>
        {importOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setImportOpen(false)}
          >
            <div 
              className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Импорт списка игр</h3>
                <button onClick={() => setImportOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <p className="text-slate-400 mb-4">Вставьте список игр, каждая на новой строке:</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-48 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 mb-4"
                placeholder="Counter-Strike 2&#10;Dota 2&#10;Half-Life 3"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleImportGames}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors"
                >
                  Импортировать
                </button>
                <button 
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Подтверждение очистки игр */}
      <AnimatePresence>
        {confirmClearGamesOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmClearGamesOpen(false)}
          >
            <div 
              className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Очистить список игр?</h3>
                <button onClick={() => setConfirmClearGamesOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <p className="text-slate-400 mb-6">Вы уверены, что хотите удалить все {games.length} игр из списка? Это действие нельзя отменить.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setGames([]);
                    setConfirmClearGamesOpen(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg transition-colors font-semibold"
                >
                  Очистить
                </button>
                <button 
                  onClick={() => setConfirmClearGamesOpen(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-white"
                >
                  Отмена
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

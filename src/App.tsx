import { useState, useEffect, useRef } from 'react';
import type { Game, Settings, HistoryItem } from './types';
import { INITIAL_GAMES, STEAM_APP_IDS, getGameColor } from './constants';
import { DEFAULT_SETTINGS } from './types';
import { fetchSteamPrice } from './utils/steam';
import FortuneWheel from './components/FortuneWheel';
import SettingsPanel from './components/SettingsPanel';
import HistoryPanel from './components/HistoryPanel';
import { Trophy, RefreshCcw, Coins, Search, Plus, X, Settings as SettingsIcon, History as HistoryIcon, File, Trash2 } from 'lucide-react';
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
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const clearAll = () => {
    setSettings(DEFAULT_SETTINGS);
    setGames([]);
    setHistory([]);
    localStorage.removeItem('fortuneWheelSettings');
    localStorage.removeItem('fortuneWheelGames');
    localStorage.removeItem('fortuneWheelHistory');
    // Don't clear shareDB so saved share links still work!
    console.log('Cleared settings, games, and history, kept shareDB intact');
  };

  const { playSpinSound, playWinSound } = useAudio();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      
      console.log('URL params - shareId:', shareId, 'stateParam:', stateParam);
      
      if (shareId) {
        // First try API
        try {
          const response = await fetch(`${API_URL}/api/shares/${shareId}`);
          if (response.ok) {
            const sharedState = await response.json();
            console.log('Loaded state from API:', sharedState);
            
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
            console.log('Loaded from API share link');
          } else {
            throw new Error('API share not found');
          }
        } catch (err) {
          console.warn('Failed to load from API, falling back to localStorage:', err);
          // Fallback to localStorage
          try {
            const shareDB = JSON.parse(localStorage.getItem('shareDB') || '{}');
            console.log('ShareDB content:', shareDB);
            const sharedState = shareDB[shareId];
            console.log('Shared state for shareId:', sharedState);
            
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
              console.log('Loaded from localStorage share link');
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
          console.log('Loaded from old share link');
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
          console.log('Loaded from localStorage');
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
        console.log('Loaded default games');
      }

      setSettings(loadedSettings);
      setGames(loadedGames);
      setHistory(loadedHistory);
      setInitialized(true);
      
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
  }, [settings, games, history, initialized]);

  const handleAddGame = () => {
    if (!newGameName.trim()) return;
    const newGame: Game = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGameName.trim(),
      appId: STEAM_APP_IDS[newGameName.trim()],
      color: getGameColor(games.length)
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
    
    if (game.appId && !game.price && settings.steam.enableIntegration) {
      setLoadingPrices(true);
      try {
        const data = await fetchSteamPrice(game.appId, settings);
        if (data) {
          const updatedGame = { 
            ...game, 
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
      className="min-h-screen text-slate-100 font-sans p-4 md:p-8 transition-all duration-300"
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
        
        <div className="lg:col-span-1 space-y-6 bg-slate-800/70 backdrop-blur-md p-6 rounded-2xl border border-slate-700 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Coins className="text-yellow-400" />
              Список игр ({games.length})
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setImportOpen(true)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition" title="Импорт игр">
                <File size={20} />
              </button>
              <button onClick={() => setConfirmClearGamesOpen(true)} className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-700 transition" title="Очистить список игр">
                <Trash2 size={20} />
              </button>
              <button onClick={() => setHistoryOpen(true)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition" title="История">
                <HistoryIcon size={20} />
              </button>
              <button onClick={() => setSettingsOpen(true)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition" title="Настройки">
                <SettingsIcon size={20} />
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
                className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-slate-600 group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: game.color }} />
                  <div className="overflow-hidden">
                    <span className="truncate text-sm font-medium block">{game.name}</span>
                    {settings.prices.showPrices && game.price && (
                      <span className="text-xs text-green-400 block">{game.price}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveGame(game.id)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-8 relative px-4">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
              {settings.titles.main}
            </h1>
            <p className="text-slate-200 font-medium text-base md:text-xl">{settings.titles.subtitle}</p>
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
                initial={{ opacity: 0, scale: 0.5, y: -50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -50 }}
                transition={{ type: 'spring', damping: 15 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
              >
                <div className="bg-slate-900/95 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 max-w-sm w-full mx-4">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => setSelectedGame(null)} className="text-white/60 hover:text-white transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                    <div className="bg-yellow-400 p-3 rounded-full shadow-lg animate-bounce">
                      <Trophy className="text-slate-900" size={32} />
                    </div>
                    
                    <div>
                      <h3 className="text-white/70 uppercase tracking-widest text-xs font-bold mb-1">Выпавшая игра</h3>
                      <h2 className="text-2xl font-black text-white">{selectedGame.name}</h2>
                    </div>

                    {(settings.prices.showPrices || settings.prices.showDiscounts) && (
                      <div className="w-full bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 mt-4">
                        {loadingPrices ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <RefreshCcw className="animate-spin text-indigo-300" size={20} />
                            <span className="text-lg font-medium">Загрузка...</span>
                          </div>
                        ) : selectedGame.price ? (
                          <>
                            <div className="flex items-center justify-center gap-2 text-indigo-200 mb-1">
                              <Coins size={16} />
                              <span className="text-sm font-semibold uppercase tracking-wider">Цена</span>
                            </div>
                            <div className="flex items-center justify-center gap-4 flex-wrap">
                              {selectedGame.originalPrice && settings.prices.showDiscounts && (
                                <span className="text-lg text-slate-400 line-through">{selectedGame.originalPrice}</span>
                              )}
                              <span className="text-3xl font-bold text-white tracking-tight">{selectedGame.price}</span>
                              {selectedGame.discount && settings.prices.showDiscounts && (
                                <span className="text-lg font-bold text-yellow-300 bg-yellow-500/30 px-2 py-1 rounded">{selectedGame.discount}</span>
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
                  <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
      />

      <HistoryPanel
        history={history}
        isOpen={historyOpen}
        setIsOpen={setHistoryOpen}
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

import React, { useState } from 'react';
import type { Game, Settings } from '../types';

import SettingsAppearancePanel from './SettingsAppearancePanel';
import SettingsIntegrationPanel from './SettingsIntegrationPanel';
import SettingsDataPanel from './SettingsDataPanel';
import { Settings as SettingsIcon, Palette, Gamepad2, Tag, Volume2, VolumeX, Zap, Database, RefreshCcw, Edit2 } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  clearAll: () => void;
  // Props for Integration Panel
  dbStatus: 'loading' | 'connected' | 'disconnected';
  dbError: string | null;
  // Props for Data Panel
  games: Game[];
  setGames: React.Dispatch<React.SetStateAction<Game[]>>;
  preloading: boolean;
  preloadProgress: number;
  handlePreloadPrices: () => Promise<void>;
  editingGame: Game | null;
  setEditingGame: React.Dispatch<React.SetStateAction<Game | null>>;
  editForm: { name: string; appId: string; color: string; image: string; };
  setEditForm: React.Dispatch<React.SetStateAction<{ name: string; appId: string; color: string; image: string; }>>;
  saveEditedGame: () => void;
  handleEditGame: (game: Game) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  setIsOpen,
  settings,
  setSettings,
  clearAll,
  dbStatus,
  dbError,
  games,
  preloading,
  preloadProgress,
  handlePreloadPrices,
  editingGame,
  setEditingGame,
  editForm,
  setEditForm,
  saveEditedGame,
  handleEditGame,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'integration' | 'data'>('appearance');







  

  

  





  return (
    <div className={`fixed inset-0 bg-black/60 z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsOpen(false)}>
      <div className="absolute right-0 top-0 h-full w-full md:w-[600px] bg-slate-800 border-l border-slate-700 shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 sticky top-0 bg-slate-800 border-b border-slate-700 z-10 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon size={28} /> Настройки
          </h2>
          <div className="flex gap-2 flex-wrap">

            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-700 flex gap-2">
          {[
            { id: 'appearance', icon: Palette, label: 'Внешний вид' },
            { id: 'integration', icon: Gamepad2, label: 'Интеграции' },
            { id: 'data', icon: Tag, label: 'Данные' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-8">
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Volume2 size={20} /> Звук
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                  <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {settings.sound.enabled ? <Volume2 size={20} className="text-slate-300" /> : <VolumeX size={20} className="text-slate-300" />}
                      <span className="text-slate-300">Включить звук</span>
                    </div>
                    <input type="checkbox" checked={settings.sound.enabled} onChange={(e) => setSettings({ ...settings, sound: { ...settings.sound, enabled: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                  </label>
                  
                  {settings.sound.enabled && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 text-sm">Громкость</label>
                        <span className="text-slate-400 text-sm">{Math.round(settings.sound.volume * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={settings.sound.volume} 
                        onChange={(e) => setSettings({ ...settings, sound: { ...settings.sound, volume: Number(e.target.value) } })}
                        className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Palette size={20} /> Общий вид
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm font-medium">Фон приложения (макс 1MB)</label>
                    <input type="file" accept="image/*" className="hidden" id="bg-upload" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1024 * 1024) { // > 1MB
                          alert('Изображение слишком большое! Максимальный размер 1MB!');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => setSettings({ ...settings, customization: { ...settings.customization, backgroundImage: event.target?.result as string } });
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <div className="flex gap-2">
                      <label htmlFor="bg-upload" className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-center text-slate-300 cursor-pointer hover:bg-slate-600 transition">
                        Загрузить изображение
                      </label>
                      {settings.customization.backgroundImage && <button onClick={() => setSettings({ ...settings, customization: { ...settings.customization, backgroundImage: undefined } })} className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30">Сброс</button>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Zap size={20} /> Колесо
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm">Фон колеса (макс 1MB)</label>
                    <input type="file" accept="image/*" className="hidden" id="wheel-bg-upload" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1024 * 1024) { // > 1MB
                          alert('Изображение слишком большое! Максимальный размер 1MB!');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          // Auto-disable colors and lines when adding an image
                          setSettings({ 
                            ...settings, 
                            customization: { ...settings.customization, wheelImage: event.target?.result as string },
                            wheel: { ...settings.wheel, showColors: false, showSectorLines: false }
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <div className="flex gap-2">
                      <label htmlFor="wheel-bg-upload" className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-center text-slate-300 cursor-pointer hover:bg-slate-600 transition">
                        Загрузить изображение
                      </label>
                      {settings.customization.wheelImage && <button onClick={() => setSettings({ ...settings, customization: { ...settings.customization, wheelImage: undefined } })} className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30">Сброс</button>}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-slate-300 text-sm font-semibold">Настройки фона колеса</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Цвет подложки</label>
                        <input type="color" value={settings.customization.wheelBgColor} onChange={(e) => setSettings({ ...settings, customization: { ...settings.customization, wheelBgColor: e.target.value } })} className="w-full h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Прозр. подложки</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05" 
                          value={settings.customization.wheelBgOpacity} 
                          onChange={(e) => setSettings({ ...settings, customization: { ...settings.customization, wheelBgOpacity: Number(e.target.value) } })} 
                          className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-slate-400 text-xs text-center">{Math.round(settings.customization.wheelBgOpacity * 100)}%</div>
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Прозр. изображения</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05" 
                          value={settings.customization.wheelImageOpacity} 
                          onChange={(e) => setSettings({ ...settings, customization: { ...settings.customization, wheelImageOpacity: Number(e.target.value) } })} 
                          className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-slate-400 text-xs text-center">{Math.round(settings.customization.wheelImageOpacity * 100)}%</div>
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Прозр. цветов</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05" 
                          value={settings.customization.colorOpacity} 
                          onChange={(e) => setSettings({ ...settings, customization: { ...settings.customization, colorOpacity: Number(e.target.value) } })} 
                          className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-slate-400 text-xs text-center">{Math.round(settings.customization.colorOpacity * 100)}%</div>
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Прозр. линий</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05" 
                          value={settings.customization.sectorLineOpacity} 
                          onChange={(e) => setSettings({ ...settings, customization: { ...settings.customization, sectorLineOpacity: Number(e.target.value) } })} 
                          className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-slate-400 text-xs text-center">{Math.round(settings.customization.sectorLineOpacity * 100)}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-slate-300 text-sm">Цвет рамки</label>
                      <input type="color" value={settings.customization.wheelBorderColor} onChange={(e) => setSettings({ ...settings, customization: { ...settings.customization, wheelBorderColor: e.target.value } })} className="w-full h-10 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-300 text-sm">Цвет указателя</label>
                      <input type="color" value={settings.customization.pointerColor} onChange={(e) => setSettings({ ...settings, customization: { ...settings.customization, pointerColor: e.target.value } })} className="w-full h-10 rounded-lg" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm">Время прокрутки (сек)</label>
                    <input type="number" min="1" max="20" value={settings.wheel.spinDuration} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, spinDuration: Number(e.target.value) } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm">Расположение названий</label>
                    <select value={settings.wheel.textPosition} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, textPosition: e.target.value as any } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                      <option value="inner">Ближе к центру</option>
                      <option value="middle">Среднее</option>
                      <option value="outer">Ближе к краю</option>
                      <option value="far-outer">Очень близко к краю</option>
                    </select>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-slate-300 text-sm font-semibold">Цвет текста на секторах</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Основной</label>
                        <input type="color" value={settings.wheel.textColor} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, textColor: e.target.value } })} className="w-full h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Обводка</label>
                        <input type="color" value={settings.wheel.textStrokeColor} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, textStrokeColor: e.target.value } })} className="w-full h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-slate-400 text-xs">Толщина обводки</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="3" 
                          step="0.1" 
                          value={settings.wheel.textStrokeWidth} 
                          onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, textStrokeWidth: Number(e.target.value) } })} 
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm h-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-300 text-sm font-semibold">Длина названий</label>
                      <span className="text-slate-400 text-xs">{Math.round(settings.wheel.textTruncationMultiplier * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="20" 
                      step="0.5" 
                      value={settings.wheel.textTruncationMultiplier} 
                      onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, textTruncationMultiplier: Number(e.target.value) } })} 
                      className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>Короче</span>
                      <span>Не обрезать</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-700">
                    <label className="text-slate-300 text-sm font-semibold">Заголовки страницы</label>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={settings.titles.main} 
                        onChange={(e) => setSettings({ ...settings, titles: { ...settings.titles, main: e.target.value } })} 
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                        placeholder="Основной заголовок"
                      />
                      <input 
                        type="text" 
                        value={settings.titles.subtitle} 
                        onChange={(e) => setSettings({ ...settings, titles: { ...settings.titles, subtitle: e.target.value } })} 
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                        placeholder="Подзаголовок"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <button 
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите сбросить все настройки и очистить список игр?')) {
                          clearAll();
                        }
                      }}
                      className="w-full bg-red-600/50 hover:bg-red-600 text-slate-100 py-2 px-4 rounded-lg transition-colors"
                    >
                      Сбросить всё и очистить список
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300 text-sm">Показывать названия</span>
                      <input type="checkbox" checked={settings.wheel.showGameNames} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, showGameNames: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300 text-sm">Показывать изображения</span>
                      <input type="checkbox" checked={settings.wheel.showImages} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, showImages: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300 text-sm">Показывать цвета</span>
                      <input type="checkbox" checked={settings.wheel.showColors} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, showColors: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300 text-sm">Линии секторов</span>
                      <input type="checkbox" checked={settings.wheel.showSectorLines} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, showSectorLines: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg col-span-2">
                      <span className="text-slate-300 text-sm">Idle спин</span>
                      <input type="checkbox" checked={settings.wheel.idleSpin} onChange={(e) => setSettings({ ...settings, wheel: { ...settings.wheel, idleSpin: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <SettingsIcon size={20} /> Кнопка Spin
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm">Текст</label>
                    <input type="text" value={settings.spinButton.text} onChange={(e) => setSettings({ ...settings, spinButton: { ...settings.spinButton, text: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-slate-300 text-sm">Фон кнопки</label>
                      <input type="color" value={settings.spinButton.backgroundColor} onChange={(e) => setSettings({ ...settings, spinButton: { ...settings.spinButton, backgroundColor: e.target.value } })} className="w-full h-10 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-300 text-sm">Цвет текста</label>
                      <input type="color" value={settings.spinButton.textColor} onChange={(e) => setSettings({ ...settings, spinButton: { ...settings.spinButton, textColor: e.target.value } })} className="w-full h-10 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integration' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Database size={20} /> База данных
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database size={20} className="text-slate-300" />
                      <span className="text-slate-300">Статус подключения</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dbStatus === 'loading' && (
                        <span className="text-yellow-400 text-sm">Загрузка...</span>
                      )}
                      {dbStatus === 'connected' && (
                        <span className="text-green-400 text-sm flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          Всё подключено!
                        </span>
                      )}
                      {dbStatus === 'disconnected' && (
                        <span className="text-red-400 text-sm flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          Отключено
                        </span>
                      )}
                    </div>
                  </div>
                  {dbError && (
                    <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm break-all">
                      {dbError}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Gamepad2 size={20} /> Steam
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                  <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-300">Включить интеграцию</span>
                    <input type="checkbox" checked={settings.steam.enableIntegration} onChange={(e) => setSettings({ ...settings, steam: { ...settings.steam, enableIntegration: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                  </label>
                  
                  {settings.steam.enableIntegration && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-slate-300 text-sm">Регион</label>
                        <select value={settings.steam.region} onChange={(e) => setSettings({ ...settings, steam: { ...settings.steam, region: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                          <option value="kz">🇰🇿 Казахстан</option>
                          <option value="ru">🇷🇺 Россия</option>
                          <option value="us">🇺🇸 США</option>
                          <option value="eu">🇪🇺 Европа</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-slate-300 text-sm">Валюта</label>
                        <select value={settings.steam.currency} onChange={(e) => setSettings({ ...settings, steam: { ...settings.steam, currency: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                          <option value="KZT">Тенге</option>
                          <option value="RUB">Рубли</option>
                          <option value="USD">Доллары</option>
                          <option value="EUR">Евро</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Tag size={20} /> Цены и скидки
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300">Показывать цены</span>
                      <input type="checkbox" checked={settings.prices.showPrices} onChange={(e) => setSettings({ ...settings, prices: { ...settings.prices, showPrices: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300">Показывать скидки</span>
                      <input type="checkbox" checked={settings.prices.showDiscounts} onChange={(e) => setSettings({ ...settings, prices: { ...settings.prices, showDiscounts: e.target.checked } })} className="w-5 h-5 accent-indigo-500" />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <button onClick={handlePreloadPrices} disabled={preloading} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
                      {preloading ? (
                        <>
                          <RefreshCcw className="animate-spin" size={20} /> Загрузка... {preloadProgress}%
                        </>
                      ) : (
                        <>
                          <RefreshCcw size={20} /> Загрузить все цены
                        </>
                      )}
                    </button>
                    {preloading && <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-green-500 h-full" style={{ width: `${preloadProgress}%` }}></div></div>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Edit2 size={20} /> Редактирование игр
                </h3>
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-3">
                  {editingGame && (
                    <div className="bg-slate-800 rounded-lg p-4 space-y-3 border border-indigo-500/30">
                      <h4 className="text-indigo-300 font-medium">Редактирование: {editingGame.name}</h4>
                      <div className="space-y-2">
                        <label className="text-slate-400 text-xs">Название</label>
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-slate-400 text-xs">Steam App ID</label>
                        <input type="text" value={editForm.appId} onChange={(e) => setEditForm({ ...editForm, appId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-slate-400 text-xs">Цвет</label>
                        <input type="color" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} className="w-full h-8 rounded" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-slate-400 text-xs">Изображение (макс 1MB)</label>
                        <input type="file" accept="image/*" className="hidden" id="game-image-upload" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) { // > 1MB
                              alert('Изображение слишком большое! Максимальный размер 1MB!');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => setEditForm({ ...editForm, image: event.target?.result as string });
                            reader.readAsDataURL(file);
                          }
                        }} />
                        <div className="flex gap-2">
                          <label htmlFor="game-image-upload" className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-center text-slate-300 text-sm cursor-pointer hover:bg-slate-600 transition">
                            Загрузить изображение
                          </label>
                          {editForm.image && <button onClick={() => setEditForm({ ...editForm, image: '' })} className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm">Сброс</button>}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEditedGame} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded">Сохранить</button>
                        <button onClick={() => setEditingGame(null)} className="px-4 bg-slate-600 hover:bg-slate-500 text-white py-2 rounded">Отмена</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {games.map(game => (
                      <div key={game.id} className="flex items-center justify-between bg-slate-700/40 p-3 rounded-lg group">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: game.color }} />
                          <div>
                            <span className="text-slate-200 text-sm font-medium">{game.name}</span>
                            {game.appId && <span className="text-xs text-slate-500 block">ID: {game.appId}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleEditGame(game)} className="p-2 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

import React from 'react';
import type { Settings } from '../types';
import { Volume2, VolumeX, Palette, Zap, Settings as SettingsIcon } from 'lucide-react';

interface SettingsAppearancePanelProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  clearAll: () => void; // Add clearAll to props
}

const SettingsAppearancePanel: React.FC<SettingsAppearancePanelProps> = ({
  settings,
  setSettings,
  clearAll
}) => {
  return (
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
  );
};

export default SettingsAppearancePanel;
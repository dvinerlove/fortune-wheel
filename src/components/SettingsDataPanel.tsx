import React from 'react';
import type { Game, Settings } from '../types';
import { Tag, RefreshCcw, Edit2 } from 'lucide-react';

interface SettingsDataPanelProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
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

const SettingsDataPanel: React.FC<SettingsDataPanelProps> = ({
  settings,
  setSettings,
  games,
  setGames,
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
  return (
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
  );
};

export default SettingsDataPanel;

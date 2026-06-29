import React, { useState } from 'react';
import type { Game, Settings } from '../types';

import SettingsAppearancePanel from './SettingsAppearancePanel';
import SettingsIntegrationPanel from './SettingsIntegrationPanel';
import SettingsDataPanel from './SettingsDataPanel';
import { Settings as SettingsIcon, Palette, Gamepad2, Tag } from 'lucide-react';

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

        <div className="p-6">
          {activeTab === 'appearance' && (
            <SettingsAppearancePanel 
              settings={settings} 
              setSettings={setSettings} 
              clearAll={clearAll} 
            />
          )}
          {activeTab === 'integration' && (
            <SettingsIntegrationPanel 
              settings={settings} 
              setSettings={setSettings} 
              dbStatus={dbStatus} 
              dbError={dbError} 
            />
          )}
          {activeTab === 'data' && (
            <SettingsDataPanel 
              settings={settings} 
              setSettings={setSettings} 
              games={games} 
              setGames={setGames} 
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
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

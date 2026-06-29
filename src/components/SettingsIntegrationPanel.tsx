import React from 'react';
import type { Settings } from '../types';
import { Database, Gamepad2 } from 'lucide-react';

interface SettingsIntegrationPanelProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  dbStatus: 'loading' | 'connected' | 'disconnected';
  dbError: string | null;
}

const SettingsIntegrationPanel: React.FC<SettingsIntegrationPanelProps> = ({
  settings,
  setSettings,
  dbStatus,
  dbError,
}) => {
  return (
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
  );
};

export default SettingsIntegrationPanel;

import React from 'react';
import type { SteamSearchResult } from '../utils/steam';
import { X } from 'lucide-react';

interface SteamGameSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  searchResults: SteamSearchResult[];
  onSelect: (appId: string) => void;
}

const SteamGameSelectionModal: React.FC<SteamGameSelectionModalProps> = ({
  isOpen,
  onClose,
  gameName,
  searchResults,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-white mb-4">Выберите игру для "{gameName}"</h2>
        <p className="text-slate-300 mb-4">
          Найдено несколько игр Steam. Выберите ту, которая соответствует вашей игре.
        </p>

        <div className="space-y-3">
          {searchResults.map((result) => (
            <div
              key={result.appId}
              className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition"
              onClick={() => onSelect(result.appId)}
            >
              {result.icon && <img src={`https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${result.appId}/${result.icon}.jpg`} alt={result.name} className="w-10 h-10 rounded-md" />}
              <span className="text-white font-medium">{result.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onSelect(undefined as any)} // User can choose to not select an appId
          className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
        >
          Не привязывать к Steam
        </button>
      </div>
    </div>
  );
};

export default SteamGameSelectionModal;

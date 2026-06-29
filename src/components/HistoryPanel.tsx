import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryItem } from '../types';
import { X, Coins } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, isOpen, setIsOpen }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute right-0 top-0 h-full w-full md:w-[500px] bg-slate-800 border-l border-slate-700 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sticky top-0 bg-slate-800 border-b border-slate-700 z-10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                История
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  История прокрутов пуста
                </div>
              ) : (
                <div className="space-y-3">
                  {history.slice().reverse().map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-700/50 p-4 rounded-xl border border-slate-600">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.game.color }} />
                        <div>
                          <div className="text-slate-200 font-semibold">{item.game.name}</div>
                          {item.game.price && (
                            <div className="flex items-center gap-2 text-sm">
                              <Coins size={14} className="text-green-400" />
                              <span className="text-green-400">{item.game.price}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">{formatTime(item.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HistoryPanel;

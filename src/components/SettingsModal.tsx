import { useState, useEffect } from 'react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'openrouter_api_key';

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (open) {
      setApiKey(localStorage.getItem(STORAGE_KEY) || '');
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, apiKey);
    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1E293B] border border-gray-700/50 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-white font-semibold">Configuración</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">OpenRouter API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500 font-mono"
            />
            <p className="text-gray-500 text-xs mt-1">Obtén tu key gratis en openrouter.ai/keys</p>
          </div>
          <div className="flex justify-between items-center pt-2">
            <button type="button" onClick={handleClear} className="px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
              Limpiar key
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button type="button" onClick={handleSave} className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors">
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

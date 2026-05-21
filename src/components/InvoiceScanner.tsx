import { useRef, useState } from 'react';
import { scanFile } from '../utils/ocr';
import type { ScanResult } from '../utils/ocr';

interface InvoiceScannerProps {
  onScan: (data: ScanResult) => void;
}

export { type ScanResult };

export function InvoiceScanner({ onScan }: InvoiceScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const parsed = await scanFile(file, (p, label) => {
        setProgress(p);
        setProgressLabel(label);
      });
      onScan(parsed);
      showToast('success', 'Factura leída correctamente');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '';
      showToast('error', `Error al leer la factura${errMsg ? ': ' + errMsg : ''}. Completa los campos manualmente.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="relative">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
          loading ? 'border-blue-500/50 bg-blue-500/5' : 'border-gray-600 hover:border-[#3B82F6] hover:bg-[#3B82F6]/5'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={handleChange} className="hidden" />
        {loading ? (
          <div className="py-2 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-[#3B82F6]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-blue-400 text-sm font-medium">{progressLabel || 'Leyendo factura...'}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-[#3B82F6] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-center text-gray-500 text-xs">{Math.round(progress * 100)}%</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 py-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-gray-400 text-xs">Sube foto/PDF</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              OCR
            </span>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

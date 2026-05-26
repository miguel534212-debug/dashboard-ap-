import { useState, useMemo, useRef } from 'react';
import type { Invoice } from '../types/invoice';
import { formatCurrency, statusBadgeClass } from '../utils/calculations';
import { parseExcel, computeImportActions } from '../utils/excelImport';
import type { ImportAction } from '../utils/excelImport';

interface ExcelImportModalProps {
  open: boolean;
  invoices: Invoice[];
  onClose: () => void;
  onApply: (actions: ImportAction[], selectedActions: Set<number>) => void;
}

export function ExcelImportModal({ open, invoices, onClose, onApply }: ExcelImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawRows, setRawRows] = useState<ImportAction[] | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Solo se aceptan archivos .xlsx o .xls');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await parseExcel(file);
      if (rows.length === 0) {
        setError('El archivo no contiene datos válidos');
        setLoading(false);
        return;
      }
      const actions = computeImportActions(rows, invoices);
      setRawRows(actions);
      setSelectedActions(new Set(actions.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer el archivo');
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleAction = (idx: number) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const stats = useMemo(() => {
    if (!rawRows) return null;
    const creates = rawRows.filter(a => a.type === 'create').length;
    const updates = rawRows.filter(a => a.type === 'update').length;
    const skips = rawRows.filter(a => a.type === 'skip').length;
    const selected = rawRows.filter((_, i) => selectedActions.has(i));
    const selectedCreates = selected.filter(a => a.type === 'create').length;
    const selectedUpdates = selected.filter(a => a.type === 'update').length;
    return { creates, updates, skips, total: rawRows.length, selectedCreates, selectedUpdates, selected: selected.length };
  }, [rawRows, selectedActions]);

  const handleApply = () => {
    if (!rawRows) return;
    onApply(rawRows, selectedActions);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1E293B] border border-gray-700/50 rounded-xl w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700/50 shrink-0">
          <h2 className="text-white font-semibold">Importar Excel (CargoWise)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {!rawRows && (
          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 hover:border-[#3B82F6] rounded-xl p-12 text-center cursor-pointer transition-colors"
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleChange} className="hidden" />
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-[#3B82F6]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-gray-400 text-sm">Leyendo archivo...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-12 h-12 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm">Arrastra un Excel de CargoWise o haz clic para seleccionar</p>
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
            )}
          </div>
        )}

        {rawRows && stats && (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="px-5 py-3 border-b border-gray-700/50 flex items-center gap-4 text-sm shrink-0">
              <span className="text-gray-400">{stats.total} filas</span>
              {stats.creates > 0 && <span className="text-blue-400">{stats.creates} nuevas</span>}
              {stats.updates > 0 && <span className="text-yellow-400">{stats.updates} actualizadas</span>}
              {stats.skips > 0 && <span className="text-gray-600">{stats.skips} sin cambios</span>}
              <span className="text-gray-500 ml-auto">
                <button onClick={() => setSelectedActions(new Set(rawRows.map((_, i) => i)))} className="text-[#3B82F6] hover:underline mr-3">Seleccionar todo</button>
                <button onClick={() => setSelectedActions(new Set())} className="text-gray-400 hover:text-white">Deseleccionar todo</button>
              </span>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
              {rawRows.map((action, i) => {
                const checked = selectedActions.has(i);
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      checked ? 'border-[#3B82F6]/40 bg-[#3B82F6]/5' : 'border-gray-700/50 hover:border-gray-600'
                    }`}
                    onClick={() => toggleAction(i)}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleAction(i)} className="shrink-0 accent-[#3B82F6]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{action.row.invoiceNumber}</span>
                        {action.row.vendor && <span className="text-gray-400 text-xs">— {action.row.vendor}</span>}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusBadgeClass(action.row.status)}`}>
                          {action.row.status}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          action.type === 'create' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          action.type === 'update' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                        }`}>
                          {action.type === 'create' ? 'Nueva' : action.type === 'update' ? 'Actualizar' : 'Sin cambios'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>{formatCurrency(action.row.amount, action.row.currency)}</span>
                        {action.row.issueDate && <span>Emisión: {action.row.issueDate}</span>}
                        {action.row.dueDate && <span>Vence: {action.row.dueDate}</span>}
                      </div>
                      {action.type === 'update' && action.changes && (
                        <div className="mt-1 text-xs text-yellow-500">
                          Cambios: {Object.entries(action.changes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700/50 shrink-0">
              <span className="text-gray-500 text-sm">
                {stats.selected} seleccionadas ({stats.selectedCreates} nuevas, {stats.selectedUpdates} actualizadas)
              </span>
              <div className="flex gap-3">
                <button onClick={() => { setRawRows(null); setSelectedActions(new Set()); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  disabled={stats.selected === 0}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Aplicar {stats.selected} importación{stats.selected !== 1 ? 'es' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

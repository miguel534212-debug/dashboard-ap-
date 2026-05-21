import { useState, useMemo, useRef, useEffect } from 'react';
import type { Invoice, Status } from '../types/invoice';
import { formatCurrency, statusBadgeClass } from '../utils/calculations';

interface InvoiceDetailPanelProps {
  invoice: Invoice | null;
  onClose: () => void;
  onAddActivity: (id: string, entry: {
    status?: Status;
    updatedBy: string;
    note: string;
    disputeReason?: string | null;
  }) => void;
  onReuploadPdf: (id: string) => void;
}

const allStatuses: Status[] = ['Pendiente', 'Aprobada', 'Pagada', 'Vencida', 'En Disputa', 'Esperando Soporte'];

function base64ToBlobUrl(base64: string): string {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export function InvoiceDetailPanel({ invoice, onClose, onAddActivity, onReuploadPdf }: InvoiceDetailPanelProps) {
  const [newStatus, setNewStatus] = useState<Status>(invoice?.status || 'Pendiente');
  const [updatedBy, setUpdatedBy] = useState('');
  const [disputeNote, setDisputeNote] = useState('');
  const [noteText, setNoteText] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoice) {
      setNewStatus(invoice.status);
      setDisputeNote('');
      setNoteText('');
      setPdfUrl(null);
    }
  }, [invoice?.id]);

  useEffect(() => {
    if (!invoice?.pdfAttachment) return;
    try {
      const url = base64ToBlobUrl(invoice.pdfAttachment);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch {
      setPdfUrl(null);
    }
  }, [invoice?.pdfAttachment]);

  useEffect(() => {
    if (invoice && panelRef.current) {
      panelRef.current.focus();
    }
  }, [invoice]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const needsDisputeReason = newStatus === 'En Disputa' || newStatus === 'Esperando Soporte';

  const handleStatusChange = () => {
    if (!invoice) return;
    if (!updatedBy.trim()) {
      showToast('error', 'Escribe quién realiza el cambio');
      return;
    }
    if (needsDisputeReason && !disputeNote.trim()) {
      showToast('error', 'Escribe el motivo de la disputa');
      return;
    }
    onAddActivity(invoice.id, {
      status: newStatus,
      updatedBy: updatedBy.trim(),
      note: disputeNote.trim() || `Estado cambiado a ${newStatus}`,
      disputeReason: needsDisputeReason ? disputeNote.trim() : null,
    });
    showToast('success', `Estado cambiado a "${newStatus}"`);
    setDisputeNote('');
    setUpdatedBy('');
  };

  const handleAddNote = () => {
    if (!invoice || !noteText.trim()) return;
    if (!updatedBy.trim()) {
      showToast('error', 'Escribe quién agrega la nota');
      return;
    }
    onAddActivity(invoice.id, {
      updatedBy: updatedBy.trim(),
      note: noteText.trim(),
    });
    showToast('success', 'Nota agregada');
    setNoteText('');
  };

  const timeline = useMemo(() => {
    if (!invoice) return [];
    const entries = [...(invoice.statusHistory || [])]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  }, [invoice?.statusHistory]);

  const entryDotColor = (status: Status) => {
    if (status === 'Pagada') return 'bg-emerald-400';
    if (status === 'En Disputa') return 'bg-orange-400';
    if (status === 'Esperando Soporte') return 'bg-purple-400';
    if (status === 'Vencida') return 'bg-red-400';
    return 'bg-gray-400';
  };

  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-[420px] max-w-full bg-[#1E293B] border-l border-gray-700/50 h-full overflow-y-auto shadow-2xl animate-slide-in"
      >
        <div className="sticky top-0 z-10 bg-[#1E293B] border-b border-gray-700/50 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Detalle de Factura</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-3">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusBadgeClass(invoice.status)}`}>
              {invoice.status}
            </span>
            <div>
              <div className="text-white font-medium text-lg">{invoice.vendor}</div>
              <div className="text-gray-400 text-sm">{invoice.invoiceNumber}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Emisión</span>
                <div className="text-gray-200">{invoice.issueDate}</div>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Vencimiento</span>
                <div className="text-gray-200">{invoice.dueDate || '—'}</div>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Valor</span>
                <div className="text-white font-mono font-medium">{formatCurrency(invoice.amount, invoice.currency)}</div>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Categoría</span>
                <div className="text-gray-200">{invoice.category}</div>
              </div>
            </div>
            {invoice.paidDate && (
              <div className="text-xs text-gray-500">Pagado el: {invoice.paidDate}</div>
            )}
          </div>

          <div className="border-t border-gray-700/50 pt-4 space-y-3">
            <h3 className="text-white text-sm font-semibold">Cambiar Estado</h3>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as Status)}
              className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
            >
              {allStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text" value={updatedBy} onChange={e => setUpdatedBy(e.target.value)}
              placeholder="Actualizado por..."
              className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500"
            />
            {needsDisputeReason && (
              <textarea
                value={disputeNote} onChange={e => setDisputeNote(e.target.value)}
                placeholder="Motivo de la disputa..."
                rows={2}
                className="w-full bg-[#0F172A] border border-orange-500/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-500 resize-none"
              />
            )}
            <button
              onClick={handleStatusChange}
              className="w-full px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Guardar cambio de estado
            </button>
          </div>

          <div className="border-t border-gray-700/50 pt-4 space-y-3">
            <h3 className="text-white text-sm font-semibold">Línea de Tiempo</h3>

            <div className="space-y-0 max-h-64 overflow-y-auto">
              {timeline.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-xs">No hay actividad registrada</div>
              )}
              {timeline.map((entry, i) => {
                const isLast = i === timeline.length - 1;
                const color = entryDotColor(entry.status);
                return (
                  <div key={i} className="relative flex gap-3 pb-4">
                    {!isLast && (
                      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-gray-700/50" />
                    )}
                    <div className={`shrink-0 w-[15px] h-[15px] rounded-full ${color} ring-2 ring-[#1E293B] z-10 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium ${entry.status === 'Pagada' ? 'text-emerald-400' : entry.status === 'En Disputa' ? 'text-orange-400' : entry.status === 'Esperando Soporte' ? 'text-purple-400' : entry.status === 'Vencida' ? 'text-red-400' : 'text-gray-300'}`}>
                          {entry.status}
                        </span>
                        {entry.updatedBy && (
                          <span className="text-xs text-gray-500">por {entry.updatedBy}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleString('es-CO', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                      {entry.note && (
                        <div className="text-xs text-gray-300 mt-0.5">{entry.note}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-700/30">
              <input
                type="text" value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Agregar nota..."
                className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500"
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                className="w-full px-4 py-2 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
              >
                Agregar nota
              </button>
            </div>
          </div>

          <div className="border-t border-gray-700/50 pt-4 space-y-3">
            <h3 className="text-white text-sm font-semibold">PDF Adjunto</h3>
            {invoice.pdfAttachment && pdfUrl ? (
              <div className="flex items-center justify-between bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-300 truncate">{invoice.pdfName || 'PDF'}</span>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <a
                    href={pdfUrl}
                    target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors"
                  >Ver PDF</a>
                  <button
                    onClick={() => onReuploadPdf(invoice.id)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >Re-subir</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 text-xs mb-2">No hay PDF adjunto</p>
                <button
                  onClick={() => onReuploadPdf(invoice.id)}
                  className="px-4 py-2 border border-dashed border-gray-600 hover:border-[#3B82F6] text-gray-400 hover:text-[#3B82F6] text-sm rounded-lg transition-colors w-full"
                >Adjuntar PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-[440px] z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

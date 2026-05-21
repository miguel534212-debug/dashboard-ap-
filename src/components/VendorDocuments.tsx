import { useRef, useState, useMemo, useEffect } from 'react';
import { scanFile } from '../utils/ocr';
import type { VendorDocument } from '../types/invoice';

interface VendorDocumentsProps {
  documents: VendorDocument[];
  onAdd: (doc: Omit<VendorDocument, 'id' | 'uploadDate'>) => void;
  onDelete: (id: string) => void;
}

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

export function VendorDocuments({ documents, onAdd, onDelete }: VendorDocumentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [search, setSearch] = useState('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

  const [ocrResult, setOcrResult] = useState<{
    vendor: string;
    rawText: string;
    pdfAttachment: string;
    pdfName: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, VendorDocument[]>();
    for (const doc of documents) {
      const list = map.get(doc.vendor) || [];
      list.push(doc);
      map.set(doc.vendor, list);
    }
    return Array.from(map.entries())
      .map(([vendor, docs]) => ({ vendor, docs: docs.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)) }))
      .sort((a, b) => a.vendor.localeCompare(b.vendor));
  }, [documents]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    return grouped.filter(g => g.vendor.toLowerCase().includes(q));
  }, [grouped, search]);

  const toggleVendor = (vendor: string) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendor)) next.delete(vendor);
      else next.add(vendor);
      return next;
    });
  };

  const openPdf = (base64: string | undefined) => {
    if (!base64) return;
    const key = base64.slice(0, 40);
    const cached = blobUrls.get(key);
    if (cached) {
      window.open(cached, '_blank');
      return;
    }
    const url = base64ToBlobUrl(base64);
    setBlobUrls(prev => new Map(prev).set(key, url));
    window.open(url, '_blank');
  };

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      showToast('error', 'Solo se aceptan archivos PDF');
      return;
    }
    setLoading(true);
    try {
      const parsed = await scanFile(file, (p, label) => {
        setProgress(p);
        setProgressLabel(label);
      });
      const reader = new FileReader();
      reader.onload = () => {
        setOcrResult({
          vendor: parsed.vendor?.trim() || '',
          rawText: [parsed.invoiceNumber, parsed.vendor, parsed.issueDate, parsed.dueDate, parsed.rawAmount, parsed.mbl, parsed.container, parsed.workOrder, parsed.shipment].filter(Boolean).join(' | ') || '(texto no reconocido)',
          pdfAttachment: reader.result as string,
          pdfName: file.name,
        });
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '';
      showToast('error', `Error al leer el PDF${errMsg ? ': ' + errMsg : ''}`);
      setLoading(false);
    }
  };

  const confirmOcr = () => {
    if (!ocrResult || !ocrResult.vendor) {
      showToast('error', 'Escribe el nombre del proveedor');
      return;
    }
    onAdd({
      vendor: ocrResult.vendor,
      pdfAttachment: ocrResult.pdfAttachment,
      pdfName: ocrResult.pdfName,
    });
    setExpandedVendors(prev => new Set(prev).add(ocrResult.vendor));
    showToast('success', `PDF guardado bajo "${ocrResult.vendor}"`);
    setOcrResult(null);
  };

  const cancelOcr = () => {
    setOcrResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Documentos por Proveedor</h1>
        <span className="text-gray-400 text-sm">{documents.length} PDF{documents.length !== 1 ? 's' : ''}</span>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !loading && !ocrResult && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          loading ? 'border-blue-500/50 bg-blue-500/5' : ocrResult ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-600 hover:border-[#3B82F6] hover:bg-[#3B82F6]/5'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf" onChange={handleChange} className="hidden" />

        {loading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-[#3B82F6]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-blue-400 text-sm font-medium">{progressLabel || 'Procesando PDF...'}</span>
            </div>
            <div className="w-full max-w-md mx-auto bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-[#3B82F6] rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="text-gray-500 text-xs">{Math.round(progress * 100)}%</p>
          </div>
        ) : ocrResult ? (
          <div className="text-left space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              OCR completado — verifica el proveedor
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-medium mb-1">Proveedor detectado</label>
              <input
                type="text" value={ocrResult.vendor} onChange={e => setOcrResult({ ...ocrResult, vendor: e.target.value })}
                className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500"
                placeholder="Escribe el nombre del proveedor..."
              />
            </div>

            <div>
              <button
                type="button" onClick={() => setOcrResult({ ...ocrResult, rawText: ocrResult.rawText.includes('|') ? ocrResult.rawText.split('|').map(s => s.trim()).join('\n') : ocrResult.rawText })}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
              >
                {ocrResult.rawText.includes('\n') ? 'Ocultar texto extraído' : 'Ver texto extraído'}
              </button>
              {ocrResult.rawText.includes('\n') && (
                <pre className="mt-1 p-2 bg-[#0F172A] border border-gray-700/50 rounded-lg text-gray-400 text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {ocrResult.rawText}
                </pre>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={confirmOcr} className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors">
                Guardar PDF
              </button>
              <button onClick={cancelOcr} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <span className="text-gray-400 text-sm">Arrastra un PDF o haz clic para subir</span>
              <p className="text-gray-600 text-xs mt-0.5">El OCR identificará el proveedor automáticamente</p>
            </div>
          </div>
        )}
      </div>

      {documents.length > 0 && (
        <>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1E293B] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500"
              placeholder="Buscar proveedor..."
            />
          </div>

          <div className="space-y-2">
            {filtered.map(({ vendor, docs }) => {
              const isExpanded = expandedVendors.has(vendor);
              return (
                <div key={vendor} className="bg-[#1E293B] border border-gray-700/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleVendor(vendor)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium text-sm">{vendor}</div>
                        <div className="text-gray-500 text-xs">{docs.length} PDF{docs.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-700/50 divide-y divide-gray-700/30">
                      {docs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <div className="min-w-0">
                              <button
                                onClick={() => openPdf(doc.pdfAttachment)}
                                className="text-sm text-[#3B82F6] hover:underline truncate block text-left"
                              >{doc.pdfName}</button>
                              <div className="text-xs text-gray-500">Subido: {doc.uploadDate}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => onDelete(doc.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 ml-3"
                            title="Eliminar PDF"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && search && (
              <div className="text-center py-10 text-gray-500 text-sm">No se encontraron proveedores para "{search}"</div>
            )}
          </div>
        </>
      )}

      {documents.length === 0 && !loading && !ocrResult && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-sm">No hay documentos aún. Arrastra un PDF para comenzar.</p>
        </div>
      )}

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

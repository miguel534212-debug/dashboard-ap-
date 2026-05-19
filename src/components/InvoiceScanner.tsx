import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

export interface ScanResult {
  invoiceNumber: string | null;
  vendor: string | null;
  issueDate: string | null;
  dueDate: string | null;
  amount: number | null;
  currency: string | null;
}

interface InvoiceScannerProps {
  onScan: (data: ScanResult) => void;
}

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

  function parseInvoiceText(text: string): ScanResult {
    const lines = text.split('\n').filter(l => l.trim());
    const upper = text.toUpperCase();

    const result: ScanResult = {
      invoiceNumber: null,
      vendor: null,
      issueDate: null,
      dueDate: null,
      amount: null,
      currency: null,
    };

    const invPatterns = [
      /(?:factura|invoice|n°|nro|numero|no\.|número|número de factura|factura n°|factura no\.)\s*:?\s*([\w\-\/\.]{3,30})/i,
      /\b(\d{2,3}[-\/]\d{3,6}[-\/]\d{2,4})\b/,
    ];
    for (const p of invPatterns) {
      const m = text.match(p);
      if (m) { result.invoiceNumber = m[1].trim(); break; }
    }

    const knownVendors = [
      'MAERSK', 'AVIANCA', 'DIAN', 'SERVIENTREGA', 'DEPÓSITO', 'COPA AIRLINES',
      'DB SCHENKER', 'MSC', 'MEDITERRANEAN', 'SCHENKER', 'DHL', 'FEDEX',
      'UPS', 'TRANSUNIVERSAL', 'TCC', 'LOGISTICA', 'TRANSPORTE',
      'NAVIERA', 'SEABOARD', 'EVERGREEN', 'CMA CGM', 'HAPAG', 'LLOYD',
      'YANMAR', 'PUERTO', 'ADUANAS', 'IMPORT', 'EXPORT', 'CARGA', 'F L T',
      'FLT', 'COLOMBIA', 'BOGOTÁ', 'MEDELLÍN', 'CALI', 'BARRANQUILLA',
      'CARTAGENA', 'BUENAVENTURA',
    ];
    for (const v of knownVendors) {
      if (upper.includes(v)) {
        const line = lines.find(l => l.toUpperCase().includes(v));
        if (line) {
          result.vendor = line.trim();
          break;
        }
      }
    }

    const labelPatterns = [
      /(?:proveedor|vendor|empresa|cliente|razón social|razon social|nombre|nombre del proveedor|contratista|prestador)\s*:?\s*([^\n]{2,80})/i,
      /(?:facturado por|emitido por|expedido por)\s*:?\s*([^\n]{2,80})/i,
      /(?:remitente|consignatario|destinatario|destino)\s*:?\s*([^\n]{2,80})/i,
    ];
    if (!result.vendor) {
      for (const p of labelPatterns) {
        const m = text.match(p);
        if (m) {
          const cleaned = m[1].replace(/\s{2,}/g, ' ').trim();
          if (cleaned.length >= 3) { result.vendor = cleaned; break; }
        }
      }
    }

    if (!result.vendor) {
      const headerCandidates = lines.slice(0, Math.min(5, lines.length));
      for (const line of headerCandidates) {
        const cleaned = line.replace(/[\(\)\[\]\{\}]/g, '').trim();
        if (
          cleaned.length >= 4 &&
          cleaned.length <= 80 &&
          !cleaned.match(/^\d/) &&
          !cleaned.match(/^(factura|invoice|n°|nro|recibo|comprobante|fecha|fecha de emisión|nit|rut|dirección|teléfono|total|subtotal|iva|pagina|página|www|http)/i)
        ) {
          result.vendor = cleaned;
          break;
        }
      }
    }

    if (!result.vendor && lines.length > 0) {
      result.vendor = lines[0].replace(/[\(\)\[\]\{\}]/g, '').trim();
    }

    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
    const dates: { d: number; m: number; y: number; raw: string }[] = [];
    let m;
    while ((m = dateRegex.exec(text)) !== null) {
      let d = parseInt(m[1]), mo = parseInt(m[2]), y = parseInt(m[3]);
      if (y < 100) y += 2000;
      if (d > 31) { [d, mo] = [mo, d]; }
      dates.push({ d, m: mo, y, raw: m[0] });
    }

    if (upper.includes('VENCE') || upper.includes('VENCIMIENTO') || upper.includes('DUE DATE') || upper.includes('FECHA DE PAGO')) {
      result.dueDate = dates.length > 1
        ? `${dates[dates.length - 1].y}-${String(dates[dates.length - 1].m).padStart(2, '0')}-${String(dates[dates.length - 1].d).padStart(2, '0')}`
        : dates.length > 0
        ? `${dates[dates.length - 1].y}-${String(dates[dates.length - 1].m).padStart(2, '0')}-${String(dates[dates.length - 1].d).padStart(2, '0')}`
        : null;
      result.issueDate = dates.length > 1
        ? `${dates[0].y}-${String(dates[0].m).padStart(2, '0')}-${String(dates[0].d).padStart(2, '0')}`
        : null;
    } else if (dates.length >= 2) {
      result.issueDate = `${dates[0].y}-${String(dates[0].m).padStart(2, '0')}-${String(dates[0].d).padStart(2, '0')}`;
      result.dueDate = `${dates[dates.length - 1].y}-${String(dates[dates.length - 1].m).padStart(2, '0')}-${String(dates[dates.length - 1].d).padStart(2, '0')}`;
    } else if (dates.length === 1) {
      result.issueDate = `${dates[0].y}-${String(dates[0].m).padStart(2, '0')}-${String(dates[0].d).padStart(2, '0')}`;
    }

    const amounts: { val: number; raw: string; line: string }[] = [];
    const totalPattern = /(?:total\s*(?:general|a\s*pagar|pagado|neto)?|valor\s*total|neto\s*a\s*pagar|suma|importe\s*total|amount|balance\s*due|total\s*due|pagar|subtotal)\s*:?\s*([\$\€\s]*[\d,\.\s]+)/gi;
    for (const ap of text.matchAll(totalPattern)) {
      const cleaned = ap[1].replace(/[^\d,\.]/g, '');
      if (cleaned) amounts.push({ val: parseFloat(cleaned.replace(/,/g, '.')), raw: cleaned, line: ap[0] });
    }
    const allNums = text.match(/\$?\s*[\d,]{1,3}(?:[\.\,]\d{3})*(?:[\.\,]\d{2})?/g) || [];
    const parsed = allNums.map(a => {
      const n = a.replace(/[^\d,\.]/g, '');
      const hasComma = n.includes(',');
      const hasDot = n.includes('.');
      let v: number;
      if (hasComma && !hasDot) {
        const parts = n.split(',');
        v = parts.length === 2 && parts[1].length <= 2
          ? parseFloat(n.replace(',', '.'))
          : parseInt(n.replace(/,/g, ''));
      } else if (hasDot && !hasComma) {
        const parts = n.split('.');
        v = parts.length >= 3 ? parseInt(n.replace(/\./g, ''))
          : parts.length === 2 && parts[1].length <= 2 ? parseFloat(n)
          : parseInt(n);
      } else {
        v = parseInt(n.replace(/[^\d]/g, ''));
      }
      return { v: isNaN(v) ? 0 : v, raw: a };
    }).filter(x => x.v > 0);

    if (amounts.length > 0) {
      const maxLabel = amounts.reduce((a, b) => a.val > b.val ? a : b);
      result.amount = maxLabel.val;
    } else if (parsed.length > 0) {
      const max = parsed.reduce((a, b) => a.v > b.v ? a : b);
      result.amount = max.v;
    }

    const amountLine = result.amount ? text.split('\n').find(l => l.includes(String(result.amount))) || '' : '';
    const amountUpper = amountLine.toUpperCase();
    if (amountUpper.includes('EUR') || amountUpper.includes('€')) result.currency = 'EUR';
    else result.currency = 'USD';

    return result;
  }

  const statusLabels: Record<string, string> = {
    'loading tesseract core': 'Cargando motor OCR...',
    'initializing tesseract': 'Inicializando OCR...',
    'loading language traineddata': 'Cargando idioma (español)...',
    'initializing api': 'Preparando OCR...',
    'recognizing text': 'Reconociendo texto...',
  };

  const makeLogger = () => (m: { status: string; progress: number }) => {
    setProgress(m.progress);
    setProgressLabel(statusLabels[m.status] || m.status);
  };

  async function imageToText(file: File): Promise<string> {
    const { data } = await Tesseract.recognize(file, 'spa', {
      logger: makeLogger(),
    });
    return data.text;
  }

  async function pdfToText(file: File): Promise<string> {
    setProgressLabel('Procesando PDF...');
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.95));
    const { data } = await Tesseract.recognize(blob, 'spa', { logger: makeLogger() });
    return data.text;
  }

  const handleFile = async (file: File) => {
    setLoading(true);

    try {
      const text = file.type === 'application/pdf' ? await pdfToText(file) : await imageToText(file);
      const parsed = parseInvoiceText(text);
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
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          loading ? 'border-blue-500/50 bg-blue-500/5' : 'border-gray-600 hover:border-[#3B82F6] hover:bg-[#3B82F6]/5'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={handleChange} className="hidden" />
        {loading ? (
          <div className="py-3 space-y-2">
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
          <div className="flex items-center justify-center gap-2 py-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-gray-400 text-sm">Sube o arrastra foto/PDF de la factura</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 ml-2">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
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

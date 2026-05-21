import Tesseract from 'tesseract.js';

export interface ScanResult {
  invoiceNumber: string | null;
  vendor: string | null;
  issueDate: string | null;
  dueDate: string | null;
  amount: number | null;
  rawAmount: string | null;
  currency: string | null;
  mbl: string | null;
  container: string | null;
  workOrder: string | null;
  shipment: string | null;
}

function parseUsNumber(s: string): number {
  const cleaned = s.replace(/[^\d,\.]/g, '');
  const comma = cleaned.includes(',');
  const dot = cleaned.includes('.');
  if (comma && dot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    else return parseFloat(cleaned.replace(/,/g, ''));
  }
  if (comma) return parseFloat(cleaned.replace(',', '.'));
  if (dot) return parseFloat(cleaned);
  return parseInt(cleaned);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseInvoiceText(text: string): ScanResult {
  const lines = text.split('\n').filter(l => l.trim());
  const upper = text.toUpperCase();

  const result: ScanResult = {
    invoiceNumber: null,
    vendor: null,
    issueDate: null,
    dueDate: null,
    amount: null,
    rawAmount: null,
    currency: null,
    mbl: null,
    container: null,
    workOrder: null,
    shipment: null,
  };

  const invPatterns = [
    /(?:factura|invoice|inv#|invoice\s*#|n°|nro|numero|no\.|número|número de factura|factura n°|factura no\.)\s*:?\s*(?:#\s*)?([\w\-\/\.]{3,30})/i,
    /\b(\d{2,3}[-\/]\d{3,6}[-\/]\d{2,4})\b/,
  ];
  for (const p of invPatterns) {
    const m = text.match(p);
    if (m) { result.invoiceNumber = m[1].trim(); break; }
  }

  const knownVendors = [
    'AMZ TRUCKING', 'AMZ', 'TRUCKING', 'MAERSK', 'AVIANCA', 'DIAN',
    'SERVIENTREGA', 'DEPÓSITO', 'COPA AIRLINES', 'DB SCHENKER', 'MSC',
    'MEDITERRANEAN', 'SCHENKER', 'DHL', 'FEDEX', 'UPS', 'TRANSUNIVERSAL',
    'TCC', 'LOGISTICA', 'TRANSPORTE', 'NAVIERA', 'SEABOARD', 'EVERGREEN',
    'CMA CGM', 'HAPAG', 'LLOYD', 'YANMAR', 'PUERTO', 'ADUANAS', 'IMPORT',
    'EXPORT', 'CARGA', 'F L T', 'FLT', 'COLOMBIA', 'BOGOTÁ', 'MEDELLÍN',
    'CALI', 'BARRANQUILLA', 'CARTAGENA', 'BUENAVENTURA', 'TRAILER',
    'CARRIER', 'BNSF', 'UNION PACIFIC', 'NORFOLK SOUTHERN', 'CSX',
    'J.B. HUNT', 'SCHNEIDER', 'SWIFT', 'WERNER', 'KNIGHT', 'CRST',
  ];
  for (const v of knownVendors) {
    if (upper.includes(v)) {
      const line = lines.find(l => l.toUpperCase().includes(v));
      if (line) { result.vendor = line.trim(); break; }
    }
  }

  if (!result.vendor) {
    const m = text.match(/(?:invoice|factura)\s*(?:#|n°|nro|no\.)?\s*\w+\s+([A-Z][A-Z\s\.]+?)(?:\s+\d|\s+[A-Z]|\s*$)/i);
    if (m) {
      const v = m[1].trim();
      if (v.length >= 3 && v.length <= 60 && !v.match(/^\d/)) result.vendor = v;
    }
  }

  const labelPatterns = [
    /(?:proveedor|vendor|empresa|cliente|razón social|razon social|nombre|nombre del proveedor|contratista|prestador|carrier)\s*:?\s*([^\n]{2,80})/i,
    /(?:facturado por|emitido por|expedido por|bill\s*to)\s*:?\s*([^\n]{2,80})/i,
    /(?:remitente|consignatario|destinatario|destino|shipper)\s*:?\s*([^\n]{2,80})/i,
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
        cleaned.length >= 4 && cleaned.length <= 80 &&
        !cleaned.match(/^\d/) &&
        !cleaned.match(/^(factura|invoice|n°|nro|recibo|comprobante|fecha|fecha de emisión|nit|rut|dirección|teléfono|total|subtotal|iva|pagina|página|www|http)/i)
      ) {
        result.vendor = cleaned; break;
      }
    }
  }

  if (!result.vendor) {
    const invLine = text.match(/invoice\s*#\s*\d+\s+([A-Z][A-Z\s\.]{2,50})/i);
    if (invLine) {
      const v = invLine[1].trim();
      if (v.length >= 3) result.vendor = v;
    }
  }

  if (!result.vendor && lines.length > 0) {
    const firstLine = lines[0].replace(/[\(\)\[\]\{\}]/g, '').trim();
    if (firstLine.length <= 80 && !firstLine.match(/^(bill\s*to|to:|invoice|date|fecha)/i)) {
      result.vendor = firstLine;
    }
  }

  function parseDateNear(idx: number, text: string, preferUs: boolean): string | null {
    const after = text.slice(idx, idx + 80);
    const d = after.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!d) return null;
    let a = parseInt(d[1]), b = parseInt(d[2]), y = parseInt(d[3]);
    if (y < 100) y += 2000;
    if (preferUs) {
      if (a <= 12 && b <= 31) return `${y}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
      return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
    if (a > 31) { [a, b] = [b, a]; }
    if (b > 12) { [a, b] = [b, a]; }
    return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
  }

  const dateLabel = text.match(/(?:date|fecha|invoice\s*date)\s*:?\s*/i);
  if (dateLabel) {
    result.issueDate = parseDateNear(dateLabel.index! + dateLabel[0].length, text, true);
  }

  const dueLabel = text.match(/(?:due\s*date|payment\s*due|payable|fecha\s*(?:de\s*)?(?:vencimiento|pago|entrega|límite|limite)|vence\s*(?:el)?)\s*:?\s*/i);
  if (dueLabel) {
    result.dueDate = parseDateNear(dueLabel.index! + dueLabel[0].length, text, true);
  }

  const termsMatch = text.match(/(?:payment\s*terms|terms|net)\s*:?\s*(?:NET\s*(\d+)|net\s*(\d+))/i);
  if (!result.dueDate && result.issueDate && termsMatch) {
    const netDays = parseInt(termsMatch[1] || termsMatch[2]);
    if (!isNaN(netDays) && netDays > 0) {
      result.dueDate = addDays(result.issueDate, netDays);
    }
  }

  if (!result.issueDate) {
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
    const rawDates: { a: number; b: number; y: number }[] = [];
    let md;
    while ((md = dateRegex.exec(text)) !== null) {
      let a = parseInt(md[1]), b = parseInt(md[2]), y = parseInt(md[3]);
      if (y < 100) y += 2000;
      rawDates.push({ a, b, y });
    }
    const validDates = rawDates.filter(d => d.a >= 1 && d.a <= 12 && d.b >= 1 && d.b <= 31 && d.y >= 2020 && d.y <= 2030);
    if (validDates.length > 0) {
      result.issueDate = `${validDates[0].y}-${String(validDates[0].a).padStart(2, '0')}-${String(validDates[0].b).padStart(2, '0')}`;
    }
  }

  const blLabel = text.match(/(?:bill\s*of\s*lading|ocean\s*bill\s*of\s*lading|house\s*bill\s*of\s*lading|b\/l|bl\s*no|master\s*bl)\s*:?\s*([A-Z][A-Z0-9]+)/i);
  if (blLabel) {
    result.mbl = blLabel[1].toUpperCase();
  }
  if (!result.mbl) {
    const blFallback = text.match(/\b(?:HLCU|ZIMU|MSCU|MAEU|CMAU|OOLU)\d{7,12}\b/i);
    if (blFallback) result.mbl = blFallback[0].toUpperCase();
  }

  const containerCandidates = text.match(/\b([A-Z]{4})\s*(\d{6,7})(?:[-\s]\d)?\b/i);
  if (containerCandidates) {
    const c = (containerCandidates[1] + containerCandidates[2]).toUpperCase();
    if (c !== result.mbl) result.container = c;
  }

  const workOrderCandidates = text.match(/work\s*order\s*#?\s*([\w\-\.\/]+)/i);
  if (workOrderCandidates && workOrderCandidates[1].trim()) {
    result.workOrder = workOrderCandidates[1].trim();
  }

  const shipmentLabel = text.match(/(?:shipment|ship\s*ref|shipper\s*ref)\s*:?\s*([A-Z][A-Z0-9]+)/i);
  if (shipmentLabel) {
    result.shipment = shipmentLabel[1];
  }
  const orderMatch = text.match(/order\s*number\s*:?\s*(\d{4,})/i);
  if (!result.shipment && orderMatch) {
    result.shipment = orderMatch[1];
  }
  const refMatch = text.match(/consignee\s*ref\s*no\.?\s*:?\s*(\d+)/i);
  if (!result.shipment && refMatch) {
    result.shipment = refMatch[1];
  }
  const schMatch = text.match(/\bSCHIIS(\d+)\b/i);
  if (!result.shipment && schMatch) {
    result.shipment = schMatch[1];
  }

  let rawAmountStr: string | null = null;

  const totalPattern = /(?:total\s*(?:general|a\s*pagar|pagado|neto|due)?|valor\s*total|neto\s*a\s*pagar|suma|importe\s*total|amount|balance\s*due|total\s*due|pagar|subtotal|amount\s*due)\s*:?\s*\$?\s*([\d,\.\s]+)/gi;
  const amounts: { val: number; raw: string }[] = [];
  for (const ap of text.matchAll(totalPattern)) {
    const raw = ap[1].trim();
    if (raw) {
      amounts.push({ val: parseUsNumber(raw), raw });
    }
  }

  const allNums = text.match(/\$?\s*[\d,]{1,3}(?:[\.\,]\d{3})*(?:[\.\,]\d{2})?/g) || [];
  const parsed = allNums.map(a => {
    const v = parseUsNumber(a);
    return { v: isNaN(v) ? 0 : v, raw: a.trim() };
  }).filter(x => x.v > 0);

  if (amounts.length > 0) {
    const maxLabel = amounts.reduce((a, b) => a.val > b.val ? a : b);
    result.amount = maxLabel.val;
    rawAmountStr = maxLabel.raw;
  } else if (parsed.length > 0) {
    const max = parsed.reduce((a, b) => a.v > b.v ? a : b);
    result.amount = max.v;
    rawAmountStr = max.raw;
  }

  if (rawAmountStr && result.amount) {
    result.rawAmount = `$${rawAmountStr}`;
  }

  const amountLine = result.amount ? text.split('\n').find(l => l.includes(rawAmountStr || String(result.amount))) || '' : '';
  const amountUpper = amountLine.toUpperCase();
  if (amountUpper.includes('EUR') || amountUpper.includes('€')) result.currency = 'EUR';
  else result.currency = 'USD';

  return result;
}

export async function imageToText(
  file: File,
  onProgress?: (p: number, label: string) => void
): Promise<string> {
  const statusLabels: Record<string, string> = {
    'loading tesseract core': 'Cargando motor OCR...',
    'initializing tesseract': 'Inicializando OCR...',
    'loading language traineddata': 'Cargando idioma (español)...',
    'initializing api': 'Preparando OCR...',
    'recognizing text': 'Reconociendo texto...',
  };

  const { data } = await Tesseract.recognize(file, 'spa', {
    logger: (m: { status: string; progress: number }) => {
      onProgress?.(m.progress, statusLabels[m.status] || m.status);
    },
  });
  return data.text;
}

export async function pdfToText(
  file: File,
  onProgress?: (p: number, label: string) => void
): Promise<string> {
  onProgress?.(0, 'Procesando PDF...');
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
  const statusLabels: Record<string, string> = {
    'loading tesseract core': 'Cargando motor OCR...',
    'initializing tesseract': 'Inicializando OCR...',
    'loading language traineddata': 'Cargando idioma (español)...',
    'initializing api': 'Preparando OCR...',
    'recognizing text': 'Reconociendo texto...',
  };

  const { data } = await Tesseract.recognize(blob, 'spa', {
    logger: (m: { status: string; progress: number }) => {
      onProgress?.(m.progress, statusLabels[m.status] || m.status);
    },
  });
  return data.text;
}

export async function scanFile(
  file: File,
  onProgress?: (p: number, label: string) => void
): Promise<ScanResult> {
  const text = file.type === 'application/pdf'
    ? await pdfToText(file, onProgress)
    : await imageToText(file, onProgress);
  return parseInvoiceText(text);
}

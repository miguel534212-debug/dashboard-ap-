import * as XLSX from 'xlsx';
import type { Invoice, Status, Currency, Category } from '../types/invoice';
import { generateId } from './calculations';

export interface ExcelRow {
  invoiceNumber: string;
  vendor: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: Currency;
  category: Category;
  status: Status;
  mbl: string;
  container: string;
  rawData: Record<string, string>;
}

export interface ImportAction {
  type: 'create' | 'update' | 'skip';
  row: ExcelRow;
  existingInvoice?: Invoice;
  changes?: Partial<Invoice>;
}

const STATUS_MAP: Record<string, Status> = {
  'paid': 'Pagada',
  'pagado': 'Pagada',
  'pagada': 'Pagada',
  'overdue': 'Vencida',
  'vencido': 'Vencida',
  'vencida': 'Vencida',
  'pending': 'Pendiente',
  'pendiente': 'Pendiente',
  'approved': 'Aprobada',
  'aprobado': 'Aprobada',
  'aprobada': 'Aprobada',
  'en disputa': 'En Disputa',
  'dispute': 'En Disputa',
  'esperando soporte': 'Esperando Soporte',
  'support': 'Esperando Soporte',
};

const CATEGORY_MAP: Record<string, Category> = {
  'ocean freight': 'Ocean Freight',
  'air freight': 'Air Freight',
  'customs': 'Customs',
  'trucking': 'Trucking',
  'storage': 'Storage',
  'other': 'Other',
};

const COLUMN_ALIASES: Record<string, string[]> = {
  invoiceNumber: ['factura', 'invoice number', 'invoice no', 'invoice #', 'inv#', 'inv no', 'n° factura', 'número factura', 'numero factura', 'nro factura', 'factura #'],
  vendor: ['proveedor', 'vendor', 'supplier', 'provider', 'remitente', 'shipper', 'carrier'],
  issueDate: ['emisión', 'issue date', 'date', 'fecha emisión', 'fecha emision', 'fecha', 'invoice date'],
  dueDate: ['vencimiento', 'due date', 'fecha vencimiento', 'payment due', 'payable', 'vence'],
  amount: ['valor', 'amount', 'total', 'monto', 'importe', 'subtotal', 'neto', 'balance'],
  currency: ['moneda', 'currency', 'divisa'],
  status: ['estado', 'status', 'state', 'situación', 'situacion'],
  mbl: ['mbl', 'master bl', 'bill of lading', 'bl no', 'bl#'],
  container: ['container', 'contenedor', 'cntr', 'cnt'],
  category: ['categoría', 'categoria', 'category', 'tipo', 'type'],
};

function guessColumn(headers: string[], aliases: string[]): string | undefined {
  const h = headers.map(h => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = h.indexOf(alias.toLowerCase());
    if (idx !== -1) return headers[idx];
    const partial = h.findIndex(x => x.includes(alias.toLowerCase()) || alias.includes(x));
    if (partial !== -1) return headers[partial];
  }
  return undefined;
}

function normalizeDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const m = s.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (m) {
    let a = parseInt(m[1]), b = parseInt(m[2]), c = parseInt(m[3]);
    if (c < 100) c += 2000;
    let y: number, mo: number, d: number;
    if (a > 31) { y = a; mo = b; d = c; }
    else if (c > 31) { y = c; mo = a; d = b; }
    else { y = c; mo = b; d = a; }
    if (y < 100) y += 2000;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return s.slice(0, 10);
}

function parseAmount(val: unknown): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).replace(/[^0-9.,\-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function guessStatus(val: unknown): Status {
  if (!val) return 'Pendiente';
  const key = String(val).toLowerCase().trim();
  return STATUS_MAP[key] || 'Pendiente';
}

function guessCurrency(val: unknown): Currency {
  if (!val) return 'USD';
  const s = String(val).toUpperCase().trim();
  if (s.includes('EUR') || s.includes('€')) return 'EUR';
  return 'USD';
}

function guessCategory(val: unknown): Category {
  if (!val) return 'Ocean Freight';
  const key = String(val).toLowerCase().trim();
  return CATEGORY_MAP[key] || 'Other';
}

function extractColumn(row: Record<string, unknown>, colName: string): unknown {
  const val = row[colName];
  if (val === undefined || val === null) return '';
  return val;
}

export function parseExcel(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length === 0) { resolve([]); return; }

        const headers = Object.keys(json[0]);
        const col = (aliases: string[]) => guessColumn(headers, aliases);

        const invCol = col(COLUMN_ALIASES.invoiceNumber);
        const vendorCol = col(COLUMN_ALIASES.vendor);
        const issueCol = col(COLUMN_ALIASES.issueDate);
        const dueCol = col(COLUMN_ALIASES.dueDate);
        const amountCol = col(COLUMN_ALIASES.amount);
        const currencyCol = col(COLUMN_ALIASES.currency);
        const statusCol = col(COLUMN_ALIASES.status);
        const mblCol = col(COLUMN_ALIASES.mbl);
        const containerCol = col(COLUMN_ALIASES.container);
        const categoryCol = col(COLUMN_ALIASES.category);

        const rows: ExcelRow[] = [];
        for (const row of json) {
          const rawData: Record<string, string> = {};
          for (const key of headers) rawData[key] = String(extractColumn(row, key));

          const invoiceNumber = invCol ? String(extractColumn(row, invCol)).trim() : '';
          if (!invoiceNumber) continue;

          const vendor = vendorCol ? String(extractColumn(row, vendorCol)).trim() : '';
          const issueDate = issueCol ? normalizeDate(extractColumn(row, issueCol)) : '';
          const dueDate = dueCol ? normalizeDate(extractColumn(row, dueCol)) : '';
          const amount = amountCol ? parseAmount(extractColumn(row, amountCol)) : 0;
          const currency = currencyCol ? guessCurrency(extractColumn(row, currencyCol)) : 'USD';
          const status = statusCol ? guessStatus(extractColumn(row, statusCol)) : 'Pendiente';
          const mbl = mblCol ? String(extractColumn(row, mblCol)).trim() : '';
          const container = containerCol ? String(extractColumn(row, containerCol)).trim() : '';
          const category = categoryCol ? guessCategory(extractColumn(row, categoryCol)) : 'Ocean Freight';

          rows.push({ invoiceNumber, vendor, issueDate, dueDate, amount, currency, category, status, mbl, container, rawData });
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function computeImportActions(rows: ExcelRow[], existingInvoices: Invoice[]): ImportAction[] {
  return rows.map(row => {
    const match = existingInvoices.find(inv =>
      inv.invoiceNumber.toLowerCase().trim() === row.invoiceNumber.toLowerCase().trim()
    );
    if (!match) {
      return { type: 'create', row };
    }
    const changes: Partial<Invoice> = {};
    if (row.status !== match.status) changes.status = row.status;
    if (row.vendor && row.vendor !== match.vendor) changes.vendor = row.vendor;
    if (row.issueDate && row.issueDate !== match.issueDate) changes.issueDate = row.issueDate;
    if (row.dueDate && row.dueDate !== match.dueDate) changes.dueDate = row.dueDate;
    if (row.amount && row.amount !== match.amount) changes.amount = row.amount;
    if (row.currency && row.currency !== match.currency) changes.currency = row.currency;

    if (Object.keys(changes).length === 0) {
      return { type: 'skip', row, existingInvoice: match };
    }
    return { type: 'update', row, existingInvoice: match, changes };
  });
}

export function applyImportActions(
  actions: ImportAction[],
  selectedActions: Set<number>,
  _existingInvoices: Invoice[],
  addInvoice: (inv: Invoice) => void,
  updateInvoice: (inv: Invoice) => void,
): void {
  for (let i = 0; i < actions.length; i++) {
    if (!selectedActions.has(i)) continue;
    const action = actions[i];
    if (action.type === 'create') {
      const inv: Invoice = {
        id: generateId(),
        vendor: action.row.vendor || 'Sin proveedor',
        invoiceNumber: action.row.invoiceNumber,
        issueDate: action.row.issueDate || new Date().toISOString().slice(0, 10),
        dueDate: action.row.dueDate || undefined,
        amount: action.row.amount,
        currency: action.row.currency,
        category: action.row.category,
        status: action.row.status,
        notes: '',
        paidDate: action.row.status === 'Pagada' ? new Date().toISOString().slice(0, 10) : undefined,
        lastUpdatedBy: 'CargoWise',
        disputeReason: null,
        statusHistory: [{
          status: action.row.status,
          date: new Date().toISOString(),
          updatedBy: 'CargoWise',
          note: 'Importado desde CargoWise',
        }],
      };
      addInvoice(inv);
    } else if (action.type === 'update' && action.existingInvoice && action.changes) {
      const updated: Invoice = {
        ...action.existingInvoice,
        ...action.changes,
        paidDate: action.changes.status === 'Pagada'
          ? (action.existingInvoice.paidDate || new Date().toISOString().slice(0, 10))
          : action.existingInvoice.paidDate,
        statusHistory: [
          ...(action.existingInvoice.statusHistory || []),
          {
            status: action.changes.status || action.existingInvoice.status,
            date: new Date().toISOString(),
            updatedBy: 'CargoWise',
            note: `Actualizado desde CargoWise: ${Object.keys(action.changes).join(', ')}`,
          },
        ],
      };
      updateInvoice(updated);
    }
  }
}

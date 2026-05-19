import { useState, useEffect, useMemo } from 'react';
import type { Invoice, Status, Category, Currency } from '../types/invoice';
import { generateId } from '../utils/calculations';
import { InvoiceScanner } from './InvoiceScanner';
import type { ScanResult } from './InvoiceScanner';

interface InvoiceModalProps {
  open: boolean;
  editingInvoice: Invoice | null;
  existingVendors: string[];
  geminiApiKey: string;
  onClose: () => void;
  onSave: (inv: Invoice) => void;
}

const categories: Category[] = ['Ocean Freight', 'Air Freight', 'Customs', 'Trucking', 'Storage', 'Other'];
const statuses: Status[] = ['Pending', 'Approved', 'Paid'];

export function InvoiceModal({ open, editingInvoice, existingVendors, geminiApiKey, onClose, onSave }: InvoiceModalProps) {
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [category, setCategory] = useState<Category>('Ocean Freight');
  const [status, setStatus] = useState<Status>('Pending');
  const [notes, setNotes] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [scannedFields, setScannedFields] = useState<Set<string>>(new Set());

  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return existingVendors;
    return existingVendors.filter(v => v.toLowerCase().includes(vendorSearch.toLowerCase()));
  }, [vendorSearch, existingVendors]);

  useEffect(() => {
    if (editingInvoice) {
      setVendor(editingInvoice.vendor);
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setIssueDate(editingInvoice.issueDate);
      setDueDate(editingInvoice.dueDate);
      setAmount(String(editingInvoice.amount));
      setCurrency(editingInvoice.currency);
      setCategory(editingInvoice.category);
      setStatus(editingInvoice.status);
      setNotes(editingInvoice.notes);
      setVendorSearch(editingInvoice.vendor);
    } else {
      setVendor('');
      setInvoiceNumber('');
      setIssueDate('');
      setDueDate('');
      setAmount('');
      setCurrency('USD');
      setCategory('Ocean Freight');
      setStatus('Pending');
      setNotes('');
      setVendorSearch('');
    }
    setScannedFields(new Set());
  }, [editingInvoice, open]);

  const handleScan = (data: ScanResult) => {
    const filled = new Set<string>();
    if (data.invoiceNumber) { setInvoiceNumber(data.invoiceNumber); filled.add('invoiceNumber'); }
    if (data.vendor) { setVendor(data.vendor); setVendorSearch(data.vendor); filled.add('vendor'); }
    if (data.issueDate) { setIssueDate(data.issueDate); filled.add('issueDate'); }
    if (data.dueDate) { setDueDate(data.dueDate); filled.add('dueDate'); }
    if (data.amount) { setAmount(String(data.amount)); filled.add('amount'); }
    if (data.currency) { setCurrency(data.currency as Currency); filled.add('currency'); }
    setScannedFields(filled);
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !invoiceNumber || !issueDate || !dueDate || !amount) return;

    const inv: Invoice = {
      id: editingInvoice?.id || generateId(),
      vendor: vendor.trim(),
      invoiceNumber,
      issueDate,
      dueDate,
      amount: Number(amount),
      currency,
      category,
      status: editingInvoice?.status || (status === 'Paid' ? 'Paid' : status),
      notes,
      paidDate: status === 'Paid' ? new Date().toISOString().slice(0, 10) : editingInvoice?.paidDate,
    };
    onSave(inv);
  };

  const inputClass = (field: string) =>
    `w-full bg-[#0F172A] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500 ${
      scannedFields.has(field) ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]/30' : 'border-gray-600'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1E293B] border border-gray-700/50 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-white font-semibold">{editingInvoice ? 'Editar Factura' : 'Nueva Factura'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!editingInvoice && (
            <InvoiceScanner apiKey={geminiApiKey} onScan={handleScan} />
          )}

          <div className="relative">
            <label className="block text-gray-300 text-sm font-medium mb-1">Proveedor *</label>
            <input
              type="text" value={vendorSearch} onChange={e => { setVendorSearch(e.target.value); setVendor(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className={inputClass('vendor')}
              placeholder="Buscar o escribir proveedor..." required
            />
            {showDropdown && filteredVendors.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-[#0F172A] border border-gray-600 rounded-lg max-h-40 overflow-y-auto shadow-lg">
                {filteredVendors.map(v => (
                  <button key={v} type="button" onMouseDown={() => { setVendor(v); setVendorSearch(v); setShowDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#3B82F6]/10 hover:text-white transition-colors"
                  >{v}</button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">N° Factura *</label>
              <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputClass('invoiceNumber')} required />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value as Category)} className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Fecha Emisión *</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputClass('issueDate')} required />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Fecha Vencimiento *</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass('dueDate')} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-gray-300 text-sm font-medium mb-1">Valor *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass('amount')} min="0" step="0.01" required />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="COP">COP</option>
              </select>
            </div>
          </div>

          {!editingInvoice && (
            <div className="grid grid-cols-2 gap-4">
              <div></div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Estado</label>
                <select value={status} onChange={e => setStatus(e.target.value as Status)} className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]">
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500 resize-none" placeholder="Observaciones..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors">
              {editingInvoice ? 'Guardar Cambios' : 'Agregar Factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

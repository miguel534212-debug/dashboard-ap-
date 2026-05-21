import { useState, useCallback, useEffect } from 'react';
import type { Invoice, Status, FilterState, StatusHistoryEntry } from '../types/invoice';

const STORAGE_KEY = 'boc-ap-invoices';

function seedInvoice(overrides: Partial<Invoice> & { id: string; vendor: string; invoiceNumber: string; issueDate: string; amount: number; category: Invoice['category']; status: Status }): Invoice {
  return {
    dueDate: undefined,
    notes: '',
    paidDate: undefined,
    pdfAttachment: undefined,
    pdfName: undefined,
    lastUpdatedBy: '',
    disputeReason: null,
    statusHistory: [],
    currency: 'USD',
    ...overrides,
  };
}

const seedInvoices: Invoice[] = [
  seedInvoice({ id: '1', vendor: 'Maersk Colombia', invoiceNumber: 'MRSK-2024-001', issueDate: '2025-12-01', dueDate: '2026-01-15', amount: 7125, category: 'Ocean Freight', status: 'Vencida', notes: 'Flete marítimo Shanghai-Buenaventura' }),
  seedInvoice({ id: '2', vendor: 'Avianca Cargo', invoiceNumber: 'AVA-2024-042', issueDate: '2026-01-10', dueDate: '2026-02-10', amount: 3125, category: 'Air Freight', status: 'Vencida', notes: 'Carga aérea Miami-Bogotá' }),
  seedInvoice({ id: '3', vendor: 'DIAN Aduanas', invoiceNumber: 'DIAN-2024-018', issueDate: '2026-02-01', dueDate: '2026-03-01', amount: 850, category: 'Customs', status: 'Vencida', notes: 'Liquidación aranceles importación' }),
  seedInvoice({ id: '4', vendor: 'Servientrega', invoiceNumber: 'SERV-2024-033', issueDate: '2026-03-01', dueDate: '2026-03-15', amount: 220, category: 'Trucking', status: 'Vencida', notes: 'Transporte terrestre Bogotá-Medellín' }),
  seedInvoice({ id: '5', vendor: 'Depósito Central Bogotá', invoiceNumber: 'DCB-2024-007', issueDate: '2026-03-10', dueDate: '2026-04-10', amount: 525, category: 'Storage', status: 'Vencida', notes: 'Almacenamiento 30 días' }),
  seedInvoice({ id: '6', vendor: 'Copa Airlines Cargo', invoiceNumber: 'CPA-2024-015', issueDate: '2026-03-15', dueDate: '2026-04-15', amount: 2450, category: 'Air Freight', status: 'Vencida', notes: 'Flete aéreo Panamá-Bogotá' }),
  seedInvoice({ id: '7', vendor: 'DB Schenker', invoiceNumber: 'DBS-2024-022', issueDate: '2026-04-01', dueDate: '2026-05-01', amount: 3800, category: 'Ocean Freight', status: 'Aprobada', notes: 'Flete marítimo Hamburgo-Cartagena', currency: 'EUR' }),
  seedInvoice({ id: '8', vendor: 'Mediterranean Shipping Co', invoiceNumber: 'MSC-2024-056', issueDate: '2026-04-05', dueDate: '2026-05-05', amount: 4875, category: 'Ocean Freight', status: 'Aprobada', notes: 'Contenedor 40\' China-Buenaventura' }),
  seedInvoice({ id: '9', vendor: 'Maersk Colombia', invoiceNumber: 'MRSK-2024-089', issueDate: '2026-04-10', dueDate: '2026-05-10', amount: 8000, category: 'Ocean Freight', status: 'Pendiente', notes: 'Flete marítimo Busan-Buenaventura' }),
  seedInvoice({ id: '10', vendor: 'Avianca Cargo', invoiceNumber: 'AVA-2024-067', issueDate: '2026-04-12', dueDate: '2026-05-12', amount: 2175, category: 'Air Freight', status: 'Pendiente', notes: 'Carga perecedera Miami-Bogotá' }),
  seedInvoice({ id: '11', vendor: 'DIAN Aduanas', invoiceNumber: 'DIAN-2024-031', issueDate: '2026-04-15', dueDate: '2026-05-15', amount: 1400, category: 'Customs', status: 'Pendiente', notes: 'Nacionalización mercancía' }),
  seedInvoice({ id: '12', vendor: 'Servientrega', invoiceNumber: 'SERV-2024-089', issueDate: '2026-04-20', dueDate: '2026-05-05', amount: 300, category: 'Trucking', status: 'Pendiente', notes: 'Distribución última milla' }),
  seedInvoice({ id: '13', vendor: 'Depósito Central Bogotá', invoiceNumber: 'DCB-2024-022', issueDate: '2026-04-22', dueDate: '2026-05-22', amount: 450, category: 'Storage', status: 'Pagada', notes: 'Almacenamiento 45 días', paidDate: '2026-05-15' }),
  seedInvoice({ id: '14', vendor: 'Copa Airlines Cargo', invoiceNumber: 'CPA-2024-029', issueDate: '2026-01-20', dueDate: '2026-02-20', amount: 3625, category: 'Air Freight', status: 'Pagada', notes: 'Flete aéreo Panamá-Cali', paidDate: '2026-02-15' }),
  seedInvoice({ id: '15', vendor: 'DB Schenker', invoiceNumber: 'DBS-2024-045', issueDate: '2026-02-15', dueDate: '2026-03-15', amount: 10500, category: 'Ocean Freight', status: 'Pagada', notes: 'Flete marítimo Rotterdam-Cartagena', paidDate: '2026-03-10', currency: 'EUR' }),
  seedInvoice({ id: '16', vendor: 'Mediterranean Shipping Co', invoiceNumber: 'MSC-2024-078', issueDate: '2026-04-28', dueDate: '2026-06-01', amount: 11250, category: 'Ocean Freight', status: 'Pendiente', notes: 'Contenedor 40\' refrigerado' }),
  seedInvoice({ id: '17', vendor: 'Avianca Cargo', invoiceNumber: 'AVA-2024-091', issueDate: '2026-05-01', dueDate: '2026-05-01', amount: 800, category: 'Air Freight', status: 'Pagada', notes: 'Carga documentos Bogotá-Miami', paidDate: '2026-05-01' }),
  seedInvoice({ id: '18', vendor: 'Maersk Colombia', invoiceNumber: 'MRSK-2024-112', issueDate: '2026-05-02', dueDate: '2026-06-02', amount: 7000, category: 'Ocean Freight', status: 'Pendiente', notes: 'Flete marítimo Ningbo-Buenaventura' }),
  seedInvoice({ id: '19', vendor: 'Servientrega', invoiceNumber: 'SERV-2024-112', issueDate: '2026-05-05', dueDate: '2026-05-19', amount: 240, category: 'Trucking', status: 'Pendiente', notes: 'Transporte Bogotá-Cartagena' }),
  seedInvoice({ id: '20', vendor: 'DIAN Aduanas', invoiceNumber: 'DIAN-2024-047', issueDate: '2026-05-08', dueDate: '2026-06-08', amount: 1025, category: 'Customs', status: 'Pendiente', notes: 'Trámite aduanero importación' }),
];

function loadInvoices(): Invoice[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: Invoice[] = JSON.parse(stored);
      return parsed.map(inv => ({
        ...inv,
        lastUpdatedBy: inv.lastUpdatedBy || '',
        disputeReason: inv.disputeReason ?? null,
        statusHistory: inv.statusHistory || [],
      }));
    }
  } catch {}
  return seedInvoices;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [filters, setFilters] = useState<FilterState>({ status: 'All', vendor: '', dateFrom: '', dateTo: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }, [invoices]);

  const addInvoice = useCallback((inv: Invoice) => {
    setInvoices(prev => [...prev, inv]);
  }, []);

  const updateInvoice = useCallback((inv: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  }, []);

  const markStatus = useCallback((id: string, status: Status) => {
    setInvoices(prev => prev.map(i => i.id === id ? {
      ...i,
      status,
      statusHistory: [...(i.statusHistory || []), {
        status,
        date: new Date().toISOString(),
        updatedBy: 'Sistema',
        note: `Estado cambiado a ${status}`,
      }],
    } : i));
  }, []);

  const addActivity = useCallback((id: string, entry: {
    status?: Status;
    updatedBy: string;
    note: string;
    disputeReason?: string | null;
  }) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const newStatus = entry.status || inv.status;
      const newEntry: StatusHistoryEntry = {
        status: newStatus,
        date: new Date().toISOString(),
        updatedBy: entry.updatedBy,
        note: entry.note,
      };
      const timestamp = new Date().toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const noteLine = `[${timestamp} ${entry.updatedBy}] ${entry.note}`;
      const updatedNotes = inv.notes ? `${inv.notes}\n${noteLine}` : noteLine;

      return {
        ...inv,
        status: newStatus,
        notes: updatedNotes,
        lastUpdatedBy: entry.updatedBy,
        disputeReason: entry.disputeReason !== undefined ? entry.disputeReason : inv.disputeReason,
        statusHistory: [...(inv.statusHistory || []), newEntry],
      };
    }));
  }, []);

  const detailInvoice = detailInvoiceId
    ? invoices.find(i => i.id === detailInvoiceId) || null
    : null;

  const filteredInvoices = invoices.filter(inv => {
    if (filters.status !== 'All' && inv.status !== filters.status) return false;
    if (filters.vendor && !inv.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) return false;
    if (filters.dateFrom && inv.issueDate < filters.dateFrom) return false;
    if (filters.dateTo && inv.issueDate > filters.dateTo) return false;
    return true;
  });

  return {
    invoices,
    filteredInvoices,
    filters,
    setFilters,
    showModal,
    setShowModal,
    editingInvoice,
    setEditingInvoice,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markStatus,
    addActivity,
    detailInvoiceId,
    setDetailInvoiceId,
    detailInvoice,
  };
}

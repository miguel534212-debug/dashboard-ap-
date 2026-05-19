import { useState, useCallback, useEffect } from 'react';
import type { Invoice, Status, FilterState } from '../types/invoice';

const STORAGE_KEY = 'boc-ap-invoices';

const seedInvoices: Invoice[] = [
  { id: '1', vendor: 'Maersk Colombia', invoiceNumber: 'MRSK-2024-001', issueDate: '2025-12-01', dueDate: '2026-01-15', amount: 7125, currency: 'USD', category: 'Ocean Freight', status: 'Overdue', notes: 'Flete marítimo Shanghai-Buenaventura' },
  { id: '2', vendor: 'Avianca Cargo', invoiceNumber: 'AVA-2024-042', issueDate: '2026-01-10', dueDate: '2026-02-10', amount: 3125, currency: 'USD', category: 'Air Freight', status: 'Overdue', notes: 'Carga aérea Miami-Bogotá' },
  { id: '3', vendor: 'DIAN Aduanas', invoiceNumber: 'DIAN-2024-018', issueDate: '2026-02-01', dueDate: '2026-03-01', amount: 850, currency: 'USD', category: 'Customs', status: 'Overdue', notes: 'Liquidación aranceles importación' },
  { id: '4', vendor: 'Servientrega', invoiceNumber: 'SERV-2024-033', issueDate: '2026-03-01', dueDate: '2026-03-15', amount: 220, currency: 'USD', category: 'Trucking', status: 'Overdue', notes: 'Transporte terrestre Bogotá-Medellín' },
  { id: '5', vendor: 'Depósito Central Bogotá', invoiceNumber: 'DCB-2024-007', issueDate: '2026-03-10', dueDate: '2026-04-10', amount: 525, currency: 'USD', category: 'Storage', status: 'Overdue', notes: 'Almacenamiento 30 días' },
  { id: '6', vendor: 'Copa Airlines Cargo', invoiceNumber: 'CPA-2024-015', issueDate: '2026-03-15', dueDate: '2026-04-15', amount: 2450, currency: 'USD', category: 'Air Freight', status: 'Overdue', notes: 'Flete aéreo Panamá-Bogotá' },
  { id: '7', vendor: 'DB Schenker', invoiceNumber: 'DBS-2024-022', issueDate: '2026-04-01', dueDate: '2026-05-01', amount: 3800, currency: 'EUR', category: 'Ocean Freight', status: 'Approved', notes: 'Flete marítimo Hamburgo-Cartagena' },
  { id: '8', vendor: 'Mediterranean Shipping Co', invoiceNumber: 'MSC-2024-056', issueDate: '2026-04-05', dueDate: '2026-05-05', amount: 4875, currency: 'USD', category: 'Ocean Freight', status: 'Approved', notes: 'Contenedor 40\' China-Buenaventura' },
  { id: '9', vendor: 'Maersk Colombia', invoiceNumber: 'MRSK-2024-089', issueDate: '2026-04-10', dueDate: '2026-05-10', amount: 8000, currency: 'USD', category: 'Ocean Freight', status: 'Pending', notes: 'Flete marítimo Busan-Buenaventura' },
  { id: '10', vendor: 'Avianca Cargo', invoiceNumber: 'AVA-2024-067', issueDate: '2026-04-12', dueDate: '2026-05-12', amount: 2175, currency: 'USD', category: 'Air Freight', status: 'Pending', notes: 'Carga perecedera Miami-Bogotá' },
  { id: '11', vendor: 'DIAN Aduanas', invoiceNumber: 'DIAN-2024-031', issueDate: '2026-04-15', dueDate: '2026-05-15', amount: 1400, currency: 'USD', category: 'Customs', status: 'Pending', notes: 'Nacionalización mercancía' },
  { id: '12', vendor: 'Servientrega', invoiceNumber: 'SERV-2024-089', issueDate: '2026-04-20', dueDate: '2026-05-05', amount: 300, currency: 'USD', category: 'Trucking', status: 'Pending', notes: 'Distribución última milla' },
  { id: '13', vendor: 'Depósito Central Bogotá', invoiceNumber: 'DCB-2024-022', issueDate: '2026-04-22', dueDate: '2026-05-22', amount: 450, currency: 'USD', category: 'Storage', status: 'Paid', notes: 'Almacenamiento 45 días', paidDate: '2026-05-15' },
  { id: '14', vendor: 'Copa Airlines Cargo', invoiceNumber: 'CPA-2024-029', issueDate: '2026-01-20', dueDate: '2026-02-20', amount: 3625, currency: 'USD', category: 'Air Freight', status: 'Paid', notes: 'Flete aéreo Panamá-Cali', paidDate: '2026-02-15' },
  { id: '15', vendor: 'DB Schenker', invoiceNumber: 'DBS-2024-045', issueDate: '2026-02-15', dueDate: '2026-03-15', amount: 10500, currency: 'EUR', category: 'Ocean Freight', status: 'Paid', notes: 'Flete marítimo Rotterdam-Cartagena', paidDate: '2026-03-10' },
  { id: '16', vendor: 'Mediterranean Shipping Co', invoiceNumber: 'MSC-2024-078', issueDate: '2026-04-28', dueDate: '2026-06-01', amount: 11250, currency: 'USD', category: 'Ocean Freight', status: 'Pending', notes: 'Contenedor 40\' refrigerado' },
  { id: '17', vendor: 'Avianca Cargo', invoiceNumber: 'AVA-2024-091', issueDate: '2026-05-01', dueDate: '2026-05-01', amount: 800, currency: 'USD', category: 'Air Freight', status: 'Paid', notes: 'Carga documentos Bogotá-Miami', paidDate: '2026-05-01' },
  { id: '18', vendor: 'Maersk Colombia', invoiceNumber: 'MRSK-2024-112', issueDate: '2026-05-02', dueDate: '2026-06-02', amount: 7000, currency: 'USD', category: 'Ocean Freight', status: 'Pending', notes: 'Flete marítimo Ningbo-Buenaventura' },
  { id: '19', vendor: 'Servientrega', invoiceNumber: 'SERV-2024-112', issueDate: '2026-05-05', dueDate: '2026-05-19', amount: 240, currency: 'USD', category: 'Trucking', status: 'Pending', notes: 'Transporte Bogotá-Cartagena' },
  { id: '20', vendor: 'DIAN Aduanas', invoiceNumber: 'DIAN-2024-047', issueDate: '2026-05-08', dueDate: '2026-06-08', amount: 1025, currency: 'USD', category: 'Customs', status: 'Pending', notes: 'Trámite aduanero importación' },
];

function loadInvoices(): Invoice[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return seedInvoices;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [filters, setFilters] = useState<FilterState>({ status: 'All', vendor: '', dateFrom: '', dateTo: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

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
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }, []);

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
  };
}

export type Currency = 'USD' | 'EUR';

export interface StatusHistoryEntry {
  status: Status;
  date: string;
  updatedBy: string;
  note: string;
}

export interface Invoice {
  id: string;
  vendor: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  amount: number;
  currency: Currency;
  category: Category;
  status: Status;
  notes: string;
  paidDate?: string;
  pdfAttachment?: string;
  pdfName?: string;
  lastUpdatedBy: string;
  disputeReason: string | null;
  statusHistory: StatusHistoryEntry[];
}

export interface VendorDocument {
  id: string;
  vendor: string;
  pdfAttachment: string;
  pdfName: string;
  uploadDate: string;
}

export type Status = 'Pendiente' | 'Aprobada' | 'Pagada' | 'Vencida' | 'En Disputa' | 'Esperando Soporte';
export type Category = 'Ocean Freight' | 'Air Freight' | 'Customs' | 'Trucking' | 'Storage' | 'Other';

export type View = 'dashboard' | 'invoices' | 'aging' | 'vendors' | 'documents';

export interface FilterState {
  status: Status | 'All';
  vendor: string;
  dateFrom: string;
  dateTo: string;
}

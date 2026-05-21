export type Currency = 'USD' | 'EUR';

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
}

export interface VendorDocument {
  id: string;
  vendor: string;
  pdfAttachment: string;
  pdfName: string;
  uploadDate: string;
}

export type Status = 'Pending' | 'Approved' | 'Paid' | 'Overdue';
export type Category = 'Ocean Freight' | 'Air Freight' | 'Customs' | 'Trucking' | 'Storage' | 'Other';

export type View = 'dashboard' | 'invoices' | 'aging' | 'vendors' | 'documents';

export interface FilterState {
  status: Status | 'All';
  vendor: string;
  dateFrom: string;
  dateTo: string;
}

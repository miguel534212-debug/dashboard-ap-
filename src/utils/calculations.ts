import type { Invoice, Status, Category, Currency } from '../types/invoice';

export function daysOverdue(dueDate: string | undefined): number {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const config: Record<Currency, { locale: string; currency: string; digits: number }> = {
    USD: { locale: 'en-US', currency: 'USD', digits: 2 },
    EUR: { locale: 'de-DE', currency: 'EUR', digits: 2 },
  };
  const c = config[currency];
  return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.currency, minimumFractionDigits: c.digits }).format(amount);
}

export function isOverdue(dueDate: string | undefined): boolean {
  return !dueDate ? false : daysOverdue(dueDate) > 0;
}

export function categoryColor(cat: Category): string {
  const colors: Record<Category, string> = {
    'Ocean Freight': '#3B82F6',
    'Air Freight': '#8B5CF6',
    'Customs': '#F59E0B',
    'Trucking': '#10B981',
    'Storage': '#EC4899',
    'Other': '#6B7280',
  };
  return colors[cat] || '#6B7280';
}

export function statusBadgeClass(status: Status): string {
  switch (status) {
    case 'Pagada': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Aprobada': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Pendiente': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Vencida': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'En Disputa': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'Esperando Soporte': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  }
}

export const statusColors: Record<Status, string> = {
  Pendiente: '#F59E0B',
  Aprobada: '#3B82F6',
  Pagada: '#10B981',
  Vencida: '#EF4444',
  'En Disputa': '#F97316',
  'Esperando Soporte': '#8B5CF6',
};

export interface KPI {
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  paidThisMonth: number;
  avgPaymentDelay: number;
}

export function computeKPI(invoices: Invoice[]): KPI {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const pending = invoices.filter(i => i.status === 'Pendiente' || i.status === 'Vencida' || i.status === 'En Disputa' || i.status === 'Esperando Soporte');
  const pendingCount = pending.length;
  const pendingAmount = pending.reduce((s, i) => s + i.amount, 0);

  const overdue = invoices.filter(i => i.status === 'Vencida' || (i.status === 'Pendiente' && isOverdue(i.dueDate)));
  const overdueCount = overdue.length;
  const overdueAmount = overdue.reduce((s, i) => s + i.amount, 0);

  const paidThisMonth = invoices
    .filter(i => i.status === 'Pagada' && i.paidDate && i.paidDate >= monthStart)
    .reduce((s, i) => s + i.amount, 0);

  const paidInvoices = invoices.filter(i => i.status === 'Pagada' && i.paidDate && i.dueDate);
  const delays = paidInvoices.map(i => {
    const due = new Date(i.dueDate!);
    const paid = new Date(i.paidDate!);
    return Math.max(0, Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  });
  const avgPaymentDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;

  return { pendingCount, pendingAmount, overdueCount, overdueAmount, paidThisMonth, avgPaymentDelay };
}

export interface AgingBucket {
  label: string;
  min: number;
  max: number;
  color: string;
  invoices: Invoice[];
  total: number;
}

export function computeAging(invoices: Invoice[]): AgingBucket[] {
  const overdueInvoices = invoices.filter(i => i.status !== 'Pagada' && isOverdue(i.dueDate));
  const currentInvoices = invoices.filter(i => i.status !== 'Pagada' && !isOverdue(i.dueDate));

  const buckets: AgingBucket[] = [
    { label: 'Al día', min: 0, max: 0, color: '#10B981', invoices: currentInvoices, total: currentInvoices.reduce((s, i) => s + i.amount, 0) },
    { label: '1–30 días', min: 1, max: 30, color: '#F59E0B', invoices: [], total: 0 },
    { label: '31–60 días', min: 31, max: 60, color: '#F97316', invoices: [], total: 0 },
    { label: '61–90 días', min: 61, max: 90, color: '#EF4444', invoices: [], total: 0 },
    { label: '90+ días', min: 91, max: Infinity, color: '#991B1B', invoices: [], total: 0 },
  ];

  for (const inv of overdueInvoices) {
    const d = daysOverdue(inv.dueDate);
    const bucket = buckets.find(b => d >= b.min && d <= b.max) || buckets[buckets.length - 1];
    bucket.invoices.push(inv);
    bucket.total += inv.amount;
  }

  return buckets;
}

export function computeMonthlyCategoryTotals(invoices: Invoice[]): { month: string; [key: string]: string | number }[] {
  const categories: Category[] = ['Ocean Freight', 'Air Freight', 'Customs', 'Trucking', 'Storage', 'Other'];
  const now = new Date();
  const months: { month: string; data: Record<string, number> }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    const data: Record<string, number> = {};
    for (const cat of categories) data[cat] = 0;

    for (const inv of invoices) {
      const invMonth = inv.issueDate.slice(0, 7);
      if (invMonth === key) {
        data[inv.category] += inv.amount;
      }
    }
    months.push({ month: label, data });
  }

  return months.map(m => {
    const row: { month: string; [key: string]: string | number } = { month: m.month };
    for (const cat of categories) row[cat] = m.data[cat];
    return row;
  });
}

export function computeTopVendors(invoices: Invoice[]): { vendor: string; total: number; count: number }[] {
  const grouped = new Map<string, { total: number; count: number }>();
  for (const inv of invoices) {
    const g = grouped.get(inv.vendor) || { total: 0, count: 0 };
    g.total += inv.amount;
    g.count += 1;
    grouped.set(inv.vendor, g);
  }
  return Array.from(grouped.entries())
    .map(([vendor, data]) => ({ vendor, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

export function computeMonthlySpendTrend(invoices: Invoice[]): { month: string; total: number; paid: number; pending: number }[] {
  const now = new Date();
  const months: { month: string; total: number; paid: number; pending: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    let total = 0, paid = 0, pending = 0;

    for (const inv of invoices) {
      if (inv.issueDate.slice(0, 7) === key) {
        total += inv.amount;
        if (inv.status === 'Pagada') paid += inv.amount;
        else pending += inv.amount;
      }
    }
    months.push({ month: label, total, paid, pending });
  }

  return months;
}

export function computeVendorStats(invoices: Invoice[]) {
  const grouped = new Map<string, { total: number; invoices: Invoice[]; categories: Set<Category> }>();
  for (const inv of invoices) {
    const g = grouped.get(inv.vendor) || { total: 0, invoices: [], categories: new Set<Category>() };
    g.total += inv.amount;
    g.invoices.push(inv);
    g.categories.add(inv.category);
    grouped.set(inv.vendor, g);
  }

  return Array.from(grouped.entries()).map(([vendor, data]) => {
    const paidInvs = data.invoices.filter(i => i.status === 'Pagada' && i.paidDate && i.dueDate);
    const delays = paidInvs.map(i => {
      const due = new Date(i.dueDate!);
      const paid = new Date(i.paidDate!);
      return Math.max(0, Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    });
    const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
    const mainCategory = data.categories.values().next().value || 'Other';

    return {
      vendor,
      totalBilled: data.total,
      invoiceCount: data.invoices.length,
      avgPaymentDelay: avgDelay,
      category: mainCategory,
    };
  }).sort((a, b) => b.totalBilled - a.totalBilled);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

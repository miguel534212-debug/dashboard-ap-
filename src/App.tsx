import { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { KPICards } from './components/KPICards';
import { InvoiceTable } from './components/InvoiceTable';
import { InvoiceModal } from './components/InvoiceModal';
import { AgingReport } from './components/AgingReport';
import { Charts } from './components/Charts';
import { VendorList } from './components/VendorList';
import { useInvoices } from './hooks/useInvoices';
import { computeKPI, computeAging, computeVendorStats } from './utils/calculations';
import type { View, Invoice } from './types/invoice';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const {
    invoices, filteredInvoices, filters, setFilters,
    showModal, setShowModal, editingInvoice, setEditingInvoice,
    addInvoice, updateInvoice, deleteInvoice, markStatus,
  } = useInvoices();

  const kpi = useMemo(() => computeKPI(invoices), [invoices]);
  const agingBuckets = useMemo(() => computeAging(invoices), [invoices]);
  const vendorStats = useMemo(() => computeVendorStats(invoices), [invoices]);
  const existingVendors = useMemo(() => [...new Set(invoices.map(i => i.vendor))], [invoices]);

  const handleSave = (inv: Invoice) => {
    if (editingInvoice) updateInvoice(inv);
    else addInvoice(inv);
    setShowModal(false);
    setEditingInvoice(null);
  };

  const handleEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingInvoice(null);
    setShowModal(true);
  };

  return (
    <div className="flex h-screen bg-[#0F172A]">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-white text-xl font-bold">Panel de Control</h1>
                <span className="text-gray-400 text-sm">Actualizado en tiempo real</span>
              </div>
              <KPICards kpi={kpi} />
              <Charts invoices={invoices} />
            </div>
          )}

          {currentView === 'invoices' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-white text-xl font-bold">Gestión de Facturas</h1>
              </div>
              <InvoiceTable
                invoices={filteredInvoices}
                filters={filters}
                onFilterChange={setFilters}
                onEdit={handleEdit}
                onDelete={deleteInvoice}
                onMarkStatus={markStatus}
                onAdd={handleAdd}
              />
            </div>
          )}

          {currentView === 'aging' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-white text-xl font-bold">Reporte de Vencimiento</h1>
              </div>
              <AgingReport buckets={agingBuckets} />
            </div>
          )}

          {currentView === 'vendors' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-white text-xl font-bold">Directorio de Proveedores</h1>
              </div>
              <VendorList vendors={vendorStats} />
            </div>
          )}
        </div>
      </main>

      <InvoiceModal
        open={showModal}
        editingInvoice={editingInvoice}
        existingVendors={existingVendors}
        onClose={() => { setShowModal(false); setEditingInvoice(null); }}
        onSave={handleSave}
      />
    </div>
  );
}

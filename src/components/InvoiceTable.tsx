import type { Invoice, FilterState, Status } from '../types/invoice';
import { daysOverdue, formatCOP, statusBadgeClass, categoryColor } from '../utils/calculations';

interface InvoiceTableProps {
  invoices: Invoice[];
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  onEdit: (inv: Invoice) => void;
  onDelete: (id: string) => void;
  onMarkStatus: (id: string, status: Status) => void;
  onAdd: () => void;
}

const statuses: Status[] = ['Pending', 'Approved', 'Paid', 'Overdue'];

export function InvoiceTable({ invoices, filters, onFilterChange, onEdit, onDelete, onMarkStatus, onAdd }: InvoiceTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-lg font-semibold">Facturas</h2>
        <button onClick={onAdd} className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Factura
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filters.status} onChange={e => onFilterChange({ ...filters, status: e.target.value as Status | 'All' })}
          className="bg-[#1E293B] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]">
          <option value="All">Todos los estados</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input type="text" value={filters.vendor} onChange={e => onFilterChange({ ...filters, vendor: e.target.value })}
          placeholder="Buscar proveedor..." className="bg-[#1E293B] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6] placeholder-gray-500 w-48" />

        <input type="date" value={filters.dateFrom} onChange={e => onFilterChange({ ...filters, dateFrom: e.target.value })}
          className="bg-[#1E293B] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]" />

        <input type="date" value={filters.dateTo} onChange={e => onFilterChange({ ...filters, dateTo: e.target.value })}
          className="bg-[#1E293B] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1E293B] border-b border-gray-700/50">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Factura</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Proveedor</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Emisión</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Vence</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Valor COP</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Categoría</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Días vencido</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-gray-500">No hay facturas que coincidan con los filtros</td></tr>
            )}
            {invoices.map(inv => {
              const days = daysOverdue(inv.dueDate);
              return (
                <tr key={inv.id} className="border-b border-gray-700/30 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.vendor}</td>
                  <td className="px-4 py-3 text-gray-400">{inv.issueDate}</td>
                  <td className="px-4 py-3 text-gray-400">{inv.dueDate}</td>
                  <td className="px-4 py-3 text-right text-gray-200 font-mono">{formatCOP(inv.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor(inv.category) }} />
                      {inv.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(inv.status)}`}>
                      {inv.status === 'Pending' ? 'Pendiente' : inv.status === 'Approved' ? 'Aprobado' : inv.status === 'Paid' ? 'Pagado' : 'Vencido'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${days > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {days > 0 ? `${days}d` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status !== 'Paid' && (
                        <>
                          {inv.status !== 'Approved' && (
                            <button onClick={() => onMarkStatus(inv.id, 'Approved')} title="Aprobar" className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          )}
                          <button onClick={() => onMarkStatus(inv.id, 'Paid')} title="Marcar pagado" className="p-1.5 text-gray-500 hover:text-emerald-400 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </>
                      )}
                      <button onClick={() => onEdit(inv)} title="Editar" className="p-1.5 text-gray-500 hover:text-[#3B82F6] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => onDelete(inv.id)} title="Eliminar" className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {invoices.length} factura{invoices.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

import { formatCOP } from '../utils/calculations';

interface VendorStats {
  vendor: string;
  totalBilled: number;
  invoiceCount: number;
  avgPaymentDelay: number;
  category: string;
}

interface VendorListProps {
  vendors: VendorStats[];
}

export function VendorList({ vendors }: VendorListProps) {
  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Directorio de Proveedores</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1E293B] border-b border-gray-700/50">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Proveedor</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Categoría</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Total Facturado</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Facturas</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Retraso Promedio</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">No hay proveedores registrados</td></tr>
            )}
            {vendors.map((v) => (
              <tr key={v.vendor} className="border-b border-gray-700/30 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{v.vendor}</td>
                <td className="px-4 py-3 text-gray-300">{v.category}</td>
                <td className="px-4 py-3 text-right text-gray-200 font-mono">{formatCOP(v.totalBilled)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{v.invoiceCount}</td>
                <td className={`px-4 py-3 text-right font-mono ${v.avgPaymentDelay > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {v.avgPaymentDelay > 0 ? `${v.avgPaymentDelay} días` : '0 días'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-gray-500">{vendors.length} proveedor{vendors.length !== 1 ? 'es' : ''}</div>
    </div>
  );
}

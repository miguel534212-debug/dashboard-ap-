import { formatCOP } from '../utils/calculations';
import type { AgingBucket } from '../utils/calculations';

interface AgingReportProps {
  buckets: AgingBucket[];
}

export function AgingReport({ buckets }: AgingReportProps) {
  const total = buckets.reduce((s, b) => s + b.total, 0);
  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Reporte de Vencimiento</h2>
      <div className="space-y-2">
        {buckets.map(b => {
          const pct = total > 0 ? (b.total / total) * 100 : 0;
          return (
            <div key={b.label} className="bg-[#1E293B] border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="text-white text-sm font-medium">{b.label}</span>
                  <span className="text-gray-400 text-xs bg-[#0F172A] px-2 py-0.5 rounded-full">
                    {b.invoices.length} factura{b.invoices.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-white font-mono font-semibold">{formatCOP(b.total)}</span>
              </div>
              <div className="w-full bg-[#0F172A] rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: b.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

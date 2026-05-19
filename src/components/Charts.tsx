import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, BarChart } from 'recharts';
import { useMemo } from 'react';
import { computeTopVendors, computeMonthlySpendTrend, formatCurrency } from '../utils/calculations';
import type { Invoice } from '../types/invoice';

interface ChartsProps {
  invoices: Invoice[];
}

export function Charts({ invoices }: ChartsProps) {
  const topVendors = useMemo(() => computeTopVendors(invoices), [invoices]);
  const trendData = useMemo(() => computeMonthlySpendTrend(invoices), [invoices]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-[#1E293B] border border-gray-600 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-gray-300 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {formatCurrency(p.value, 'USD')}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#1E293B] border border-gray-700/50 rounded-xl p-5">
        <h3 className="text-white text-sm font-semibold mb-4">Top 10 Proveedores</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topVendors} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
            <YAxis type="category" dataKey="vendor" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#1E293B] border border-gray-700/50 rounded-xl p-5">
        <h3 className="text-white text-sm font-semibold mb-4">Tendencia de Gasto AP</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            <Line type="monotone" dataKey="total" name="Total" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
            <Line type="monotone" dataKey="paid" name="Pagado" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
            <Line type="monotone" dataKey="pending" name="Pendiente" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

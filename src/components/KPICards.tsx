import { formatCurrency } from '../utils/calculations';
import type { KPI } from '../utils/calculations';

interface KPICardsProps {
  kpi: KPI;
}

export function KPICards({ kpi }: KPICardsProps) {
  const cards = [
    {
      title: 'Facturas Pendientes',
      value: kpi.pendingCount,
      sub: formatCurrency(kpi.pendingAmount, 'USD'),
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    {
      title: 'Facturas Vencidas',
      value: kpi.overdueCount,
      sub: formatCurrency(kpi.overdueAmount, 'USD'),
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      title: 'Pagado Este Mes',
      value: formatCurrency(kpi.paidThisMonth, 'USD'),
      sub: '',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Retraso Promedio',
      value: `${kpi.avgPaymentDelay} días`,
      sub: '',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.title} className={`${card.bg} ${card.border} border rounded-xl p-5`}>
          <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">{card.title}</div>
          <div className={`${card.color} text-2xl font-bold`}>{card.value}</div>
          {card.sub && <div className="text-gray-400 text-sm mt-1">{card.sub}</div>}
        </div>
      ))}
    </div>
  );
}

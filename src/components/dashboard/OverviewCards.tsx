import { Truck, MapPin, Calendar, ArrowLeftRight } from 'lucide-react';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function OverviewCards({ result }: Props) {
  const cards = [
    {
      label: 'Spoorkranen',
      value: result.totalCranes,
      icon: Truck,
      color: 'bg-cfe-green/10 text-cfe-green',
      iconBg: 'bg-cfe-green',
    },
    {
      label: 'Locaties',
      value: result.totalLocations,
      icon: MapPin,
      color: 'bg-cfe-blue/10 text-cfe-blue',
      iconBg: 'bg-cfe-blue',
    },
    {
      label: 'Periode',
      value: `${result.periodStart.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} — ${result.periodEnd.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      icon: Calendar,
      color: 'bg-cfe-purple/10 text-cfe-purple',
      iconBg: 'bg-cfe-purple',
      isText: true,
    },
    {
      label: 'Transporten',
      value: result.totalTransports,
      icon: ArrowLeftRight,
      color: 'bg-cfe-teal/10 text-cfe-teal',
      iconBg: 'bg-cfe-teal',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow animate-fade-in-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</p>
              <p className={`mt-1 font-bold ${card.isText ? 'text-base' : 'text-2xl'} text-slate-800`}>
                {card.value}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shadow-sm`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

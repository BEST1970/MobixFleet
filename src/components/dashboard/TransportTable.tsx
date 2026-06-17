import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

type SortKey = 'crane' | 'date' | 'from' | 'to';

export function TransportTable({ result }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    const data = [...result.transports];
    const dir = sortAsc ? 1 : -1;
    data.sort((a, b) => {
      switch (sortKey) {
        case 'crane': return dir * a.crane.localeCompare(b.crane);
        case 'date': return dir * a.date.localeCompare(b.date);
        case 'from': return dir * a.fromLabel.localeCompare(b.fromLabel);
        case 'to': return dir * a.toLabel.localeCompare(b.toLabel);
        default: return 0;
      }
    });
    return data;
  }, [result.transports, sortKey, sortAsc]);

  // Route summary
  const routeSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of result.transports) {
      const key = `${t.fromLabel} → ${t.toLabel}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [result.transports]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Route summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Top Routes</h3>
        <div className="space-y-2">
          {routeSummary.map(([route, count], i) => (
            <div key={route} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cfe-blue/10 text-cfe-blue text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <span className="text-slate-600">{route}</span>
              </div>
              <span className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-0.5 rounded-lg text-xs">{count}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-base font-semibold text-slate-800">Alle Transporten</h3>
          <p className="text-xs text-slate-400 mt-0.5">{result.totalTransports} locatiewissels gedetecteerd</p>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-3 cursor-pointer hover:text-slate-600" onClick={() => handleSort('crane')}>
                  <span className="flex items-center gap-1">Kraan <SortIcon k="crane" /></span>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:text-slate-600" onClick={() => handleSort('date')}>
                  <span className="flex items-center gap-1">Datum <SortIcon k="date" /></span>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:text-slate-600" onClick={() => handleSort('from')}>
                  <span className="flex items-center gap-1">Van <SortIcon k="from" /></span>
                </th>
                <th className="px-6 py-3"></th>
                <th className="px-6 py-3 cursor-pointer hover:text-slate-600" onClick={() => handleSort('to')}>
                  <span className="flex items-center gap-1">Naar <SortIcon k="to" /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-700">{t.crane}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(t.date).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{t.fromLabel}</td>
                  <td className="px-6 py-3 text-slate-300"><ArrowRight className="w-4 h-4" /></td>
                  <td className="px-6 py-3 text-slate-600">{t.toLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

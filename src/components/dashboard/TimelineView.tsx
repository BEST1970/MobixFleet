import { useState, useMemo } from 'react';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

const COLORS = [
  '#6EB550', '#2455A2', '#00A4A8', '#6F65AA', '#F59E0B',
  '#EF4444', '#58B3E6', '#94C04C', '#313C90', '#008C8A',
  '#1A3F81', '#00833D', '#283375', '#12A03C',
];

export function TimelineView({ result }: Props) {
  const cranes = useMemo(
    () => [...new Set(result.craneDays.map(cd => cd.crane))].sort(),
    [result.craneDays]
  );
  const [selectedCrane, setSelectedCrane] = useState(cranes[0] || '');

  const craneDays = useMemo(
    () => result.craneDays.filter(cd => cd.crane === selectedCrane),
    [result.craneDays, selectedCrane]
  );

  // Build location color map
  const locationColors = useMemo(() => {
    const locations = [...new Set(craneDays.map(cd => cd.dominantClusterLabel))];
    const map = new Map<string, string>();
    locations.forEach((loc, i) => map.set(loc, COLORS[i % COLORS.length]));
    return map;
  }, [craneDays]);

  // Generate all dates in the period
  const allDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(result.periodStart);
    const end = new Date(result.periodEnd);
    const d = new Date(start);
    while (d <= end) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [result.periodStart, result.periodEnd]);

  const dayMap = useMemo(() => {
    const map = new Map<string, typeof craneDays[0]>();
    for (const cd of craneDays) map.set(cd.date, cd);
    return map;
  }, [craneDays]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Tijdlijn per Kraan</h3>
          <p className="text-xs text-slate-400 mt-0.5">Per dag de dominante locatie</p>
        </div>
        <select
          value={selectedCrane}
          onChange={(e) => setSelectedCrane(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cfe-green/30 focus:border-cfe-green"
        >
          {cranes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[...locationColors.entries()].map(([loc, color]) => (
          <span key={loc} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }}></span>
            {loc}
          </span>
        ))}
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-0.5 min-w-max">
          {allDates.map(date => {
            const cd = dayMap.get(date);
            const isWeekend = [0, 6].includes(new Date(date).getDay());
            return (
              <div key={date} className="flex flex-col items-center" style={{ minWidth: '18px' }}>
                <div
                  className={`w-4 h-8 rounded-sm transition-colors ${!cd ? (isWeekend ? 'bg-slate-100' : 'bg-slate-50') : ''}`}
                  style={cd ? { backgroundColor: locationColors.get(cd.dominantClusterLabel) || '#94a3b8' } : undefined}
                  title={cd ? `${date}: ${cd.dominantClusterLabel} (${cd.activeHours.toFixed(1)}u)` : `${date}: geen data`}
                />
                {new Date(date).getDate() === 1 && (
                  <span className="text-[8px] text-slate-400 mt-1">
                    {new Date(date).toLocaleDateString('nl-BE', { month: 'short' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

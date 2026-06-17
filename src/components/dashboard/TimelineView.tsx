import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

  // Build location color map for ALL locations
  const locationColors = useMemo(() => {
    const locations = [...new Set(result.craneDays.map(cd => cd.dominantClusterLabel))].sort();
    const map = new Map<string, string>();
    locations.forEach((loc, i) => map.set(loc, COLORS[i % COLORS.length]));
    return map;
  }, [result.craneDays]);

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

  // Group dates by month
  const months = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of allDates) {
      const dObj = new Date(d);
      // Format like "januari 2024"
      const monthKey = dObj.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' });
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey)!.push(d);
    }
    return map;
  }, [allDates]);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: Date;
    crane: string;
    cd: typeof result.craneDays[0] | undefined;
  } | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Tijdlijn Alle Kranen</h3>
          <p className="text-xs text-slate-400 mt-0.5">Vind kansen om vloot-inzet samen te voegen</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[...locationColors.entries()].map(([loc, color]) => (
          <span key={loc} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }}></span>
            {loc}
          </span>
        ))}
      </div>

      {/* Timeline track grouped by month */}
      <div className="overflow-x-auto no-scrollbar pb-4 relative">
        <div className="min-w-max">
          
          {/* Header Row: Months and Days */}
          <div className="flex items-end mb-3">
            <div className="w-32 flex-shrink-0 sticky left-0 bg-white z-20"></div>
            <div className="flex gap-8">
              {[...months.entries()].map(([monthLabel, days]) => (
                <div key={monthLabel} className="flex flex-col">
                  <div className="text-xs font-semibold text-slate-500 mb-2 pl-1 border-l-2 border-slate-200 capitalize">
                    {monthLabel}
                  </div>
                  <div className="flex gap-1">
                    {days.map(date => {
                      const dObj = new Date(date);
                      const dayNum = dObj.getDate();
                      return (
                        <div key={date} className="w-5 flex justify-center">
                          {(dayNum === 1 || dayNum % 5 === 0) ? (
                            <span className="text-[10px] text-slate-400 font-medium">{dayNum}</span>
                          ) : (
                            <span className="text-[10px] text-transparent">{dayNum}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crane Rows */}
          <div className="space-y-1">
            {cranes.map(crane => {
              const cDays = result.craneDays.filter(cd => cd.crane === crane);
              const dayMap = new Map<string, typeof cDays[0]>();
              for (const cd of cDays) dayMap.set(cd.date, cd);

              return (
                <div key={crane} className="flex items-center group">
                  {/* Sticky Crane Name */}
                  <div className="w-32 flex-shrink-0 sticky left-0 bg-white/95 backdrop-blur-sm z-10 py-1 font-medium text-xs text-slate-700 truncate pr-4 group-hover:text-cfe-blue transition-colors">
                    {crane}
                  </div>
                  
                  {/* Crane Timeline */}
                  <div className="flex gap-8">
                    {[...months.entries()].map(([monthLabel, days]) => (
                      <div key={monthLabel} className="flex gap-1">
                        {days.map(date => {
                          const cd = dayMap.get(date);
                          const dObj = new Date(date);
                          const isWeekend = [0, 6].includes(dObj.getDay());
                          
                          return (
                            <div 
                              key={date} 
                              className={`w-5 h-6 rounded-sm transition-all duration-200 hover:scale-125 hover:shadow-md cursor-default z-0 hover:z-20
                                ${!cd ? (isWeekend ? 'bg-slate-100' : 'bg-slate-50') : ''}`}
                              style={cd ? { backgroundColor: locationColors.get(cd.dominantClusterLabel) || '#94a3b8' } : undefined}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 8,
                                  date: dObj,
                                  crane,
                                  cd
                                });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Portal Tooltip */}
      {tooltip && createPortal(
        <div 
          className="fixed z-[9999] w-max max-w-[200px] bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-slate-200 mb-1 border-b border-slate-600 pb-1 flex justify-between gap-4">
            <span>{tooltip.crane}</span>
            <span className="text-slate-400 font-normal">
              {tooltip.date.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          {tooltip.cd ? (
            <>
              <div className="font-medium text-white break-words mt-1">{tooltip.cd.dominantClusterLabel}</div>
              <div className="text-slate-400 mt-0.5">{tooltip.cd.activeHours.toFixed(1)} uur actief</div>
            </>
          ) : (
            <div className="text-slate-400 mt-1">Geen activiteit</div>
          )}
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>,
        document.body
      )}
    </div>
  );
}

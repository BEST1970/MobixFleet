import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { AnalysisResult, ExternalCraneDay } from '../../types';

interface Props {
  result: AnalysisResult;
  bcData?: ExternalCraneDay[] | null;
}

export function SimultaneousUsageChart({ result, bcData }: Props) {
  const chartData = useMemo(() => {
    // 1. Determine date range
    let minDate = new Date(result.periodStart);
    let maxDate = new Date(result.periodEnd);
    
    if (bcData && bcData.length > 0) {
      // Expand range if BC data has older/newer dates
      const bcDates = bcData.map(d => new Date(d.date).getTime());
      const minBc = new Date(Math.min(...bcDates));
      const maxBc = new Date(Math.max(...bcDates));
      if (minBc < minDate) minDate = minBc;
      if (maxBc > maxDate) maxDate = maxBc;
    }

    // 2. Initialize map with all dates in range
    const dates = new Map<string, { eigen: Set<string>; onderaannemer: Set<string> }>();
    const d = new Date(minDate);
    while (d <= maxDate) {
      dates.set(d.toISOString().slice(0, 10), { eigen: new Set(), onderaannemer: new Set() });
      d.setDate(d.getDate() + 1);
    }

    // 3. Add GPS data (all are considered 'Eigen' in this context unless overridden by BC, but GPS is GPS)
    for (const cd of result.craneDays) {
      if (dates.has(cd.date)) {
        dates.get(cd.date)!.eigen.add(cd.crane);
      }
    }

    // 4. Add BC data
    if (bcData) {
      for (const b of bcData) {
        if (dates.has(b.date)) {
          if (b.source === 'Eigen') {
            dates.get(b.date)!.eigen.add(b.crane);
          } else {
            dates.get(b.date)!.onderaannemer.add(b.crane);
          }
        }
      }
    }

    // 5. Build array
    const sortedDates = Array.from(dates.keys()).sort();
    return sortedDates.map(date => {
      const dObj = new Date(date);
      const eigenCount = dates.get(date)!.eigen.size;
      const onCount = dates.get(date)!.onderaannemer.size;
      return {
        date,
        label: dObj.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
        eigen: eigenCount,
        onderaannemer: onCount,
        total: eigenCount + onCount,
      };
    });
  }, [result.craneDays, result.periodStart, result.periodEnd, bcData]);

  const maxSimultaneous = useMemo(() => {
    return Math.max(...chartData.map(d => d.total), 0);
  }, [chartData]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-[400px]">
      <div className="mb-6 flex justify-between items-start shrink-0">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Simultane Inzet (Peak Demand)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Aantal actieve spoorkranen per dag</p>
        </div>
        <div className="bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 text-right">
          <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Maximum Piek</div>
          <div className="text-xl font-bold text-orange-700 leading-none mt-0.5">
            {maxSimultaneous} <span className="text-xs font-medium text-orange-500">kranen</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEigen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOnder" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              dy={10}
              minTickGap={30}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              allowDecimals={false}
            />
            <Tooltip 
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const dateStr = new Date(data.date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
                  return (
                    <div className="bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl">
                      <div className="font-semibold text-slate-200 mb-1 border-b border-slate-600 pb-1 capitalize">
                        {dateStr}
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span className="text-slate-300">Eigen vloot:</span>
                          </div>
                          <span className="font-medium">{data.eigen}</span>
                        </div>
                        {bcData && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                              <span className="text-slate-300">Onderaannemers:</span>
                            </div>
                            <span className="font-medium">{data.onderaannemer}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-slate-600">
                          <span className="font-semibold text-white">Totaal:</span>
                          <span className="font-bold text-white">{data.total}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              formatter={(value) => <span className="text-sm font-medium text-slate-600 ml-1">{value}</span>}
            />
            <Area 
              type="stepAfter" 
              dataKey="eigen" 
              name="Eigen Vloot"
              stackId="1"
              stroke="#ea580c" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorEigen)" 
              animationDuration={1000}
            />
            {bcData && (
              <Area 
                type="stepAfter" 
                dataKey="onderaannemer" 
                name="Onderaannemers"
                stackId="1"
                stroke="#0284c7" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorOnder)" 
                animationDuration={1000}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

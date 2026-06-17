import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function SimultaneousUsageChart({ result }: Props) {
  const chartData = useMemo(() => {
    const dates = new Map<string, Set<string>>();
    
    // Fill the dates map with all days in the period
    const start = new Date(result.periodStart);
    const end = new Date(result.periodEnd);
    const d = new Date(start);
    while (d <= end) {
      dates.set(d.toISOString().slice(0, 10), new Set());
      d.setDate(d.getDate() + 1);
    }

    // Add unique cranes to each date
    for (const cd of result.craneDays) {
      if (dates.has(cd.date)) {
        dates.get(cd.date)!.add(cd.crane);
      }
    }

    return Array.from(dates.entries()).map(([date, craneSet]) => {
      const dObj = new Date(date);
      return {
        date,
        label: dObj.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
        count: craneSet.size,
      };
    });
  }, [result.craneDays, result.periodStart, result.periodEnd]);

  const maxSimultaneous = useMemo(() => {
    return Math.max(...chartData.map(d => d.count), 0);
  }, [chartData]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="mb-6 flex justify-between items-start">
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

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span className="font-medium text-white">{data.count} kranen actief</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="stepAfter" 
              dataKey="count" 
              stroke="#f97316" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorCount)" 
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

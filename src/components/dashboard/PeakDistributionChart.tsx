import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalysisResult, ExternalCraneDay } from '../../types';

interface Props {
  result: AnalysisResult;
  bcData?: ExternalCraneDay[] | null;
}

export function PeakDistributionChart({ result, bcData }: Props) {
  const chartData = useMemo(() => {
    // 1. Calculate active cranes per day (same logic as SimultaneousUsageChart)
    let minDate = new Date(result.periodStart);
    let maxDate = new Date(result.periodEnd);
    
    if (bcData && bcData.length > 0) {
      const bcDates = bcData.map(d => new Date(d.date).getTime());
      const minBc = new Date(Math.min(...bcDates));
      const maxBc = new Date(Math.max(...bcDates));
      if (minBc < minDate) minDate = minBc;
      if (maxBc > maxDate) maxDate = maxBc;
    }

    const dates = new Map<string, { eigen: Set<string>; onderaannemer: Set<string> }>();
    const d = new Date(minDate);
    while (d <= maxDate) {
      dates.set(d.toISOString().slice(0, 10), { eigen: new Set(), onderaannemer: new Set() });
      d.setDate(d.getDate() + 1);
    }

    for (const cd of result.craneDays) {
      if (dates.has(cd.date)) dates.get(cd.date)!.eigen.add(cd.crane);
    }

    if (bcData) {
      for (const b of bcData) {
        if (dates.has(b.date)) {
          if (b.source === 'Eigen') dates.get(b.date)!.eigen.add(b.crane);
          else dates.get(b.date)!.onderaannemer.add(b.crane);
        }
      }
    }

    // Array of total counts per day
    const dailyTotals = Array.from(dates.values()).map(d => d.eigen.size + d.onderaannemer.size);
    const activeDailyTotals = dailyTotals.filter(t => t > 0);

    if (activeDailyTotals.length === 0) return { data: [], stats: { avg: 0, median: 0, p95: 0, max: 0 } };

    // 2. Build histogram data
    const maxTotal = Math.max(...activeDailyTotals);
    const counts = new Map<number, number>();
    for (const total of activeDailyTotals) {
      counts.set(total, (counts.get(total) || 0) + 1);
    }

    const data = [];
    for (let i = 1; i <= maxTotal; i++) {
      data.push({
        kranen: i,
        dagen: counts.get(i) || 0
      });
    }

    // 3. Calculate stats
    activeDailyTotals.sort((a, b) => a - b);
    const sum = activeDailyTotals.reduce((a, b) => a + b, 0);
    const avg = sum / activeDailyTotals.length;
    const median = activeDailyTotals[Math.floor(activeDailyTotals.length / 2)];
    const p95Index = Math.floor(activeDailyTotals.length * 0.95);
    const p95 = activeDailyTotals[p95Index];

    return { 
      data, 
      stats: { 
        avg: avg.toFixed(1), 
        median, 
        p95, 
        max: maxTotal 
      } 
    };
  }, [result.craneDays, result.periodStart, result.periodEnd, bcData]);

  if (chartData.data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-[400px]">
      <div className="mb-6 flex justify-between items-start shrink-0">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Normaalverdeling (Piek Frequentie)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Hoe vaak komt een bepaalde vlootgrootte voor?</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="kranen" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                allowDecimals={false}
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl">
                        <div className="font-semibold text-slate-200 mb-1 border-b border-slate-600 pb-1">
                          {data.kranen} {data.kranen === 1 ? 'kraan' : 'kranen'} tegelijk
                        </div>
                        <div className="font-medium text-white mt-1">
                          Voorkomen op <span className="text-cfe-green font-bold">{data.dagen}</span> dagen
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="dagen" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center text-xs text-slate-400 mt-1">Aantal kranen</div>
        </div>

        {/* Stats Sidebar */}
        <div className="w-32 shrink-0 flex flex-col justify-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gemiddeld</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{chartData.stats.avg}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mediaan</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{chartData.stats.median}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">95e Percentiel</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{chartData.stats.p95}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

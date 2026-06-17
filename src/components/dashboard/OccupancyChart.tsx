import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function OccupancyChart({ result }: Props) {
  const data = [...result.craneStats]
    .sort((a, b) => b.occupancyPct - a.occupancyPct)
    .map(cs => ({
      name: cs.crane,
      bezetting: cs.occupancyPct,
      dagen: cs.activeDays,
      totaal: cs.totalDays,
    }));

  const getBarColor = (pct: number) => {
    if (pct >= 60) return '#6EB550';  // green - well utilized
    if (pct >= 30) return '#F59E0B';  // amber - moderate
    return '#EF4444';                 // red - underutilized
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Bezetting per Kraan</h3>
          <p className="text-xs text-slate-400 mt-0.5">Percentage actieve dagen t.o.v. totale periode</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6EB550]"></span> ≥60%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> 30-60%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> &lt;30%</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} stroke="#94a3b8" />
          <YAxis type="category" dataKey="name" width={90} fontSize={11} stroke="#94a3b8" />
          <Tooltip
            formatter={(value: any, _name: any, props: any) => [
              `${value}% (${props.payload.dagen}/${props.payload.totaal} dagen)`,
              'Bezetting',
            ]}
            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Bar dataKey="bezetting" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.bezetting)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

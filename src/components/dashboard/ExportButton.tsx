import { Download, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { AnalysisResult } from '../../types';
import { exportCraneDaysCSV, exportTransportsCSV, exportOccupancyCSV } from '../../utils/export';

interface Props {
  result: AnalysisResult;
}

export function ExportButton({ result }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const exports = [
    { label: 'Kraandagen (CSV)', action: () => exportCraneDaysCSV(result) },
    { label: 'Transporten (CSV)', action: () => exportTransportsCSV(result) },
    { label: 'Bezetting (CSV)', action: () => exportOccupancyCSV(result) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-cfe-blue text-white text-sm font-semibold rounded-xl hover:bg-cfe-blue-dark transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        Exporteren
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-slate-100 shadow-lg py-1 min-w-[200px] animate-slide-down z-50">
          {exports.map(({ label, action }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

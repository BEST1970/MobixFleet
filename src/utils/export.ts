import type { AnalysisResult } from '../types';

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (s: string) => {
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCraneDaysCSV(result: AnalysisResult) {
  const headers = ['Kraan', 'Datum', 'Locatie', 'Actieve Uren'];
  const rows = result.craneDays.map(cd => [
    cd.crane,
    cd.date,
    cd.dominantClusterLabel,
    cd.activeHours.toFixed(1),
  ]);
  downloadFile(toCSV(headers, rows), 'kraandagen.csv', 'text/csv;charset=utf-8');
}

export function exportTransportsCSV(result: AnalysisResult) {
  const headers = ['Kraan', 'Datum', 'Van', 'Naar'];
  const rows = result.transports.map(t => [
    t.crane,
    t.date,
    t.fromLabel,
    t.toLabel,
  ]);
  downloadFile(toCSV(headers, rows), 'transporten.csv', 'text/csv;charset=utf-8');
}

export function exportOccupancyCSV(result: AnalysisResult) {
  const headers = ['Kraan', 'Actieve Dagen', 'Totale Dagen', 'Bezetting %', 'Transporten', 'Locaties'];
  const rows = result.craneStats.map(cs => [
    cs.crane,
    cs.activeDays.toString(),
    cs.totalDays.toString(),
    cs.occupancyPct.toString(),
    cs.transportCount.toString(),
    cs.locations.join('; '),
  ]);
  downloadFile(toCSV(headers, rows), 'bezetting.csv', 'text/csv;charset=utf-8');
}

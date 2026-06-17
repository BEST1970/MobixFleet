import * as XLSX from 'xlsx';
import type { RawSegment } from '../types';

/**
 * Extract short crane name from full vehicle description.
 * E.g. "SIGN SPWKR13 20T ATLAS 1404 BJ08 2DWN133 W.1140.K" → "SPWKR13"
 * Fallback: first two words
 */
function extractShortName(fullName: string): string {
  const match = fullName.match(/SPWKR\s*\d+/i);
  if (match) return match[0].replace(/\s+/g, '').toUpperCase();
  
  // Fallback for vehicles without SPWKR code
  // Try to find a meaningful short name
  const parts = fullName.trim().split(/\s+/);
  // Look for a name-like word (not TRCK, not numbers)
  const namePart = parts.find((p, i) => i > 0 && /^[A-Za-z]{3,}$/.test(p) && !['ATLAS', 'TRCK', 'CATN', 'SIGN'].includes(p.toUpperCase()));
  if (namePart) return namePart.toUpperCase();
  return parts.slice(0, 2).join(' ');
}

/**
 * Convert Excel serial number or Date to JS Date
 */
function toDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date
    return new Date((val - 25569) * 86400 * 1000);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Convert duration to seconds. Could be a Date (timedelta from openpyxl),
 * a number (fractional days), or a string like "HH:MM:SS".
 */
function toDurationSeconds(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') {
    // SheetJS returns duration as fractional days
    return Math.round(val * 86400);
  }
  if (typeof val === 'string') {
    const parts = val.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  }
  return 0;
}

export function parseExcelFile(data: ArrayBuffer): RawSegment[] {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  
  // Find the sheet
  const sheetName = workbook.SheetNames.find(n => 
    n.toLowerCase().includes('driving') || n.toLowerCase().includes('stationary')
  ) || workbook.SheetNames[0];
  
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  
  const segments: RawSegment[] = [];
  
  for (const row of rows) {
    const voertuig = row['Voertuig'] as string | null;
    const status = row['Status'] as string | null;
    
    // Filter out subtotal rows (Voertuig is empty) and non-data rows
    if (!voertuig || !status) continue;
    if (status !== 'Rijden' && status !== 'Stationair') continue;
    
    const van = toDate(row['Van']);
    const tot = toDate(row['Tot']);
    const stopLon = row['Stop Lengtegraad'] as number | null;
    const stopLat = row['Stop Breedtegraad'] as number | null;
    
    // Skip rows without essential data
    if (!van || !tot || stopLon == null || stopLat == null) continue;
    // Skip invalid coordinates
    if (stopLon === 0 && stopLat === 0) continue;
    
    const duurSeconds = Math.max(0, Math.round((tot.getTime() - van.getTime()) / 1000));
    
    segments.push({
      voertuig: voertuig.trim(),
      shortName: extractShortName(voertuig),
      status: status as 'Rijden' | 'Stationair',
      van,
      tot,
      duurSeconds,
      stopLon,
      stopLat,
      stopAdres: (row['Stop Adres'] as string) || '',
    });
  }
  
  // Sort by vehicle then by start time
  segments.sort((a, b) => {
    if (a.shortName !== b.shortName) return a.shortName.localeCompare(b.shortName);
    return a.van.getTime() - b.van.getTime();
  });
  
  return segments;
}

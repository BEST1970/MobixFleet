import * as XLSX from 'xlsx';
import type { ExternalCraneDay, CraneType } from '../types';

/**
 * Extract a short crane name from BC's Column12 field.
 * E.g. "SPWKR36 23T EVA ATLAS 1604 BJ15 2DWV908 W.1901.K" → "SPWKR36"
 *      "SPOORKRAAN HULSHOF 1" → "HULSHOF 1"
 */
function extractBCShortName(name: string): string {
  const trimmed = name.trim();
  const spwkrMatch = trimmed.match(/SPWKR\s*\d+/i);
  if (spwkrMatch) return spwkrMatch[0].replace(/\s+/g, '').toUpperCase();

  // For subcontractors: "SPOORKRAAN HULSHOF 1" → "HULSHOF 1"
  const subMatch = trimmed.match(/^SPOORKRAAN\s+(.+)/i);
  if (subMatch) return subMatch[1].trim();

  // For rupskraan etc.
  const rups = trimmed.match(/^RUPSKRAAN\s+(.+)/i);
  if (rups) return `RUPSKR ${rups[1].trim()}`;

  // Fallback: first meaningful word
  return trimmed.split(/\s+/).slice(0, 2).join(' ');
}

/**
 * Detect crane type from BC crane name.
 */
function extractBCCraneType(name: string): CraneType {
  if (/1604/i.test(name)) return '1604';
  if (/1404/i.test(name)) return '1404';
  return 'Overig';
}

/**
 * Detect if a crane is own or subcontractor.
 * Own cranes start with SPWKR, subcontractors start with SPOORKRAAN + company name.
 */
function detectSource(name: string): 'Eigen' | 'Onderaannemer' {
  const trimmed = name.trim().toUpperCase();
  if (trimmed.startsWith('SPWKR') || trimmed.startsWith('SPKR')) return 'Eigen';
  // SPOORKRAAN + company name = subcontractor
  return 'Onderaannemer';
}

/**
 * Get the Monday date for a given ISO year + week number.
 */
function getWeekMonday(year: number, week: number): Date {
  // Jan 4 is always in week 1 (ISO 8601)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 1=Mon..7=Sun
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const monday = new Date(mondayOfWeek1);
  monday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  return monday;
}

/**
 * Parse Business Central Excel file.
 * Format: Year, Week, ..., Monday-Sunday hours, ..., Column12 (crane name)
 * Header row is row 3 (0-indexed row 2).
 */
export function parseBCExcelFile(data: ArrayBuffer): ExternalCraneDay[] {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = (XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    header: 1, // Use array-based rows for flexibility
  }) as unknown) as unknown[][];

  // Find the header row (contains 'Year', 'Week', 'Monday', etc.)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (row && Array.isArray(row)) {
      const asStrings = row.map(c => String(c || '').toLowerCase());
      if (asStrings.includes('year') && asStrings.includes('week')) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    throw new Error('Kan de kolomkoppen (Year, Week) niet vinden in het BC-bestand.');
  }

  const headers = (rows[headerIdx] as unknown[]).map(c => String(c || ''));

  // Find column indices
  const yearIdx = headers.findIndex(h => h.toLowerCase() === 'year');
  const weekIdx = headers.findIndex(h => h.toLowerCase() === 'week');
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayIndices = dayNames.map(d => headers.findIndex(h => h.toLowerCase() === d));
  // Crane name is in the last column (Column12 / Column27)
  const craneIdx = headers.length - 1;

  const results: ExternalCraneDay[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || !Array.isArray(row)) continue;

    const yearVal = row[yearIdx];
    const weekVal = row[weekIdx];
    const craneName = row[craneIdx];

    if (!yearVal || !weekVal || !craneName) continue;

    const year = typeof yearVal === 'number' ? yearVal : parseInt(String(yearVal));
    const week = typeof weekVal === 'number' ? weekVal : parseInt(String(weekVal));
    if (isNaN(year) || isNaN(week) || year < 2000) continue;

    const craneStr = String(craneName).trim();
    if (!craneStr) continue;

    const shortName = extractBCShortName(craneStr);
    const craneType = extractBCCraneType(craneStr);
    const source = detectSource(craneStr);
    const monday = getWeekMonday(year, week);

    for (let d = 0; d < 7; d++) {
      const colIdx = dayIndices[d];
      if (colIdx === -1) continue;

      const hours = typeof row[colIdx] === 'number' ? row[colIdx] as number : parseFloat(String(row[colIdx] || '0'));
      if (isNaN(hours) || hours <= 0) continue;

      const date = new Date(monday);
      date.setDate(monday.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);

      results.push({
        crane: shortName,
        date: dateStr,
        hoursWorked: hours,
        source,
        craneType,
      });
    }
  }

  return results;
}

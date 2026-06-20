import type { Segment, Cluster, CraneDay, Transport, CraneStats, AnalysisResult, ClusterLabels, CraneType } from '../types';
import { haversineMeters } from './clustering';

/**
 * Format a date as YYYY-MM-DD
 */
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Merge midnight-split segments.
 * GeoDynamics splits segments at midnight. We rejoin consecutive segments
 * of the same crane at the same location if they abut around midnight.
 */
function mergeNightSplits(segments: Segment[]): Segment[] {
  // Sort by crane then time
  const sorted = [...segments].sort((a, b) => {
    if (a.shortName !== b.shortName) return a.shortName.localeCompare(b.shortName);
    return a.van.getTime() - b.van.getTime();
  });

  const merged: Segment[] = [];
  let current: Segment | null = null;

  for (const seg of sorted) {
    if (!current) {
      current = { ...seg };
      continue;
    }

    // Same crane, same cluster, and segments abut near midnight?
    const gap = seg.van.getTime() - current.tot.getTime();
    const nearMidnight = (
      (current.tot.getHours() === 23 && current.tot.getMinutes() >= 55) ||
      (current.tot.getHours() === 0 && current.tot.getMinutes() === 0)
    );
    const sameContext = 
      seg.shortName === current.shortName &&
      seg.clusterId === current.clusterId &&
      seg.clusterId !== -1;

    if (sameContext && nearMidnight && gap < 10 * 60 * 1000) {
      // Merge: extend current segment
      current.tot = seg.tot;
      current.duurSeconds += seg.duurSeconds;
    } else {
      merged.push(current);
      current = { ...seg };
    }
  }

  if (current) merged.push(current);
  return merged;
}

/**
 * Build CraneDay records: per crane, per day, dominant location and active hours.
 */
function buildCraneDays(
  segments: Segment[],
  clusterLabels: ClusterLabels,
  clusters: Cluster[]
): CraneDay[] {
  // Group by crane + date
  const groupMap = new Map<string, { clusterId: number; seconds: number }[]>();
  const craneTypeMap = new Map<string, CraneType>();

  for (const seg of segments) {
    const day = dateKey(seg.van);
    const key = `${seg.shortName}|${day}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push({ clusterId: seg.clusterId, seconds: seg.duurSeconds });
    if (!craneTypeMap.has(seg.shortName)) craneTypeMap.set(seg.shortName, seg.craneType);
  }

  const craneDays: CraneDay[] = [];
  const clusterLabelMap = new Map(clusters.map(c => [c.id, clusterLabels[c.id] || c.label]));

  for (const [key, entries] of groupMap) {
    const [crane, date] = key.split('|');

    // Sum time per cluster
    const clusterTime = new Map<number, number>();
    for (const e of entries) {
      clusterTime.set(e.clusterId, (clusterTime.get(e.clusterId) || 0) + e.seconds);
    }

    // Find dominant cluster (most time spent)
    let dominantCluster = -1;
    let maxTime = 0;
    for (const [cid, t] of clusterTime) {
      if (t > maxTime) { maxTime = t; dominantCluster = cid; }
    }

    const totalSeconds = entries.reduce((sum, e) => sum + e.seconds, 0);

    craneDays.push({
      crane,
      craneType: craneTypeMap.get(crane) || 'Overig',
      date,
      dominantClusterId: dominantCluster,
      dominantClusterLabel: dominantCluster === -1 ? 'Onbekend' : (clusterLabelMap.get(dominantCluster) || `Locatie ${dominantCluster + 1}`),
      activeHours: totalSeconds / 3600,
    });
  }

  // Sort by crane then date
  craneDays.sort((a, b) => {
    if (a.crane !== b.crane) return a.crane.localeCompare(b.crane);
    return a.date.localeCompare(b.date);
  });

  return craneDays;
}

/**
 * Detect transports: a crane's dominant location changes from one day to the next.
 */
function detectTransports(
  craneDays: CraneDay[],
  clusters: Cluster[]
): Transport[] {
  const transports: Transport[] = [];
  const byCrane = new Map<string, CraneDay[]>();

  for (const cd of craneDays) {
    if (!byCrane.has(cd.crane)) byCrane.set(cd.crane, []);
    byCrane.get(cd.crane)!.push(cd);
  }

  for (const [, days] of byCrane) {
    // Days are already sorted by date
    for (let i = 1; i < days.length; i++) {
      const prev = days[i - 1];
      const curr = days[i];

      // Skip if either is unknown
      if (prev.dominantClusterId === -1 || curr.dominantClusterId === -1) continue;

      if (prev.dominantClusterId !== curr.dominantClusterId) {
        const prevCluster = clusters.find(c => c.id === prev.dominantClusterId);
        const currCluster = clusters.find(c => c.id === curr.dominantClusterId);
        
        let distanceMeters = 0;
        let type: 'Dieplader' | 'Rijden' = 'Dieplader';

        if (prevCluster && currCluster) {
          distanceMeters = haversineMeters(
            prevCluster.centroidLat, prevCluster.centroidLon,
            currCluster.centroidLat, currCluster.centroidLon
          );
          // If distance is less than 5km, it's driving on its own tracks
          if (distanceMeters < 5000) {
            type = 'Rijden';
          }
        }

        transports.push({
          crane: curr.crane,
          craneType: curr.craneType,
          date: curr.date,
          fromClusterId: prev.dominantClusterId,
          fromLabel: prev.dominantClusterLabel,
          toClusterId: curr.dominantClusterId,
          toLabel: curr.dominantClusterLabel,
          type,
          distanceMeters,
        });
      }
    }
  }

  return transports;
}

/**
 * Compute per-crane statistics.
 */
function computeCraneStats(
  craneDays: CraneDay[],
  transports: Transport[],
  periodStart: Date,
  periodEnd: Date
): CraneStats[] {
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const byCrane = new Map<string, CraneDay[]>();
  for (const cd of craneDays) {
    if (!byCrane.has(cd.crane)) byCrane.set(cd.crane, []);
    byCrane.get(cd.crane)!.push(cd);
  }

  const transportsByCrane = new Map<string, number>();
  for (const t of transports) {
    if (t.type === 'Dieplader') {
      transportsByCrane.set(t.crane, (transportsByCrane.get(t.crane) || 0) + 1);
    }
  }

  const stats: CraneStats[] = [];
  for (const [crane, days] of byCrane) {
    const uniqueDates = new Set(days.map(d => d.date));
    const uniqueLocations = new Set(
      days.filter(d => d.dominantClusterId !== -1).map(d => d.dominantClusterLabel)
    );
    stats.push({
      crane,
      craneType: days[0]?.craneType || 'Overig',
      activeDays: uniqueDates.size,
      totalDays,
      occupancyPct: Math.round((uniqueDates.size / totalDays) * 100),
      transportCount: transportsByCrane.get(crane) || 0,
      locations: [...uniqueLocations],
    });
  }

  // Sort by occupancy ascending (underutilized first)
  stats.sort((a, b) => a.occupancyPct - b.occupancyPct);

  return stats;
}

/**
 * Run the complete analysis pipeline.
 */
export function runAnalysis(
  segments: Segment[],
  clusters: Cluster[],
  clusterLabels: ClusterLabels = {}
): AnalysisResult {
  // 1. Merge midnight splits
  const merged = mergeNightSplits(segments);

  // 2. Determine period
  const allDates = merged.map(s => s.van.getTime());
  const periodStart = new Date(Math.min(...allDates));
  const periodEnd = new Date(Math.max(...allDates));

  // 3. Build crane-day records
  const craneDays = buildCraneDays(merged, clusterLabels, clusters);

  // 4. Detect transports
  const transports = detectTransports(craneDays, clusters);

  // 5. Compute stats
  const craneStats = computeCraneStats(craneDays, transports, periodStart, periodEnd);

  return {
    segments: merged,
    clusters,
    craneDays,
    transports,
    craneStats,
    periodStart,
    periodEnd,
    totalCranes: craneStats.length,
    totalLocations: clusters.length,
    totalTransports: transports.filter(t => t.type === 'Dieplader').length,
  };
}

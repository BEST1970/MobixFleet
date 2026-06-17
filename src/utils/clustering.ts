import type { RawSegment, Segment, Cluster } from '../types';

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in meters */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

/**
 * DBSCAN clustering on GPS coordinates.
 * Returns cluster assignments (-1 = noise/unknown).
 */
function dbscan(
  points: { lat: number; lon: number }[],
  epsMeters: number,
  minPts: number = 2
): number[] {
  const n = points.length;
  const labels = new Array<number>(n).fill(-1); // -1 = unvisited/noise
  let clusterId = 0;

  // Pre-compute neighbor lists for efficiency
  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    const p = points[idx];
    for (let i = 0; i < n; i++) {
      if (haversineMeters(p.lat, p.lon, points[i].lat, points[i].lon) <= epsMeters) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue; // already processed

    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) {
      // Mark as noise (stays -1)
      continue;
    }

    // Start new cluster
    labels[i] = clusterId;
    const queue = [...neighbors.filter(j => j !== i)];
    const visited = new Set<number>([i]);

    while (queue.length > 0) {
      const j = queue.shift()!;
      if (visited.has(j)) continue;
      visited.add(j);

      if (labels[j] === -1) {
        labels[j] = clusterId; // was noise, now border point
      }
      if (labels[j] !== -1 && labels[j] !== clusterId) continue; // already in another cluster
      labels[j] = clusterId;

      const jNeighbors = regionQuery(j);
      if (jNeighbors.length >= minPts) {
        for (const k of jNeighbors) {
          if (!visited.has(k)) queue.push(k);
        }
      }
    }

    clusterId++;
  }

  return labels;
}

/**
 * Extract city name from address string.
 * E.g. "Smisstraat 52, 2800 Mechelen, BE" → "Mechelen"
 */
function extractCity(address: string): string {
  if (!address) return 'Onbekend';
  const parts = address.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    // Second part usually contains postal code + city
    const cityPart = parts[1] || parts[0];
    // Remove postal code (4 digits)
    const cityMatch = cityPart.replace(/^\d{4}\s*/, '').trim();
    if (cityMatch) return cityMatch;
  }
  return parts[0] || 'Onbekend';
}

/**
 * Find the most common value in an array.
 */
function mostCommon(arr: string[]): string {
  const counts = new Map<string, number>();
  for (const v of arr) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

export interface ClusteringResult {
  segments: Segment[];
  clusters: Cluster[];
}

/**
 * Main clustering function.
 * Takes raw segments, runs DBSCAN on unique stop coordinates,
 * and assigns each segment to a cluster.
 */
export function clusterLocations(
  rawSegments: RawSegment[],
  radiusMeters: number = 300
): ClusteringResult {
  // Collect unique stop coordinates
  const uniquePoints: { lat: number; lon: number; idx: number }[] = [];
  const pointMap = new Map<string, number>(); // "lat,lon" → index in uniquePoints
  
  for (let i = 0; i < rawSegments.length; i++) {
    const seg = rawSegments[i];
    const key = `${seg.stopLat.toFixed(6)},${seg.stopLon.toFixed(6)}`;
    if (!pointMap.has(key)) {
      pointMap.set(key, uniquePoints.length);
      uniquePoints.push({ lat: seg.stopLat, lon: seg.stopLon, idx: i });
    }
  }

  // Run DBSCAN on unique points
  const clusterLabels = dbscan(
    uniquePoints.map(p => ({ lat: p.lat, lon: p.lon })),
    radiusMeters,
    2
  );

  // Build a map from point key to cluster ID
  const keyToCluster = new Map<string, number>();
  for (let i = 0; i < uniquePoints.length; i++) {
    const p = uniquePoints[i];
    const key = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
    keyToCluster.set(key, clusterLabels[i]);
  }

  // Assign cluster IDs to all segments
  const segments: Segment[] = rawSegments.map(seg => {
    const key = `${seg.stopLat.toFixed(6)},${seg.stopLon.toFixed(6)}`;
    return { ...seg, clusterId: keyToCluster.get(key) ?? -1 };
  });

  // Build cluster metadata
  const clusterData = new Map<number, { lats: number[]; lons: number[]; cities: string[] }>();
  for (const seg of segments) {
    if (seg.clusterId === -1) continue;
    if (!clusterData.has(seg.clusterId)) {
      clusterData.set(seg.clusterId, { lats: [], lons: [], cities: [] });
    }
    const d = clusterData.get(seg.clusterId)!;
    d.lats.push(seg.stopLat);
    d.lons.push(seg.stopLon);
    d.cities.push(extractCity(seg.stopAdres));
  }

  const clusters: Cluster[] = [];
  for (const [id, data] of clusterData) {
    const centroidLat = data.lats.reduce((a, b) => a + b, 0) / data.lats.length;
    const centroidLon = data.lons.reduce((a, b) => a + b, 0) / data.lons.length;
    const city = mostCommon(data.cities.filter(c => c !== 'Onbekend' && c !== 'BE'));
    clusters.push({
      id,
      centroidLat,
      centroidLon,
      label: city || `Locatie ${id + 1}`,
      pointCount: data.lats.length,
      mostCommonCity: city || 'Onbekend',
    });
  }

  // Sort clusters by point count descending
  clusters.sort((a, b) => b.pointCount - a.pointCount);

  return { segments, clusters };
}

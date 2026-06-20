// Crane capacity type
export type CraneType = '1404' | '1604' | 'Overig';

// Raw row parsed from Excel
export interface RawSegment {
  voertuig: string;
  shortName: string;
  craneType: CraneType;
  status: 'Rijden' | 'Stationair';
  van: Date;
  tot: Date;
  duurSeconds: number;
  stopLon: number;
  stopLat: number;
  stopAdres: string;
}

// After clustering
export interface Segment extends RawSegment {
  clusterId: number;
}

export interface Cluster {
  id: number;
  centroidLat: number;
  centroidLon: number;
  label: string;
  pointCount: number;
  mostCommonCity: string;
}

// Per crane per day
export interface CraneDay {
  crane: string;
  craneType: CraneType;
  date: string; // YYYY-MM-DD
  dominantClusterId: number;
  dominantClusterLabel: string;
  activeHours: number;
}

// Transport = location change between consecutive days
export interface Transport {
  crane: string;
  craneType: CraneType;
  date: string;
  fromClusterId: number;
  fromLabel: string;
  toClusterId: number;
  toLabel: string;
  type: 'Dieplader' | 'Rijden';
  distanceMeters: number;
}

// Stats per crane
export interface CraneStats {
  crane: string;
  craneType: CraneType;
  activeDays: number;
  totalDays: number;
  occupancyPct: number;
  transportCount: number;
  locations: string[];
}

// Complete analysis result
export interface AnalysisResult {
  segments: Segment[];
  clusters: Cluster[];
  craneDays: CraneDay[];
  transports: Transport[];
  craneStats: CraneStats[];
  periodStart: Date;
  periodEnd: Date;
  totalCranes: number;
  totalLocations: number;
  totalTransports: number;
}

// Cluster label overrides stored in localStorage
export interface ClusterLabels {
  [clusterId: number]: string;
}

// Business Central: external crane day (onderaannemers + eigen kranen from BC)
export interface ExternalCraneDay {
  crane: string;
  date: string; // YYYY-MM-DD
  hoursWorked: number;
  source: 'Eigen' | 'Onderaannemer';
  craneType: CraneType;
}

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { RawSegment, Segment, Cluster, AnalysisResult, ClusterLabels } from '../types';
import { parseExcelFile } from '../utils/parseExcel';
import { clusterLocations } from '../utils/clustering';
import { runAnalysis } from '../utils/analysis';

interface AnalysisState {
  rawSegments: RawSegment[] | null;
  result: AnalysisResult | null;
  clusters: Cluster[];
  clusterLabels: ClusterLabels;
  radiusMeters: number;
  isLoading: boolean;
  fileName: string | null;
  error: string | null;
  loadFile: (data: ArrayBuffer, fileName: string) => void;
  setRadiusMeters: (r: number) => void;
  setClusterLabel: (clusterId: number, label: string) => void;
  reset: () => void;
}

const AnalysisContext = createContext<AnalysisState | null>(null);

const LABELS_KEY = 'mobixvh:clusterLabels';
const RADIUS_KEY = 'mobixvh:clusterRadius';
const RAW_DATA_KEY = 'mobixvh:rawData';

function loadLabels(): ClusterLabels {
  try {
    const stored = localStorage.getItem(LABELS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLabels(labels: ClusterLabels) {
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
}

function loadRawSegments(): RawSegment[] | null {
  try {
    const stored = localStorage.getItem(RAW_DATA_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as RawSegment[];
    // Revive dates
    for (const seg of parsed) {
      seg.van = new Date(seg.van);
      seg.tot = new Date(seg.tot);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [rawSegments, setRawSegments] = useState<RawSegment[] | null>(null);
  const [clusteredSegments, setClusteredSegments] = useState<Segment[] | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [clusterLabels, setClusterLabels] = useState<ClusterLabels>(loadLabels);
  const [radiusMeters, setRadiusMetersState] = useState(() => {
    const stored = localStorage.getItem(RADIUS_KEY);
    return stored ? Number(stored) : 300;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(() => localStorage.getItem('mobixvh:fileName'));
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Run clustering whenever rawSegments or radius changes
  const runClustering = useCallback((segments: RawSegment[], radius: number) => {
    const { segments: clustered, clusters: newClusters } = clusterLocations(segments, radius);
    setClusteredSegments(clustered);
    setClusters(newClusters);
    return { clustered, newClusters };
  }, []);

  // Run analysis whenever clustered segments or labels change
  const runFullAnalysis = useCallback((segs: Segment[], cls: Cluster[], labels: ClusterLabels) => {
    const analysisResult = runAnalysis(segs, cls, labels);
    setResult(analysisResult);
  }, []);

  // Initialize from storage on mount
  useEffect(() => {
    if (isInitialized) return;
    setIsInitialized(true);
    const initialSegments = loadRawSegments();
    if (initialSegments) {
      setIsLoading(true);
      // Small timeout so UI can render loading state if needed
      setTimeout(() => {
        setRawSegments(initialSegments);
        const { clustered, newClusters } = runClustering(initialSegments, radiusMeters);
        runFullAnalysis(clustered, newClusters, clusterLabels);
        setIsLoading(false);
      }, 50);
    }
  }, [isInitialized, radiusMeters, clusterLabels, runClustering, runFullAnalysis]);

  // Load file
  const loadFile = useCallback((data: ArrayBuffer, name: string) => {
    setIsLoading(true);
    setError(null);
    setFileName(name);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const segments = parseExcelFile(data);
        if (segments.length === 0) {
          setError('Geen geldige datarijen gevonden in het bestand.');
          setIsLoading(false);
          return;
        }
        setRawSegments(segments);
        localStorage.setItem(RAW_DATA_KEY, JSON.stringify(segments));
        localStorage.setItem('mobixvh:fileName', name);

        const { clustered, newClusters } = runClustering(segments, radiusMeters);
        runFullAnalysis(clustered, newClusters, clusterLabels);
        setIsLoading(false);
      } catch (e) {
        console.error('Parse error:', e);
        setError(`Fout bij het verwerken: ${e instanceof Error ? e.message : 'Onbekende fout'}`);
        setIsLoading(false);
      }
    }, 50);
  }, [radiusMeters, clusterLabels, runClustering, runFullAnalysis]);

  // Re-cluster when radius changes
  const setRadiusMeters = useCallback((r: number) => {
    setRadiusMetersState(r);
    localStorage.setItem(RADIUS_KEY, String(r));
    if (rawSegments) {
      const { clustered, newClusters } = runClustering(rawSegments, r);
      runFullAnalysis(clustered, newClusters, clusterLabels);
    }
  }, [rawSegments, clusterLabels, runClustering, runFullAnalysis]);

  // Update cluster label
  const setClusterLabel = useCallback((clusterId: number, label: string) => {
    setClusterLabels(prev => {
      const next = { ...prev, [clusterId]: label };
      saveLabels(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(RAW_DATA_KEY);
    localStorage.removeItem('mobixvh:fileName');
    setRawSegments(null);
    setClusteredSegments(null);
    setClusters([]);
    setResult(null);
    setFileName(null);
    setError(null);
  }, []);

  // Re-run analysis when labels change (but not clustering)
  useEffect(() => {
    if (clusteredSegments && clusters.length > 0) {
      runFullAnalysis(clusteredSegments, clusters, clusterLabels);
    }
  }, [clusterLabels, clusteredSegments, clusters, runFullAnalysis]);

  return (
    <AnalysisContext.Provider value={{
      rawSegments,
      result,
      clusters,
      clusterLabels,
      radiusMeters,
      isLoading,
      fileName,
      error,
      loadFile,
      setRadiusMeters,
      setClusterLabel,
      reset,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}

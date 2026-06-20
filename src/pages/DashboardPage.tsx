import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { MapView } from '../components/dashboard/MapView';
import { OccupancyChart } from '../components/dashboard/OccupancyChart';
import { TimelineView } from '../components/dashboard/TimelineView';
import { TransportTable } from '../components/dashboard/TransportTable';
import { ClusterSettings } from '../components/dashboard/ClusterSettings';
import { ExportButton } from '../components/dashboard/ExportButton';
import { SimultaneousUsageChart } from '../components/dashboard/SimultaneousUsageChart';
import { PeakDistributionChart } from '../components/dashboard/PeakDistributionChart';
import { BarChart3, Clock, ArrowLeftRight, Settings2, Filter } from 'lucide-react';
import type { CraneType } from '../types';

const TABS = [
  { id: 'overzicht', label: 'Overzicht', icon: BarChart3 },
  { id: 'tijdlijn', label: 'Tijdlijn', icon: Clock },
  { id: 'transporten', label: 'Transporten', icon: ArrowLeftRight },
  { id: 'instellingen', label: 'Instellingen', icon: Settings2 },
] as const;

type TabId = typeof TABS[number]['id'];
type FilterOption = CraneType | 'Alle';

export function DashboardPage() {
  const { result, bcData, clusters, clusterLabels, radiusMeters, setRadiusMeters, setClusterLabel, fileName } = useAnalysis();
  const [activeTab, setActiveTab] = useState<TabId>('overzicht');
  const [craneFilter, setCraneFilter] = useState<FilterOption>('Alle');

  const filteredResult = useMemo(() => {
    if (!result) return null;
    if (craneFilter === 'Alle') return result;
    
    return {
      ...result,
      segments: result.segments.filter(s => s.craneType === craneFilter),
      craneDays: result.craneDays.filter(c => c.craneType === craneFilter),
      transports: result.transports.filter(t => t.craneType === craneFilter),
      craneStats: result.craneStats.filter(c => c.craneType === craneFilter),
      totalCranes: result.craneStats.filter(c => c.craneType === craneFilter).length,
    };
  }, [result, craneFilter]);

  const filteredBcData = useMemo(() => {
    if (!bcData) return null;
    if (craneFilter === 'Alle') return bcData;
    return bcData.filter(d => d.craneType === craneFilter);
  }, [bcData, craneFilter]);

  if (!result || !filteredResult) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          {fileName && (
            <p className="text-sm text-slate-400 mt-0.5">
              Bestand: <span className="text-slate-500 font-medium">{fileName}</span>
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Crane Type Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <div className="pl-3 pr-2 text-slate-400">
              <Filter className="w-4 h-4" />
            </div>
            {(['Alle', '1404', '1604'] as FilterOption[]).map(opt => (
              <button
                key={opt}
                onClick={() => setCraneFilter(opt)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  craneFilter === opt 
                    ? 'bg-cfe-green text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          
          <ExportButton result={filteredResult} />
        </div>
      </div>

      {/* Overview cards - always visible */}
      <OverviewCards result={filteredResult} />

      {/* Tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-100 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeTab === id
                ? 'border-cfe-green text-cfe-green'
                : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'overzicht' && (
          <div className="space-y-6">
            <div className="w-full">
              <SimultaneousUsageChart result={filteredResult} bcData={filteredBcData} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PeakDistributionChart result={filteredResult} bcData={filteredBcData} />
              <OccupancyChart result={filteredResult} />
            </div>
            <div className="w-full">
              <MapView result={filteredResult} />
            </div>
          </div>
        )}
        {activeTab === 'tijdlijn' && <TimelineView result={filteredResult} />}
        {activeTab === 'transporten' && <TransportTable result={filteredResult} />}
        {activeTab === 'instellingen' && (
          <ClusterSettings
            clusters={clusters}
            clusterLabels={clusterLabels}
            onLabelChange={setClusterLabel}
            radiusMeters={radiusMeters}
            onRadiusChange={setRadiusMeters}
          />
        )}
      </div>
    </div>
  );
}

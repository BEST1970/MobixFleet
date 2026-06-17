import { useState } from 'react';
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
import { BarChart3, Clock, ArrowLeftRight, Settings2 } from 'lucide-react';

const TABS = [
  { id: 'overzicht', label: 'Overzicht', icon: BarChart3 },
  { id: 'tijdlijn', label: 'Tijdlijn', icon: Clock },
  { id: 'transporten', label: 'Transporten', icon: ArrowLeftRight },
  { id: 'instellingen', label: 'Instellingen', icon: Settings2 },
] as const;

type TabId = typeof TABS[number]['id'];

export function DashboardPage() {
  const { result, clusters, clusterLabels, radiusMeters, setRadiusMeters, setClusterLabel, fileName } = useAnalysis();
  const [activeTab, setActiveTab] = useState<TabId>('overzicht');

  if (!result) {
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
        <ExportButton result={result} />
      </div>

      {/* Overview cards - always visible */}
      <OverviewCards result={result} />

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
            <SimultaneousUsageChart result={result} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MapView result={result} />
              <OccupancyChart result={result} />
            </div>
          </div>
        )}
        {activeTab === 'tijdlijn' && <TimelineView result={result} />}
        {activeTab === 'transporten' && <TransportTable result={result} />}
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

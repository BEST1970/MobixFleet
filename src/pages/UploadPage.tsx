import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { FileDropZone } from '../components/FileDropZone';
import { Truck, BarChart3, MapPin, ArrowLeftRight } from 'lucide-react';

export function UploadPage() {
  const { loadFile, isLoading, result, error } = useAnalysis();
  const navigate = useNavigate();

  // Auto-navigate to dashboard when analysis completes
  useEffect(() => {
    if (result && !isLoading) {
      navigate('/dashboard');
    }
  }, [result, isLoading, navigate]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      {/* Hero */}
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cfe-green to-cfe-teal mb-6 shadow-xl">
          <Truck className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-3">
          Spoorkraan <span className="text-cfe-green">Vlootanalyse</span>
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
          Upload je GeoDynamics exportbestand en krijg direct inzicht in locaties,
          transporten en bezettingsgraad van je kraanvloot.
        </p>
      </div>

      {/* Drop zone */}
      <div className="w-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <FileDropZone onFileLoaded={loadFile} isLoading={isLoading} />
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 max-w-2xl mx-auto flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {[
          { icon: MapPin, title: 'GPS Clustering', desc: 'Automatische locatiebepaling via DBSCAN op coördinaten', color: 'text-cfe-blue' },
          { icon: ArrowLeftRight, title: 'Transport Detectie', desc: 'Locatiewissels per kraan opsporen en tellen', color: 'text-cfe-teal' },
          { icon: BarChart3, title: 'Bezettingsgraad', desc: 'Onderbenutte kranen identificeren als kandidaat om te schrappen', color: 'text-cfe-purple' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <Icon className={`w-6 h-6 ${color} mb-3`} />
            <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

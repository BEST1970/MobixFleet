import { useState } from 'react';
import { MapPin, Pencil, Check, X } from 'lucide-react';
import type { Cluster, ClusterLabels } from '../../types';

interface Props {
  clusters: Cluster[];
  clusterLabels: ClusterLabels;
  onLabelChange: (clusterId: number, newLabel: string) => void;
  radiusMeters: number;
  onRadiusChange: (radius: number) => void;
}

export function ClusterSettings({ clusters, clusterLabels, onLabelChange, radiusMeters, onRadiusChange }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (cluster: Cluster) => {
    setEditingId(cluster.id);
    setEditValue(clusterLabels[cluster.id] || cluster.label);
  };

  const saveEdit = () => {
    if (editingId !== null && editValue.trim()) {
      onLabelChange(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-base font-semibold text-slate-800 mb-1">Clustering Instellingen</h3>
      <p className="text-xs text-slate-400 mb-5">Pas de clusterradius aan en hernoem locaties</p>

      {/* Radius slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-600 font-medium">Clusterradius</span>
          <span className="text-cfe-green font-bold">{radiusMeters}m</span>
        </div>
        <input
          type="range"
          min={100}
          max={1000}
          step={50}
          value={radiusMeters}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cfe-green [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-300 mt-1">
          <span>100m</span>
          <span>1000m</span>
        </div>
      </div>

      {/* Cluster list */}
      <div className="space-y-2">
        {clusters.map(cluster => (
          <div
            key={cluster.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-cfe-blue" />
              {editingId === cluster.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  className="px-2 py-0.5 text-sm border border-cfe-green rounded-lg focus:outline-none focus:ring-2 focus:ring-cfe-green/30"
                  autoFocus
                />
              ) : (
                <span className="text-sm font-medium text-slate-700">
                  {clusterLabels[cluster.id] || cluster.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{cluster.pointCount} datapunten</span>
              {editingId === cluster.id ? (
                <div className="flex gap-1">
                  <button onClick={saveEdit} className="p-1 rounded-lg text-cfe-green hover:bg-cfe-green/10">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={cancelEdit} className="p-1 rounded-lg text-slate-400 hover:bg-slate-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(cluster)} className="p-1 rounded-lg text-slate-400 hover:text-cfe-blue hover:bg-cfe-blue/10">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function MapView({ result }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || result.clusters.length === 0) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // Import leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Clean up previous map if it exists
      const container = mapRef.current;
      if (container && (container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
        container.innerHTML = '';
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current!, {
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Compute crane-days per cluster
      const clusterCraneDays = new Map<number, number>();
      for (const cd of result.craneDays) {
        if (cd.dominantClusterId !== -1) {
          clusterCraneDays.set(cd.dominantClusterId, (clusterCraneDays.get(cd.dominantClusterId) || 0) + 1);
        }
      }
      const maxDays = Math.max(1, ...clusterCraneDays.values());

      const markers: L.LatLng[] = [];

      for (const cluster of result.clusters) {
        const days = clusterCraneDays.get(cluster.id) || 0;
        const relSize = Math.max(0.3, days / maxDays);
        const radius = 8 + relSize * 22;

        // Color interpolation based on days
        const hue = days / maxDays > 0.5 ? 130 : days / maxDays > 0.25 ? 45 : 0;
        const color = `hsl(${hue}, 70%, 45%)`;

        const marker = L.circleMarker([cluster.centroidLat, cluster.centroidLon], {
          radius,
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.8,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: Inter, system-ui; font-size: 13px;">
            <strong>${cluster.label}</strong><br/>
            <span style="color: #64748b;">${days} kraandagen</span><br/>
            <span style="color: #94a3b8; font-size: 11px;">${cluster.pointCount} datapunten</span>
          </div>
        `);

        markers.push(L.latLng(cluster.centroidLat, cluster.centroidLon));
      }

      if (markers.length > 0) {
        const bounds = L.latLngBounds(markers);
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      // Force Leaflet to recalculate container size to fix empty map bug on tab switch
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 400);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [result]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-3 px-2">Locaties Kaart</h3>
      <div ref={mapRef} className="w-full h-[400px] rounded-xl overflow-hidden" />
    </div>
  );
}

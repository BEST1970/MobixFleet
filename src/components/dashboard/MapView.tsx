import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function MapView({ result }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || result.clusters.length === 0) return;

    // 1. Create the map instance
    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // 2. Compute crane-days per cluster
    const clusterCraneDays = new Map<number, number>();
    for (const cd of result.craneDays) {
      if (cd.dominantClusterId !== -1) {
        clusterCraneDays.set(cd.dominantClusterId, (clusterCraneDays.get(cd.dominantClusterId) || 0) + 1);
      }
    }
    const maxDays = Math.max(1, ...Array.from(clusterCraneDays.values()));

    // 3. Add markers
    const markers: L.LatLng[] = [];

    for (const cluster of result.clusters) {
      const days = clusterCraneDays.get(cluster.id) || 0;
      const relSize = Math.max(0.3, days / maxDays);
      const radius = 8 + relSize * 22;

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

    // 4. Handle resize and tab visibility accurately
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapRef.current);

    // Some browsers or specific flex/grid layouts need a tiny delay before Leaflet gets the correct size
    const timeouts = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 200),
      setTimeout(() => map.invalidateSize(), 500)
    ];

    // 5. Cleanup function
    return () => {
      resizeObserver.disconnect();
      timeouts.forEach(clearTimeout);
      map.remove(); // This safely destroys the map instance and cleans up the DOM node
    };
  }, [result]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col h-full">
      <h3 className="text-base font-semibold text-slate-800 mb-3 px-2">Locaties Kaart</h3>
      <div 
        ref={mapRef} 
        className="w-full h-[400px] min-h-[400px] rounded-xl overflow-hidden z-0" 
      />
    </div>
  );
}

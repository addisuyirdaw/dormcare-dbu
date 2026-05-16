'use client';
import { useEffect, useRef, useState } from 'react';

// ── DBU Campus Coordinates (Debre Birhan University) ──────────────────────────
const DBU_CENTER: [number, number] = [9.6759, 39.5338];
const GEOFENCE_RADIUS_M = 50; // actual check-in validation radius
const DISPLAY_RING_M = 200;   // visible ring on map

// Lock the map so users CANNOT scroll outside the DBU campus area
const DBU_MAX_BOUNDS: [[number, number], [number, number]] = [
  [9.655, 39.515], // SW — hard stop boundary
  [9.698, 39.555], // NE — hard stop boundary
];

// ─────────────────────────────────────────────────────────────────────────────

interface ShiftData {
  id: string;
  staff?: { name: string; phone?: string };
  shiftName: string;
  status: string;
  latitude?: number;
  longitude?: number;
  checkedInAt?: string;
  distanceDelta?: number;
  blocks?: { number: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT:       '#22c55e',
  OUT_OF_BOUNDS: '#f59e0b',
  ABSENT:        '#ef4444',
  SCHEDULED:     '#6366f1',
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT:       '✔ Verified Present',
  OUT_OF_BOUNDS: '⚠ Out of Bounds',
  ABSENT:        '✖ Absent',
  SCHEDULED:     '🗓 Scheduled',
};

// Tile layer definitions
const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, USGS, NOAA',
    label: '🛰 Satellite',
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: '🗺 Street',
  },
};

export default function StaffLocationMap({ shifts }: { shifts: ShiftData[] }) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInstance   = useRef<any>(null);
  const tileLayer     = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const [tileMode, setTileMode] = useState<'satellite' | 'street'>('satellite');

  // ── Map initialisation (runs once) ────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Inject Leaflet CSS
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (mapInstance.current || (mapRef.current as any)?._leaflet_id) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapRef.current!, {
        center:           DBU_CENTER,
        zoom:             17,          // Tight zoom on campus buildings
        minZoom:          15,          // Cannot zoom out past campus view
        maxZoom:          19,
        maxBounds:        DBU_MAX_BOUNDS,
        maxBoundsViscosity: 1.0,       // Hard lock — cannot drag outside bounds
        zoomControl:      true,
        scrollWheelZoom:  true,
        attributionControl: true,
      });

      // Default tile: Satellite
      tileLayer.current = L.tileLayer(TILES.satellite.url, {
        attribution: TILES.satellite.attribution,
        maxZoom: 19,
      }).addTo(map);

      // ── Campus geofence ring (50m actual boundary) ──────────────────────
      L.circle(DBU_CENTER, {
        radius:      GEOFENCE_RADIUS_M,
        color:       '#22c55e',
        fillColor:   '#22c55e',
        fillOpacity: 0.08,
        weight:      2,
        dashArray:   '6 3',
      }).addTo(map).bindPopup('<b>✅ 50m Check-in Zone</b><br>Staff must be inside this ring to be marked PRESENT');

      // ── Outer display ring (200m context) ──────────────────────────────
      L.circle(DBU_CENTER, {
        radius:      DISPLAY_RING_M,
        color:       '#6366f1',
        fillColor:   'transparent',
        weight:      1,
        dashArray:   '10 6',
        opacity:     0.4,
      }).addTo(map).bindPopup('<b>🏛 DBU Campus Perimeter</b>');

      // ── DBU campus centre marker ────────────────────────────────────────
      const campusIcon = L.divIcon({
        className: '',
        html: `<div style="
          background:#6366f1;color:#fff;border-radius:50%;
          width:34px;height:34px;display:flex;align-items:center;
          justify-content:center;font-size:16px;border:3px solid #fff;
          box-shadow:0 0 14px rgba(99,102,241,0.9);">🏛</div>`,
        iconSize:   [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker(DBU_CENTER, { icon: campusIcon })
        .addTo(map)
        .bindPopup('<b>🏛 DBU Dormitory Center</b><br>Debre Birhan University<br><small>9.6759°N, 39.5338°E</small>');

      mapInstance.current = map;
      renderMarkers(L, map, shifts);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render staff markers whenever shifts data changes ──────────────────
  useEffect(() => {
    if (!mapInstance.current) return;
    import('leaflet').then((L) => renderMarkers(L, mapInstance.current, shifts));
  }, [shifts]);

  // ── Switch tile layer when user toggles Satellite ↔ Street ───────────────
  useEffect(() => {
    if (!mapInstance.current || !tileLayer.current) return;
    import('leaflet').then((L) => {
      mapInstance.current.removeLayer(tileLayer.current);
      tileLayer.current = L.tileLayer(TILES[tileMode].url, {
        attribution: TILES[tileMode].attribution,
        maxZoom: 19,
      }).addTo(mapInstance.current);
      // Bring markers back on top of new tile layer
      markersRef.current.forEach(m => m.bringToFront?.());
    });
  }, [tileMode]);

  function renderMarkers(L: any, map: any, data: ShiftData[]) {
    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    data.forEach((shift) => {
      if (!shift.latitude || !shift.longitude) return;

      const color    = STATUS_COLORS[shift.status] || '#6b7280';
      const label    = STATUS_LABELS[shift.status] || shift.status;
      const name     = shift.staff?.name || 'Unknown';
      const blocks   = shift.blocks?.map(b => `Block ${b.number}`).join(', ') || '—';
      const timeIn   = shift.checkedInAt
        ? new Date(shift.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';
      const delta    = shift.distanceDelta != null ? `${Math.round(shift.distanceDelta)}m` : '—';
      const isOut    = shift.status === 'OUT_OF_BOUNDS';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;filter:drop-shadow(0 2px 6px ${color}99);">
            <div style="
              background:${color};color:#fff;border-radius:50%;
              width:40px;height:40px;display:flex;align-items:center;
              justify-content:center;font-size:18px;border:3px solid #fff;
              box-shadow:0 0 14px ${color}88;">👤</div>
            <div style="
              position:absolute;top:-8px;right:-4px;
              background:${color};color:#fff;border-radius:6px;
              font-size:8px;padding:1px 5px;white-space:nowrap;font-weight:900;
              border:1px solid rgba(255,255,255,0.4);">
              ${isOut ? '⚠ OOB' : shift.status === 'PRESENT' ? '✔ OK' : shift.status}
            </div>
          </div>`,
        iconSize:   [40, 48],
        iconAnchor: [20, 24],
      });

      const marker = L.marker([shift.latitude, shift.longitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:200px;font-family:Inter,system-ui,sans-serif;">
            <div style="font-weight:800;font-size:15px;margin-bottom:6px;">👤 ${name}</div>
            <div style="
              background:${color}22;border:1px solid ${color}66;color:${color};
              border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;
              margin-bottom:8px;display:inline-block;">${label}</div>
            <table style="font-size:12px;color:#444;width:100%;border-collapse:collapse;">
              <tr><td style="padding:2px 0;color:#888;width:90px;">Shift</td><td style="font-weight:600;">${shift.shiftName}</td></tr>
              <tr><td style="padding:2px 0;color:#888;">Blocks</td><td style="font-weight:600;">${blocks}</td></tr>
              <tr><td style="padding:2px 0;color:#888;">Check-in</td><td style="font-weight:600;">${timeIn}</td></tr>
              <tr><td style="padding:2px 0;color:#888;">Distance</td>
                  <td style="font-weight:700;color:${isOut ? '#f59e0b' : '#22c55e'};">Δ ${delta} from campus</td></tr>
            </table>
            ${isOut ? `<div style="margin-top:8px;padding:6px 8px;background:#f59e0b22;border:1px solid #f59e0b55;border-radius:6px;font-size:11px;color:#f59e0b;font-weight:600;">⚠ Outside the 50m check-in zone!</div>` : ''}
          </div>`);

      markersRef.current.push(marker);
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Satellite / Street toggle overlay */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.75)',
        borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {(['satellite', 'street'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setTileMode(mode)}
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
              fontWeight: 700, cursor: 'pointer', border: 'none',
              background: tileMode === mode ? '#6366f1' : 'transparent',
              color: tileMode === mode ? '#fff' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}
          >
            {TILES[mode].label}
          </button>
        ))}
      </div>

      {/* Map canvas */}
      <div
        ref={mapRef}
        style={{
          width: '100%', height: '460px', borderRadius: '12px',
          overflow: 'hidden', border: '1px solid rgba(99,102,241,0.3)',
          boxShadow: '0 0 24px rgba(99,102,241,0.12)',
          background: '#0a0a14', position: 'relative', zIndex: 0,
        }}
      />

      {/* Bottom label */}
      <div style={{
        position: 'absolute', bottom: 8, left: 12, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)',
        borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: 600,
      }}>
        📍 DBU Campus Only · {shifts.length} staff located
      </div>
    </div>
  );
}

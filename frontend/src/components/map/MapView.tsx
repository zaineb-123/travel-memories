'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Memory } from '@/types';
import type { Story } from '@/types/social';

// Fix icônes Leaflet (problème connu avec Next.js)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export const PIN_COLORS = { mine: '#3B82F6', public: '#22C55E', position: '#EF4444', story: '#1F5F7B' } as const;

/** Épingle colorée (SVG) : bleu = mes souvenirs, vert = souvenirs publics des autres. */
function pinIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 1C8 1 1.5 7.4 1.5 15.3 1.5 26 16 41 16 41s14.5-15 14.5-25.7C30.5 7.4 24 1 16 1z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="16" cy="15" r="5.5" fill="#ffffff"/></svg>`;
  return L.divIcon({ className: 'tm-pin', html: svg, iconSize: [32, 42], iconAnchor: [16, 41], popupAnchor: [0, -38] });
}

function storyIcon(url: string) {
  return L.divIcon({
    className: 'tm-story-pin',
    html: `<div style="width:44px;height:44px;border-radius:9999px;padding:2px;background:linear-gradient(45deg,${PIN_COLORS.story},#4A8CA8);box-shadow:0 2px 6px rgba(0,0,0,.35)">
      <div style="width:100%;height:100%;border-radius:9999px;border:2px solid #fff;overflow:hidden;background:#E3EDF2">
      <img src="${esc(url)}" alt="" style="width:100%;height:100%;object-fit:cover" /></div></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

/** Échappe le texte utilisateur avant de l'insérer dans une popup HTML (évite l'injection de code). */
function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function memoryPopup(m: Memory, mine: boolean) {
  const place = esc(m.location_name || [m.city, m.country].filter(Boolean).join(', '));
  const img = m.photos?.[0]?.image_url || m.cover_image;
  const color = mine ? PIN_COLORS.mine : PIN_COLORS.public;
  return `
    <div style="font-family:inherit">
      ${img ? `<img src="${esc(img)}" alt="" style="display:block;width:100%;height:120px;object-fit:cover" />` : ''}
      <div style="padding:10px 12px">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#46525E;margin-bottom:4px">
          <span style="width:8px;height:8px;border-radius:9999px;background:${color};display:inline-block"></span>
          ${mine ? 'Votre souvenir' : `@${esc(m.user?.username)}`}
        </div>
        <div style="font-weight:600;font-size:14px;color:#111A22;line-height:1.25">${esc(m.title)}</div>
        ${place ? `<div style="font-size:12px;color:#7A8794;margin-top:2px">📍 ${place}</div>` : ''}
        <a href="/memory/${Number(m.id)}" style="display:inline-block;margin-top:8px;font-size:13px;color:#1F5F7B">Voir les détails →</a>
      </div>
    </div>`;
}

interface MapViewProps {
  memories: Memory[];
  userLocation: [number, number];
  /** Id de l'utilisateur connecté : ses souvenirs sont en bleu, les autres en vert. */
  currentUserId?: number | null;
  stories?: Story[];
}

export function MapView({ memories, userLocation, currentUserId, stories = [] }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView(userLocation, 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
      layerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      fittedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points: L.LatLngExpression[] = [];

    for (const m of memories) {
      if (m.latitude == null || m.longitude == null) continue;
      const mine = currentUserId != null && m.user_id === currentUserId;
      const pos: L.LatLngExpression = [m.latitude, m.longitude];
      L.marker(pos, { icon: pinIcon(mine ? PIN_COLORS.mine : PIN_COLORS.public), title: m.title })
        .bindPopup(memoryPopup(m, mine), { maxWidth: 240 })
        .addTo(layer);
      points.push(pos);
    }

    for (const s of stories) {
      if (s.latitude == null || s.longitude == null) continue;
      const pos: L.LatLngExpression = [s.latitude, s.longitude];
      L.marker(pos, { icon: storyIcon(s.image_url), zIndexOffset: 500 })
        .bindPopup(
          `<div style="padding:10px 12px;font-size:13px"><b>Story de @${esc(s.user.username)}</b>${s.caption ? `<div style="color:#46525E;margin-top:2px">${esc(s.caption)}</div>` : ''}<div style="font-size:11px;color:#7A8794;margin-top:4px">Visible 24 h</div></div>`,
        )
        .addTo(layer);
    }

    // Position de l'utilisateur (point rouge)
    L.marker(userLocation, {
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="position:relative;width:24px;height:24px"><div style="position:absolute;inset:0;border-radius:9999px;background:${PIN_COLORS.position};opacity:.35" class="animate-ping"></div><div style="position:absolute;left:6px;top:6px;width:12px;height:12px;border-radius:9999px;background:${PIN_COLORS.position};border:2px solid #fff"></div></div>`,
        iconSize: [24, 24],
        popupAnchor: [0, -12],
      }),
    })
      .bindPopup('Votre position')
      .addTo(layer);

    // On cadre tous les souvenirs une seule fois (pas à chaque rafraîchissement).
    if (!fittedRef.current && points.length > 0) {
      fittedRef.current = true;
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 8 });
    } else if (!fittedRef.current) {
      map.setView(userLocation, 5);
    }
  }, [memories, stories, userLocation, currentUserId]);

  return <div id="map" className="h-full w-full" />;
}

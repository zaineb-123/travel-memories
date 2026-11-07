'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Memory } from '@/types';

interface MapLocation {
  lat: number;
  lng: number;
  zoom: number;
}

interface UseMapOptions {
  center?: [number, number];
  zoom?: number;
  enableGeolocation?: boolean;
}

export function useMap(options: UseMapOptions = {}) {
  const {
    center = [48.8566, 2.3522], // Paris par défaut
    zoom = 10,
    enableGeolocation = true,
  } = options;

  const mapRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Initialiser la carte
  const initMap = useCallback((elementId: string) => {
    if (mapRef.current) return mapRef.current;

    const newMap = L.map(elementId).setView(center, zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(newMap);

    mapRef.current = newMap;
    setMap(newMap);
    return newMap;
  }, [center, zoom]);

  // Nettoyer la carte
  const cleanup = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      setMap(null);
    }
  }, []);

  // Obtenir la position de l'utilisateur
  const getUserLocation = useCallback(async (): Promise<[number, number] | null> => {
    if (!enableGeolocation) return null;
    
    setIsLocating(true);
    setLocationError(null);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation not supported');
        setIsLocating(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(location);
          setIsLocating(false);
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timeout';
              break;
          }
          setLocationError(errorMessage);
          setIsLocating(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [enableGeolocation]);

  // Centrer la carte sur une position
  const centerOnLocation = useCallback((lat: number, lng: number, zoomLevel?: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], zoomLevel || mapRef.current.getZoom());
    }
  }, []);

  // Centrer sur l'utilisateur
  const centerOnUser = useCallback(async () => {
    const location = await getUserLocation();
    if (location && mapRef.current) {
      mapRef.current.setView(location, 14);
      return location;
    }
    return null;
  }, [getUserLocation]);

  // Ajouter un marqueur
  const addMarker = useCallback((
    id: string,
    position: [number, number],
    popupContent?: string,
    options?: L.MarkerOptions
  ) => {
    if (!mapRef.current) return null;

    // Supprimer le marqueur existant
    if (markersRef.current[id]) {
      markersRef.current[id].remove();
    }

    const marker = L.marker(position, options).addTo(mapRef.current);
    
    if (popupContent) {
      marker.bindPopup(popupContent);
    }

    markersRef.current[id] = marker;
    return marker;
  }, []);

  // Supprimer un marqueur
  const removeMarker = useCallback((id: string) => {
    if (markersRef.current[id]) {
      markersRef.current[id].remove();
      delete markersRef.current[id];
    }
  }, []);

  // Ajouter plusieurs marqueurs (mémoires)
  const addMemoryMarkers = useCallback((memories: Memory[], onMarkerClick?: (memory: Memory) => void) => {
    if (!mapRef.current) return;

    // Nettoyer les anciens marqueurs de mémoire
    Object.keys(markersRef.current).forEach((key) => {
      if (key.startsWith('memory_')) {
        removeMarker(key);
      }
    });

    memories.forEach((memory) => {
      if (memory.latitude && memory.longitude) {
        const popupContent = `
          <div class="memory-popup">
            ${memory.cover_image ? `<img src="${memory.cover_image}" class="memory-popup-image" />` : ''}
            <div class="memory-popup-content">
              <h4 class="memory-popup-title">${memory.title}</h4>
              <div class="memory-popup-location">
                📍 ${memory.country}${memory.city ? `, ${memory.city}` : ''}
              </div>
              <a href="/memory/${memory.id}" class="memory-popup-link">Voir les détails →</a>
            </div>
          </div>
        `;

        addMarker(`memory_${memory.id}`, [memory.latitude, memory.longitude], popupContent);
      }
    });
  }, [addMarker, removeMarker]);

  // Ajouter un marqueur utilisateur
  const addUserMarker = useCallback((position: [number, number]) => {
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div class="user-location-pulse"></div>',
      iconSize: [24, 24],
      popupAnchor: [0, -12],
    });

    addMarker('user_location', position, 'Votre position', { icon: userIcon });
  }, [addMarker]);

  // Récupérer les limites de la carte
  const getBounds = useCallback(() => {
    if (!mapRef.current) return null;
    const bounds = mapRef.current.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }, []);

  // Ajouter un contrôle de zoom personnalisé
  const addZoomControl = useCallback(() => {
    if (!mapRef.current) return;
    
    const zoomControl = L.control.zoom({
      position: 'topright',
    });
    zoomControl.addTo(mapRef.current);
  }, []);

  return {
    map,
    userLocation,
    isLocating,
    locationError,
    initMap,
    cleanup,
    getUserLocation,
    centerOnLocation,
    centerOnUser,
    addMarker,
    removeMarker,
    addMemoryMarkers,
    addUserMarker,
    getBounds,
    addZoomControl,
  };
}
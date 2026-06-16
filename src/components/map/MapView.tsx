'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Listing } from '@/types';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const roomIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#059669;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid white">🏠 Room</div>',
  iconSize: [70, 30],
  iconAnchor: [35, 15],
});

const lookingIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#7c3aed;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid white">🔍 Looking</div>',
  iconSize: [80, 30],
  iconAnchor: [40, 15],
});

interface MapViewProps {
  listings: Listing[];
  selectedLat: number;
  selectedLng: number;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerClick: (listing: Listing) => void;
}

export default function MapView({ listings, selectedLat, selectedLng, onMapClick, onMarkerClick }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629], // Center of India
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when listings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers
    listings.forEach(listing => {
      const marker = L.marker([listing.lat, listing.lng], {
        icon: listing.listingType === 'have_room' ? roomIcon : lookingIcon,
      }).addTo(map);

      marker.on('click', () => {
        onMarkerClick(listing);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have listings
    if (listings.length > 0) {
      const bounds = L.latLngBounds(listings.map(l => [l.lat, l.lng] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [listings, mapRef.current]);

  // Update selected marker position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old selected marker
    markersRef.current.forEach(m => {
      if ((m as any)._isSelected) m.remove();
    });

    const selectedMarker = L.marker([selectedLat, selectedLng], {
      icon: L.divIcon({
        className: 'selected-marker',
        html: '<div style="background:#ef4444;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid white">📍 Selected</div>',
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      }),
      draggable: true,
    }).addTo(map);

    (selectedMarker as any)._isSelected = true;

    selectedMarker.on('dragend', () => {
      const pos = selectedMarker.getLatLng();
      onMapClick(pos.lat, pos.lng);
    });

    markersRef.current.push(selectedMarker);

    map.setView([selectedLat, selectedLng], map.getZoom() < 10 ? 10 : map.getZoom());
  }, [selectedLat, selectedLng, mapRef.current]);

  return (
    <div ref={mapContainerRef} className="w-full h-[600px] z-0" style={{ background: '#f0f0f0' }} />
  );
}

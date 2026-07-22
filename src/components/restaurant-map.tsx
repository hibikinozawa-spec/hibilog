"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Restaurant } from "@/lib/types";

const pinIcon = L.divIcon({
  className: "hibi-pin",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1a9b8a;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,.25)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function FitBounds({ restaurants }: { restaurants: Restaurant[] }) {
  const map = useMap();
  useEffect(() => {
    if (restaurants.length === 0) return;
    if (restaurants.length === 1) {
      map.setView([restaurants[0].lat, restaurants[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(restaurants.map((r) => [r.lat, r.lng]));
    map.fitBounds(bounds.pad(0.2));
  }, [map, restaurants]);
  return null;
}

export function RestaurantMap({
  restaurants,
  className = "",
}: {
  restaurants: Restaurant[];
  className?: string;
}) {
  const center = useMemo<[number, number]>(() => {
    if (restaurants.length === 0) return [35.68, 139.76];
    const lat = restaurants.reduce((s, r) => s + r.lat, 0) / restaurants.length;
    const lng = restaurants.reduce((s, r) => s + r.lng, 0) / restaurants.length;
    return [lat, lng];
  }, [restaurants]);

  return (
    <div className={`overflow-hidden rounded-2xl border border-[var(--line)] ${className}`}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full min-h-[320px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds restaurants={restaurants} />
        {restaurants.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={pinIcon}>
            <Popup>
              <div className="min-w-[160px] space-y-1">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-neutral-600">
                  {r.cuisine} · {r.area}
                </p>
                <div className="flex gap-2 pt-1 text-xs">
                  <Link href={`/restaurant/${r.id}`} className="text-[var(--brand)]">
                    詳細
                  </Link>
                  <a
                    href={r.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand)]"
                  >
                    Googleマップ
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

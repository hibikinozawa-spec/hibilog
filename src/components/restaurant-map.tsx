"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { displayBrowseGenre } from "@/lib/genre-matching";
import type { Restaurant } from "@/lib/types";

const pinIcon = L.divIcon({
  className: "hibi-pin",
  html: `<div class="hibi-pin-wrap"><svg width="32" height="42" viewBox="0 0 27 43" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M13.5 1C6.596 1 1 6.596 1 13.5c0 9.5 12.5 28 12.5 28s12.5-18.5 12.5-28C26 6.596 20.404 1 13.5 1z" fill="#EA4335" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><circle cx="13.5" cy="13" r="5.2" fill="#C5221F"/></svg></div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

const TOKYO_CENTER: [number, number] = [35.6812, 139.7671];
const TOKYO_ZOOM = 12;
const JAPAN_CENTER: [number, number] = [36.2, 138.25];
const JAPAN_ZOOM = 5;

function SetFixedView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

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
  view = "tokyo",
}: {
  restaurants: Restaurant[];
  className?: string;
  /** tokyo = 東京中心固定 / fit = ピンに合わせてズーム / japan = 日本全体 */
  view?: "tokyo" | "fit" | "japan";
}) {
  const center = view === "japan" ? JAPAN_CENTER : TOKYO_CENTER;
  const zoom = view === "japan" ? JAPAN_ZOOM : TOKYO_ZOOM;

  return (
    <div className={`overflow-hidden rounded-2xl border border-[var(--line)] ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full min-h-[320px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {view === "fit" ? (
          <FitBounds restaurants={restaurants} />
        ) : (
          <SetFixedView center={center} zoom={zoom} />
        )}
        {restaurants.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={pinIcon}>
            <Popup>
              <div className="min-w-[160px] space-y-1">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-neutral-600">
                  {displayBrowseGenre(r)} · {r.area}
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

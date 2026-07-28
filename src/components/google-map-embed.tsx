"use client";

export function GoogleMapEmbed({
  name,
  query,
  lat,
  lng,
  zoom = 16,
  className = "h-[320px]",
}: {
  name: string;
  query: string;
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}) {
  const hasReliableCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) > 1 &&
    Math.abs(lng) > 1;
  const embedSrc = hasReliableCoords
    ? `https://maps.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=${zoom}&hl=ja&output=embed`
    : query
      ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=ja&output=embed`
      : `https://maps.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=${zoom}&hl=ja&output=embed`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm ${className}`}
    >
      <iframe
        title={`${name} on Google Maps`}
        src={embedSrc}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

"use client";

export function GoogleMapEmbed({
  name,
  googleMapsUrl,
  lat,
  lng,
  query,
  className = "h-[320px]",
}: {
  name: string;
  googleMapsUrl: string;
  lat: number;
  lng: number;
  query: string;
  className?: string;
}) {
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&ll=${lat},${lng}&z=15&output=embed`;

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm ${className}`}
      aria-label={`${name}をGoogleマップで開く`}
    >
      <iframe
        title={`${name} on Google Maps`}
        src={embedSrc}
        className="pointer-events-none h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute inset-0 bg-transparent transition group-hover:bg-black/5" />
      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
        Googleマップで開く
      </span>
    </a>
  );
}

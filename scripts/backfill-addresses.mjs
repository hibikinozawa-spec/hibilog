// Backfill missing address text from cached lat/lng via OpenStreetMap Nominatim.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cachePath = path.join(root, "data", "place-cache.json");

function hasRealAddress(address) {
  if (!address) return false;
  if (/^〒/.test(address)) return true;
  if (/(北海道|東京都|京都府|大阪府|.{2,3}県)/.test(address)) return true;
  return false;
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja&zoom=18`;
  const res = await fetch(url, {
    headers: { "User-Agent": "HibiLog/1.0 (restaurant catalog backfill)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.display_name?.replace(/, 日本$/, "") || null;
}

const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
const todo = Object.entries(cache).filter(
  ([, v]) => typeof v.lat === "number" && !hasRealAddress(v.address),
);

console.log(`Backfill: ${todo.length} entries`);
let ok = 0;

for (const [name, entry] of todo) {
  process.stderr.write(`${name} … `);
  try {
    const address = await reverseGeocode(entry.lat, entry.lng);
    if (address) {
      entry.address = address;
      ok++;
      process.stderr.write("OK\n");
    } else {
      process.stderr.write("skip\n");
    }
  } catch {
    process.stderr.write("err\n");
  }
  await new Promise((r) => setTimeout(r, 1100));
}

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
console.log(JSON.stringify({ ok, total: Object.keys(cache).length }, null, 2));

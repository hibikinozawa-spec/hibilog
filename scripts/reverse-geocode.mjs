// Fill missing addresses from cached lat/lng via OpenStreetMap Nominatim.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cachePath = path.join(path.resolve(__dirname, ".."), "data", "place-cache.json");

function hasRealAddress(v) {
  if (!v?.address) return false;
  const a = cleanAddress(v.address);
  if (/^〒/.test(a)) return true;
  if (/\d{3}-\d{4}/.test(a) && /(北海道|東京都|京都府|大阪府|.{2,3}県)/.test(a))
    return true;
  if (/(北海道|東京都|京都府|大阪府)/.test(a) && /(市|区|町|村|郡)/.test(a))
    return true;
  return /.{2,3}県/.test(a) && /(市|区|町|村|郡)/.test(a);
}

function cleanAddress(address) {
  return (address || "")
    .replace(/\s*の操作オプション.*$/, "")
    .replace(/^住所[：:\s]*/, "")
    .trim();
}

async function reverseGeocode(lat, lng) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "ja");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": "HibiLog/1.0 (restaurant guide)" },
  });
  if (!res.ok) return "";
  const data = await res.json();
  const a = data.address || {};
  const postcode = a.postcode ? `〒${a.postcode}` : "";
  const prefecture = a.province || a.state || "";
  const city = a.city || a.town || a.village || "";
  const area = a.suburb || a.neighbourhood || a.quarter || "";
  const road = a.road || "";
  const house = a.house_number || "";
  const formatted = [postcode, prefecture, city, area, road, house]
    .filter(Boolean)
    .join("")
    .replace(/^(〒\d{3}-\d{4})/, "$1 ");
  return cleanAddress(formatted || data.display_name || "");
}

const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
let updated = 0;

for (const [name, entry] of Object.entries(cache)) {
  entry.address = cleanAddress(entry.address);
  if (hasRealAddress(entry)) continue;
  if (typeof entry.lat !== "number" || typeof entry.lng !== "number") continue;

  process.stderr.write(`${name} … `);
  try {
    const address = await reverseGeocode(entry.lat, entry.lng);
    if (address && hasRealAddress({ address })) {
      entry.address = address;
      updated++;
      process.stderr.write(`OK ${address.slice(0, 50)}\n`);
    } else {
      process.stderr.write("skip\n");
    }
  } catch (e) {
    process.stderr.write(`err ${e.message}\n`);
  }
  await new Promise((r) => setTimeout(r, 1100));
}

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
console.log(JSON.stringify({ updated, total: Object.keys(cache).length }, null, 2));

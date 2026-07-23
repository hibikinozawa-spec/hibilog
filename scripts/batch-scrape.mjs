// Batch-scrape Google Maps shared lists into data/lists/*.json
// Usage: node scripts/batch-scrape.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const listsDir = path.join(root, "data", "lists");
const scraper = path.join(__dirname, "scrape-google-list.mjs");

const LISTS = [
  ["東京レストラン_和食", "https://maps.app.goo.gl/stNafCCq1fMxu2D9A"],
  ["東京レストラン_肉", "https://maps.app.goo.gl/8tS6air5cjG4Ra9VA"],
  ["東京レストラン_イタリアン", "https://maps.app.goo.gl/TyUxSccCFwP1yBPa7"],
  ["東京レストラン_フレンチ", "https://maps.app.goo.gl/pRCaWM8rmXabUqxk7"],
  ["東京レストラン_十割そば", "https://maps.app.goo.gl/xCSHyKdVC625bgHT8"],
  ["鰻", "https://maps.app.goo.gl/KyW3nYUPVogmptjy6"],
  ["東京レストラン_中華", "https://maps.app.goo.gl/ZpcrrMaVSKTTq7MK8"],
  ["東京レストラン_焼き鳥", "https://maps.app.goo.gl/kUwiuLQU31MaRzfU6"],
  ["東京レストラン_日本酒名店", "https://maps.app.goo.gl/SAvA2baSXJcKSr8X6"],
  ["東京レストラン_ビブグルマン", "https://maps.app.goo.gl/z4dJYmtBK8tH8Y6K8"],
  ["東京レストラン_会食low", "https://maps.app.goo.gl/mFQD6f6hdnUNmbGe6"],
  ["東京レストラン_会食middle", "https://maps.app.goo.gl/F1V72f2fHDkoitik7"],
  ["東京レストラン_会食exective", "https://maps.app.goo.gl/USqdbubKKk2ykEq57"],
  ["京都レストラン", "https://maps.app.goo.gl/WdkfcMKYpXC3nkeQ9"],
  ["地方レストラン_名店", "https://maps.app.goo.gl/a5JATnasa5Q1Aqx28"],
  ["東京レストラン_コスパ", "https://maps.app.goo.gl/btNiKmntFgy3983w9"],
  ["茅ヶ崎/鎌倉レストラン", "https://maps.app.goo.gl/9u23dXb3DNFe2iUM7"],
  ["鮨", "https://maps.app.goo.gl/PgNEACSTe8taKRYf9"],
];

fs.mkdirSync(listsDir, { recursive: true });

let total = 0;
for (const [name, url] of LISTS) {
  const safeName = name.replace(/\//g, "_");
  const outPath = path.join(listsDir, `${safeName}.json`);
  console.log(`\n→ ${name}`);
  const res = spawnSync("node", [scraper, url, name], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180000,
  });
  if (res.status !== 0) {
    console.error(`  FAILED: ${res.stderr?.slice(0, 200)}`);
    continue;
  }
  try {
    const data = JSON.parse(res.stdout);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log(`  ✓ ${data.count} places → ${path.basename(outPath)}`);
    total += data.count;
  } catch (e) {
    console.error(`  PARSE ERROR: ${e.message}`);
  }
}

console.log(`\nDone. ${LISTS.length} lists, ${total} total entries (before dedup).`);

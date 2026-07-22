// Scroll a shared Google Maps list and extract all places.
// Usage: node scrape.mjs "<share_url>" "<listName>"
import puppeteer from "puppeteer-core";

const url = process.argv[2];
const listName = process.argv[3] || "list";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--lang=ja-JP", "--no-sandbox", "--window-size=1280,1600"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1600 });
await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 3500));

// Handle consent interstitial if present
try {
  const btns = await page.$$("button");
  for (const b of btns) {
    const t = (await page.evaluate((el) => el.textContent, b)) || "";
    if (/同意|すべて同意|Accept all|承諾|同意する/.test(t)) {
      await b.click();
      await new Promise((r) => setTimeout(r, 3000));
      break;
    }
  }
} catch {}

if (process.env.DEBUG_SHOT) {
  await page.screenshot({ path: "debug.png", fullPage: false });
  const html = await page.content();
  (await import("fs")).writeFileSync("debug.html", html);
  const title = await page.title();
  console.error("DEBUG title:", title);
  console.error("DEBUG place anchors:", (html.match(/\/maps\/place\//g) || []).length);
  console.error("DEBUG headline:", (html.match(/fontHeadlineSmall/g) || []).length);
}

// Find the scrollable results feed
const feedSel = 'div[role="feed"]';
try {
  await page.waitForSelector(feedSel, { timeout: 15000 });
} catch {}

// Identify the scrollable container that holds the headlines
await page.evaluate(() => {
  const h = document.querySelector(".fontHeadlineSmall");
  let el = h ? h.parentElement : null;
  while (el) {
    const st = getComputedStyle(el);
    if (
      (st.overflowY === "auto" || st.overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 20
    ) {
      window.__scrollBox = el;
      break;
    }
    el = el.parentElement;
  }
});

// Hover over the feed and use real mouse wheel to trigger lazy load
const box = await page.evaluate(() => {
  const el = window.__scrollBox || document.querySelector('div[role="feed"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (box) await page.mouse.move(box.x, box.y);

let lastCount = 0;
let stable = 0;
for (let i = 0; i < 200; i++) {
  if (box) {
    await page.mouse.wheel({ deltaY: 2500 });
  }
  await page.evaluate(() => {
    const b = window.__scrollBox || document.querySelector('div[role="feed"]');
    if (b) b.scrollTop = b.scrollHeight;
    const els = document.querySelectorAll(".fontHeadlineSmall");
    if (els.length) els[els.length - 1].scrollIntoView({ block: "end" });
  });
  await new Promise((r) => setTimeout(r, 700));
  const count = await page.evaluate(
    () => document.querySelectorAll(".fontHeadlineSmall").length,
  );
  if (count === lastCount) {
    stable++;
    if (stable >= 10) break;
  } else {
    stable = 0;
  }
  lastCount = count;
}
// detect end-of-list marker


// Extract places from headline elements
const places = await page.evaluate(() => {
  const out = [];
  const heads = document.querySelectorAll(".fontHeadlineSmall");
  for (const h of heads) {
    const name = (h.textContent || "").trim();
    if (!name) continue;
    // climb to card container that has rating/info
    let card = h.parentElement;
    for (let k = 0; k < 6 && card && card.parentElement; k++) {
      if (card.querySelector('span[aria-label*="つ星"], .fontBodyMedium')) break;
      card = card.parentElement;
    }
    let rating = null;
    const ratingEl = card && card.querySelector('span[aria-label*="つ星"]');
    if (ratingEl) {
      const m = ratingEl.getAttribute("aria-label").match(/([0-9.]+)/);
      if (m) rating = parseFloat(m[1]);
    }
    const infoLines = card
      ? [...card.querySelectorAll(".fontBodyMedium")]
          .map((d) => d.textContent.trim())
          .filter(Boolean)
      : [];
    // grab any href and coordinates if present
    let href = null;
    const a = card && card.querySelector("a[href]");
    if (a) href = a.getAttribute("href");
    // full text of card for parsing category/price
    const cardText = card ? card.innerText.replace(/\s+/g, " ").trim() : "";
    // Google Maps place photo (skip tiny icons)
    let image = null;
    if (card) {
      for (const img of card.querySelectorAll("img")) {
        const src = img.src || img.getAttribute("src");
        if (!src || src.startsWith("data:")) continue;
        if (img.width > 0 && img.width < 40) continue;
        if (/googleusercontent|ggpht|gstatic.*maps/i.test(src)) {
          image = src;
          break;
        }
      }
    }
    out.push({ name, rating, info: infoLines.slice(0, 6), href, cardText, image });
  }
  return out;
});

// dedupe by name
const seen = new Set();
const uniq = places.filter((p) => {
  if (seen.has(p.name)) return false;
  seen.add(p.name);
  return true;
});

console.log(JSON.stringify({ list: listName, count: uniq.length, places: uniq }, null, 2));
await browser.close();

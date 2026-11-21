// Mobile layout check: loads the app at common phone viewports and fails if
// the layout isn't phone-friendly. Run with `npm run check:mobile`.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium, devices } from "playwright";

const ROOT = process.cwd();
const PHONES = ["iPhone SE", "iPhone 13", "Pixel 5", "Galaxy S9+"];
const MIN_TAP = 32;        // px, smallest allowed button/link/input side
const MIN_INPUT_FONT = 16; // px, smaller makes iOS Safari zoom on focus
const MIN_TEXT_FONT = 11;  // px, smallest readable text

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".ttf": "font/ttf", ".png": "image/png", ".svg": "image/svg+xml",
  ".json": "application/json", ".jpg": "image/jpeg", ".gif": "image/gif" };

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = normalize(join(ROOT, path === "/" ? "index.html" : path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); // e.g. PW_CHANNEL=msedge locally
const failures = [];

for (const name of PHONES) {
  const ctx = await browser.newContext({ ...devices[name] });
  const page = await ctx.newPage();
  // External services (Firebase, fonts, APIs) aren't needed to check layout.
  await page.route((u) => !u.href.startsWith(url), (r) => r.abort());
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(500);

  const problems = await page.evaluate(({ MIN_TAP, MIN_INPUT_FONT, MIN_TEXT_FONT }) => {
    const out = [];
    const vw = window.innerWidth;
    const meta = document.querySelector('meta[name="viewport"]')?.content || "";
    if (!/width=device-width/.test(meta)) out.push(`viewport meta missing width=device-width`);
    if (/user-scalable=no|maximum-scale=1(\.0)?\b/.test(meta)) out.push(`viewport meta blocks zooming`);

    if (document.documentElement.scrollWidth > vw + 1)
      out.push(`page scrolls horizontally (${document.documentElement.scrollWidth}px wide > ${vw}px viewport)`);

    const label = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") +
      (el.classList.length ? "." + [...el.classList].join(".") : "");
    const visible = (el) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0 && r.width > 0 && r.height > 0;
    };
    // Ignore things deliberately clipped by an overflow container.
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (/(hidden|auto|scroll|clip)/.test(o.overflowX)) return true;
      }
      return false;
    };

    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      if (s.position !== "fixed" && (r.right > vw + 1 || r.left < -1) && !clipped(el))
        out.push(`${label(el)} overflows the screen (left ${Math.round(r.left)}, right ${Math.round(r.right)})`);

      if (el.matches("button, a[href], input:not([type=hidden]), select, textarea, [role=button]")) {
        if (r.width < MIN_TAP || r.height < MIN_TAP)
          out.push(`${label(el)} tap target too small (${Math.round(r.width)}x${Math.round(r.height)}, min ${MIN_TAP})`);
      }
      if (el.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea") &&
          parseFloat(s.fontSize) < MIN_INPUT_FONT)
        out.push(`${label(el)} font-size ${s.fontSize} < ${MIN_INPUT_FONT}px (iOS will zoom on focus)`);

      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (ownText && parseFloat(s.fontSize) < MIN_TEXT_FONT)
        out.push(`${label(el)} text too small (${s.fontSize})`);
    }
    return [...new Set(out)];
  }, { MIN_TAP, MIN_INPUT_FONT, MIN_TEXT_FONT });

  const shot = `mobile-check-${name.replace(/\W+/g, "-")}.png`;
  await page.screenshot({ path: join("mobile-check-results", shot), fullPage: true });
  for (const p of problems) failures.push(`[${name}] ${p}`);
  console.log(`${problems.length ? "FAIL" : "ok  "} ${name} (${devices[name].viewport.width}x${devices[name].viewport.height})`);
  await ctx.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\n${failures.length} mobile layout problem(s):\n` + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("\nMobile layout check passed.");

// Mobile layout check: loads the app at common phone viewports and fails if
// the layout isn't phone-friendly. Run with `npm run check:mobile`.
//
// For each phone it uses that phone's real browser engine (iPhone → WebKit/Safari,
// Android → Chromium), then checks every screen a player sees:
//   intro → enter the island (bank pops up) → island → shop, goals, history, daily, towns → Daily Star
// It also holds the on-screen D-pad and makes sure the player actually walks,
// and checks that the on-screen controls stay hidden on a desktop computer.
import http from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium, webkit, devices } from "playwright";

const ROOT = process.cwd();
const PHONES = [
  { name: "iPhone SE", engine: "webkit" },
  { name: "iPhone 13", engine: "webkit" },
  { name: "Pixel 5", engine: "chromium" },
  { name: "Galaxy S9+", engine: "chromium" },
  { name: "iPhone 13 landscape", engine: "webkit" },
  { name: "Pixel 5 landscape", engine: "chromium" },
];
// Fixed on-screen pieces of the island HUD that must never cover each other
// (".hud-right > *" = each menu button on its own: the menu's invisible container is bigger than the buttons)
const HUD_PIECES = [".hud-left .home-title", ".hud-left .stats", ".hud-left .sky-clock", ".hud-right > *",
  ".hud-bottom .bag", ".dpad", ".town-isle"];
const PANELS = ["shop", "goals", "history", "daily", "town", "sync"]; // opened one at a time on the island
const MIN_TAP = 32;        // px, smallest allowed button/link/input side
const MIN_INPUT_FONT = 16; // px, smaller makes iOS Safari zoom on focus
const MIN_TEXT_FONT = 11;  // px, smallest readable text
const OUT = "mobile-check-results";

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".ttf": "font/ttf", ".png": "image/png", ".svg": "image/svg+xml",
  ".json": "application/json", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg" };

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
await mkdir(OUT, { recursive: true });

// Runs inside the page: layout problems on whatever is currently on screen.
function layoutProblems({ MIN_TAP, MIN_INPUT_FONT, MIN_TEXT_FONT }) {
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
}

const engines = { chromium: await chromium.launch(), webkit: await webkit.launch() };
const failures = [];
const fail = (where, msg) => failures.push(`[${where}] ${msg}`);

async function newPage(contextOptions) {
  const ctx = await (engines[contextOptions.engine] || engines.chromium).newContext({ ...contextOptions.device, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  // External services (Firebase, fonts, APIs) aren't needed to check layout.
  await page.route((u) => !u.href.startsWith(url), (r) => r.abort());
  page.on("pageerror", (e) => fail(contextOptions.where, `JavaScript error: ${e.message}`));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(500);
  return { ctx, page };
}

for (const { name, engine } of PHONES) {
  const where = `${name} · ${engine}`;
  const { ctx, page } = await newPage({ device: devices[name], engine, where });
  const shotName = (screen) => join(OUT, `mobile-check-${name.replace(/\W+/g, "-")}-${screen}.png`);
  let count = 0;
  const check = async (screen) => {
    // let one-off animations (e.g. the Daily panel sliding in from the side) finish before measuring,
    // otherwise a panel caught mid-slide looks like it overflows the screen; endless ones (bobbing) are skipped
    await page.evaluate(() => Promise.race([
      Promise.all(document.getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, 2000)),
    ]));
    const problems = await page.evaluate(layoutProblems, { MIN_TAP, MIN_INPUT_FONT, MIN_TEXT_FONT });
    await page.screenshot({ path: shotName(screen) });
    for (const p of problems) fail(`${where} · ${screen}`, p);
    count += problems.length;
  };

  // 1. intro screen
  await check("intro");

  // 2. enter the island; the bank pops up on arrival
  try {
    await page.click("#enterWorld");
    await page.waitForFunction(() => !document.body.classList.contains("intro-open"), null, { timeout: 5000 });
    await page.waitForTimeout(400);
    await check("bank");
  } catch (e) {
    fail(where, `couldn't enter the island from the intro: ${e.message.split("\n")[0]}`);
  }

  // 3. the island itself, with every pop-up closed
  await page.evaluate(() => closePanels());
  await page.waitForTimeout(200);
  await check("island");
  const overlaps = await page.evaluate((sels) => {
    const boxes = sels.flatMap((s) => [...document.querySelectorAll(s)].map((el) => [s, el]))
      .filter(([, el]) => getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0)
      .map(([s, el]) => [s, el.getBoundingClientRect()]);
    const out = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [a, ra] = boxes[i], [b, rb] = boxes[j];
      if (a === b) continue; // pieces of the same group (e.g. two menu buttons) are laid out by that group
      if (ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1) out.push(`${a} overlaps ${b}`);
    }
    return out;
  }, HUD_PIECES);
  for (const o of overlaps) fail(`${where} · island`, `HUD pieces overlap: ${o}`);
  count += overlaps.length;

  // 4. on-screen controls: visible on a phone, and holding the D-pad really walks
  const pad = await page.evaluate(() => {
    const vis = (el) => el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
    return { dpad: vis(document.querySelector(".dpad")) };
  });
  if (!pad.dpad) fail(where, "on-screen D-pad is not shown on this phone");
  if (pad.dpad) {
    let walked = false;
    for (const dir of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
      const before = await page.evaluate(() => [P.x, P.y]);
      const btn = page.locator(`[data-pad="${dir}"]`);
      await btn.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 });
      await page.waitForTimeout(600);
      await btn.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 });
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => [P.x, P.y]);
      if (after[0] !== before[0] || after[1] !== before[1]) { walked = true; break; }
    }
    if (!walked) fail(where, "holding the on-screen D-pad doesn't move the player");
    const stuck = await page.evaluate(() => Object.values(keys).some(Boolean));
    if (stuck) fail(where, "a direction stays held after letting go of the D-pad");
  }

  // 5. each pop-up, one at a time
  for (const panel of PANELS) {
    await page.evaluate((p) => { closePanels(); openPanel(p); }, panel);
    await page.waitForTimeout(400);
    await check(panel);
  }
  await page.evaluate(() => closePanels());

  // 4b. Sync window as opened from a sync link: "You're syncing to …" with the big SYNC button
  await page.evaluate(() => { closePanels(); syncOffer = "ABCDEFGHJKLM"; $("syncOfferCode").textContent = "ABCD-EFGH-JKLM"; openPanel("sync"); });
  await page.waitForTimeout(300);
  await check("sync-offer");
  await page.evaluate(() => { syncOffer = null; closePanels(); });

  // 5a. tapping Maple on the island opens her chat (there's no A button; you tap things to use them)
  const tapped = await page.evaluate(() => {
    closePanels(); followCam(true);
    const r = cv.getBoundingClientRect();
    const px = (VILLAGER.x * TILE + TILE / 2 - Math.round(cam.x)) * r.width / cv.width + r.left;
    const py = (VILLAGER.y * TILE + TILE / 2 - Math.round(cam.y)) * r.height / cv.height + r.top;
    if (px < r.left || px > r.right || py < r.top || py > r.bottom) return "off-screen";
    cv.dispatchEvent(new MouseEvent("click", { clientX: px, clientY: py, bubbles: true }));
    const open = !document.getElementById("chat").classList.contains("hidden");
    closeChat();
    return open ? "ok" : "closed";
  });
  if (tapped === "closed") fail(where, "tapping Maple doesn't open her chat");

  // 5b. Maple's chat: both portraits (player + Maple) and the Send box must stay fully on screen,
  //     with the dialogue showing and with a long History open
  const offScreen = () => ["chatMe", "chatFox", "chatForm"].filter((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1;
  });
  for (const screen of ["chat", "chat-history"]) {
    await page.evaluate((hist) => {
      const saved = S.chat;
      if (hist) S.chat = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "model" : "user", text: "A fairly long practice message about saving money, number " + i, at: Date.now() }));
      openChat();
      if (hist) { showChatHistory(true); S.chat = saved; }
    }, screen === "chat-history");
    await page.waitForTimeout(400);
    await check(screen);
    const cut = await page.evaluate(offScreen);
    for (const id of cut) fail(`${where} · ${screen}`, `#${id} is cut off the screen`);
    count += cut.length;
    await page.evaluate(() => closeChat());
  }

  // 6. the Daily Star game
  const star = await page.evaluate(() => {
    if (typeof window.startDailyStar !== "function") return false;
    window.startDailyStar();
    return true;
  });
  if (star) { await page.waitForTimeout(400); await check("daily-star"); }
  else fail(where, "Daily Star game is missing (window.startDailyStar)");

  console.log(`${count ? "FAIL" : "ok  "} ${where} (${devices[name].viewport.width}x${devices[name].viewport.height})`);
  await ctx.close();
}

// 7. a desktop computer must NOT get the on-screen controls
{
  const { ctx, page } = await newPage({ device: devices["Desktop Chrome"], engine: "chromium", where: "Desktop" });
  const shown = await page.evaluate(() => getComputedStyle(document.getElementById("touchControls")).display !== "none");
  if (shown) fail("Desktop", "on-screen controls are showing on a desktop computer (they should be phone/tablet only)");
  console.log(`${shown ? "FAIL" : "ok  "} Desktop Chrome (on-screen controls hidden)`);
  await ctx.close();
}

await Promise.all(Object.values(engines).map((b) => b.close()));
server.close();

if (failures.length) {
  console.error(`\n${failures.length} mobile problem(s):\n` + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("\nMobile check passed.");

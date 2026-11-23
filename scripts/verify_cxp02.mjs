import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = process.env.CXP02_PORT || "3102";
const BASE_URL = `http://localhost:${PORT}`;
const TARGET_URL = `${BASE_URL}/creative-lab/cinematic-journey`;
const REPORT_ASSETS_DIR = path.resolve("docs/reports/assets/cxp02");
const SCRATCH_DIR =
  process.env.CXP02_SCRATCH_DIR ||
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\\scratch";
const SCREENCAST_DIR = path.join(SCRATCH_DIR, "screencast_cxp02");
const PROFILE_DIR = path.join(SCRATCH_DIR, "chrome_profile_cxp02");

fs.mkdirSync(REPORT_ASSETS_DIR, { recursive: true });
fs.rmSync(SCREENCAST_DIR, { recursive: true, force: true });
fs.mkdirSync(SCREENCAST_DIR, { recursive: true });
fs.mkdirSync(PROFILE_DIR, { recursive: true });

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method && this.listeners.has(msg.method)) {
        for (const fn of this.listeners.get(msg.method)) fn(msg.params);
      }
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout on ${method}`));
        }
      }, 10000);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
  close() {
    this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(TARGET_URL);
      if (r.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Server on port ${PORT} did not respond`);
}

async function connectChrome(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener("open", resolve, { once: true });
          ws.addEventListener("error", reject, { once: true });
        });
        return new CdpClient(ws);
      }
    } catch {}
    await sleep(200);
  }
  throw new Error("Timed out connecting to headless Chrome CDP");
}

async function evalJs(cdp, expression) {
  const res = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || "JS evaluation failed");
  }
  return res.result?.value;
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
  });
}

async function waitPageReady(cdp) {
  await sleep(600);
  await evalJs(
    cdp,
    `new Promise(async (resolve) => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 4000); })));
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    })`,
  );
  await sleep(180);
}

async function scrollToProgress(cdp, p) {
  await evalJs(
    cdp,
    `new Promise((resolve) => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.round(max * ${p}), behavior: 'instant' });
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 110)));
    })`,
  );
}

async function capturePng(cdp, filename, dir = REPORT_ASSETS_DIR) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  const outPath = path.join(dir, filename);
  fs.writeFileSync(outPath, Buffer.from(data, "base64"));
  return outPath;
}

await waitServer();

const chrome = spawn(
  CHROME_PATH,
  [
    "--headless=new",
    "--remote-debugging-port=9241",
    `--user-data-dir=${PROFILE_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu-sandbox",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const report = {
  screenshots: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  overflowChecks: {},
  performance: {},
  tripSwitcherCheck: {},
  conciergeModalCheck: {},
  scrollRestoration: {},
  reducedMotion: {},
  regressionRoutes: {},
  screencast: { frames: 0, wheelForward: 0, wheelReverse: 0, webmPath: null, webmBytes: 0 },
};

try {
  const cdp = await connectChrome(9241);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");

  const reqUrls = new Map();
  cdp.on("Network.requestWillBeSent", (p) => reqUrls.set(p.requestId, p.request.url));
  cdp.on("Network.loadingFailed", (p) => {
    report.failedRequests.push({ url: reqUrls.get(p.requestId), error: p.errorText });
  });
  cdp.on("Runtime.exceptionThrown", (params) => {
    report.pageErrors.push(params.exceptionDetails?.text || "Runtime exception");
  });
  cdp.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") {
      report.consoleErrors.push(params.args.map((a) => a.value ?? a.description).join(" "));
    }
  });

  // 1. Desktop 1440x900 full 6-movement captures
  await setViewport(cdp, 1440, 900, false);
  await cdp.send("Page.navigate", { url: TARGET_URL });
  await waitPageReady(cdp);

  const desktopPoints = [
    [0.0, "01_identity.png"],
    [0.14, "02_passage_a.png"],
    [0.26, "03_world.png"],
    [0.355, "04_colonnade_handoff.png"],
    [0.44, "05_human_moment.png"],
    [0.53, "06_human_to_discovery.png"],
    [0.64, "07_discovery_ribbon.png"],
    [0.77, "08_discovery_to_journey.png"],
    [0.83, "09_your_journey.png"],
    [0.96, "10_ai_concierge.png"],
  ];

  for (const [p, name] of desktopPoints) {
    await scrollToProgress(cdp, p);
    report.screenshots.push(await capturePng(cdp, name));
  }

  // 2. Genuine CDP Screencast (forward 0 -> 1 & reverse 1 -> 0 across all 6 movements)
  await scrollToProgress(cdp, 0.0);
  await sleep(250);
  let frameCount = 0;
  cdp.on("Page.screencastFrame", async (params) => {
    const idx = frameCount++;
    fs.writeFileSync(
      path.join(SCREENCAST_DIR, `sc_${String(idx).padStart(4, "0")}.jpg`),
      Buffer.from(params.data, "base64"),
    );
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId: params.sessionId });
    } catch {}
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 84, everyNthFrame: 1 });
  await sleep(250);

  // Total scrollable height ~8820px -> 76 wheel steps of 120px forward, then 76 reverse
  for (let i = 0; i < 76; i++) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 720,
      y: 450,
      deltaX: 0,
      deltaY: 120,
    });
    report.screencast.wheelForward++;
    await sleep(48);
  }
  await sleep(400);
  for (let i = 0; i < 76; i++) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 720,
      y: 450,
      deltaX: 0,
      deltaY: -120,
    });
    report.screencast.wheelReverse++;
    await sleep(45);
  }
  await sleep(300);
  await cdp.send("Page.stopScreencast");
  report.screencast.frames = frameCount;
  report.screencastEndScrollY = await evalJs(cdp, "window.scrollY");

  // 3. Test Your Journey interactive trip rhythm switcher at p = 0.83
  await scrollToProgress(cdp, 0.83);
  report.tripSwitcherCheck = await evalJs(
    cdp,
    `(() => {
      const buttons = Array.from(document.querySelectorAll('.cxp02-trip-pill'));
      const beforeDays = document.querySelectorAll('.cxp02-day-item').length;
      if (buttons[1]) buttons[1].click();
      return new Promise((resolve) => requestAnimationFrame(() => {
        const afterDays = document.querySelectorAll('.cxp02-day-item').length;
        const linkHref = document.querySelector('.cxp02-itinerary-meta a')?.getAttribute('href');
        if (buttons[0]) buttons[0].click();
        resolve({ buttonCount: buttons.length, beforeDays, afterDays, switchedHref: linkHref });
      }));
    })()`,
  );

  // 4. Test real UX-1 Concierge modal trigger at p = 0.96
  await scrollToProgress(cdp, 0.96);
  await evalJs(
    cdp,
    `(() => {
      const btn = document.querySelector('.cxp02-concierge-actions [data-concierge-trigger]');
      if (btn) btn.click();
    })()`,
  );
  await sleep(350);
  report.conciergeModalCheck = await evalJs(
    cdp,
    `(() => {
      const dialog = document.querySelector('dialog.concierge-dialog');
      return {
        found: Boolean(dialog),
        isOpen: Boolean(dialog?.open),
        headingText: dialog?.querySelector('h2')?.textContent?.trim() ?? null,
      };
    })()`,
  );
  report.screenshots.push(await capturePng(cdp, "11_concierge_modal_open.png"));
  await evalJs(
    cdp,
    `(() => {
      const closeBtn = Array.from(document.querySelectorAll('dialog.concierge-dialog button')).find((b) => b.textContent?.includes('Đóng'));
      if (closeBtn) closeBtn.click();
      else document.querySelector('dialog.concierge-dialog')?.close();
    })()`,
  );
  await sleep(150);

  // Performance metrics
  report.performance = await evalJs(
    cdp,
    `(() => {
      const resources = performance.getEntriesByType('resource');
      let jsBytes = 0, imgBytes = 0, cssBytes = 0;
      for (const r of resources) {
        const size = r.transferSize || r.encodedBodySize || 0;
        if (r.initiatorType === 'script' || r.name.endsWith('.js')) jsBytes += size;
        else if (r.initiatorType === 'img' || /\\.(jpg|jpeg|png|webp|avif)$/i.test(r.name)) imgBytes += size;
        else if (r.initiatorType === 'link' || r.name.endsWith('.css')) cssBytes += size;
      }
      const cls = performance.getEntriesByType('layout-shift').reduce((s, e) => s + (e.hadRecentInput ? 0 : e.value), 0);
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        jsTransferKB: Math.round(jsBytes / 1024),
        imgTransferKB: Math.round(imgBytes / 1024),
        cssTransferKB: Math.round(cssBytes / 1024),
        domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        loadEventMs: nav ? Math.round(nav.loadEventEnd) : null,
        cls: Number(cls.toFixed(4)),
      };
    })()`,
  );

  // 5. Scroll restoration on reload at p = 0.64 (Discovery)
  await scrollToProgress(cdp, 0.64);
  const beforeReloadY = await evalJs(cdp, "window.scrollY");
  await cdp.send("Page.reload", {});
  await waitPageReady(cdp);
  report.scrollRestoration = await evalJs(
    cdp,
    `({
      beforeReloadY: ${beforeReloadY},
      afterReloadY: window.scrollY,
      movement: document.querySelector('[aria-live="polite"]')?.textContent?.trim(),
    })`,
  );

  // 6. Responsive overflow checks across all 6 viewports
  for (const [w, h, mobile] of [
    [1920, 1080, false],
    [1440, 900, false],
    [1024, 768, false],
    [768, 1024, false],
    [390, 844, true],
    [360, 800, true],
  ]) {
    await setViewport(cdp, w, h, mobile);
    await sleep(140);
    await scrollToProgress(cdp, 0.64);
    report.overflowChecks[`${w}x${h}`] = await evalJs(
      cdp,
      `({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, ok: document.documentElement.scrollWidth <= window.innerWidth })`,
    );
  }

  // 7. Mobile 390x844 captures across new acts
  await setViewport(cdp, 390, 844, true);
  await cdp.send("Page.navigate", { url: TARGET_URL });
  await waitPageReady(cdp);
  for (const [p, name] of [
    [0.0, "12_mobile_opening.png"],
    [0.64, "13_mobile_discovery.png"],
    [0.83, "14_mobile_journey.png"],
    [0.96, "15_mobile_concierge.png"],
  ]) {
    await scrollToProgress(cdp, p);
    report.screenshots.push(await capturePng(cdp, name));
  }

  // 8. Reduced-motion fallback check
  await setViewport(cdp, 1440, 900, false);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await cdp.send("Page.navigate", { url: TARGET_URL });
  await waitPageReady(cdp);
  report.reducedMotion = await evalJs(
    cdp,
    `({
      mode: document.querySelector('main')?.getAttribute('data-cxp02-mode'),
      sections: document.querySelectorAll('main section').length,
      hasDestinationLink: Boolean(document.querySelector('a[href="/destinations/da-lat"]')),
      hasTripLink: Boolean(document.querySelector('a[href="/trips/da-lat-3-ngay"]')),
      hasConciergeTrigger: Boolean(document.querySelector('[data-concierge-trigger]')),
    })`,
  );
  report.screenshots.push(await capturePng(cdp, "16_reduced_motion.png"));

  // 9. Regression routes: CXP-01S, /ai-planner, /destinations/da-lat, /
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  for (const [key, route] of [
    ["cxp01", "/creative-lab/typography-world"],
    ["aiPlanner", "/ai-planner"],
    ["destinationDaLat", "/destinations/da-lat"],
    ["home", "/"],
  ]) {
    await cdp.send("Page.navigate", { url: `${BASE_URL}${route}` });
    await waitPageReady(cdp);
    report.regressionRoutes[key] = await evalJs(cdp, "document.title");
  }

  cdp.close();
} finally {
  chrome.kill();
}

// Encode VP9 WebM from captured CDP screencast frames
const ff = path.join(process.env.LOCALAPPDATA || "", "ms-playwright", "ffmpeg-1013", "ffmpeg-win64.exe");
if (fs.existsSync(ff)) {
  const files = fs.readdirSync(SCREENCAST_DIR).filter((f) => f.endsWith(".jpg")).sort();
  const mjpeg = path.join(SCRATCH_DIR, "screencast_cxp02.mjpeg");
  const webmOut = path.join(SCRATCH_DIR, "cxp02_motion_proof.webm");
  fs.writeFileSync(mjpeg, Buffer.concat(files.map((f) => fs.readFileSync(path.join(SCREENCAST_DIR, f)))));
  const res = spawnSync(ff, [
    "-y",
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "-framerate",
    "24",
    "-i",
    mjpeg,
    "-c:v",
    "libvpx-vp9",
    "-crf",
    "30",
    "-b:v",
    "0",
    webmOut,
  ]);
  if (res.status === 0 && fs.existsSync(webmOut)) {
    report.screencast.webmPath = webmOut;
    report.screencast.webmBytes = fs.statSync(webmOut).size;
  }
}

fs.writeFileSync(path.join(SCRATCH_DIR, "verify_cxp02_report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (
  report.consoleErrors.length > 0 ||
  report.pageErrors.length > 0 ||
  report.failedRequests.length > 0 ||
  !report.conciergeModalCheck.isOpen ||
  report.tripSwitcherCheck.afterDays !== 2 ||
  Object.values(report.overflowChecks).some((o) => !o.ok)
) {
  process.exitCode = 1;
}

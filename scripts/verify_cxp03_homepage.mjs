import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = process.env.CXP03_PORT || "3103";
const BASE_URL = process.env.ADORA_WEB_URL || `http://127.0.0.1:${PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = Number(process.env.CXP03_CDP_PORT || 9243);
const SCRATCH_DIR =
  process.env.CXP03_SCRATCH_DIR || path.join(os.tmpdir(), "adora-cxp03-scratch");
const REPORT_ASSETS_DIR =
  process.env.CXP03_OUTPUT_DIR ||
  path.resolve(process.cwd(), "docs/reports/assets/cxp03");

fs.mkdirSync(SCRATCH_DIR, { recursive: true });
fs.mkdirSync(REPORT_ASSETS_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForCdp(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      // retry
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for Chrome CDP");
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  const openPromise = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", (err) => reject(err));
  });

  ws.addEventListener("message", (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id) {
      const entry = pending.get(msg.id);
      if (entry) {
        pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(msg.error.message));
        else entry.resolve(msg.result);
      }
    } else if (msg.method) {
      const handlers = listeners.get(msg.method) || [];
      for (const h of handlers) h(msg.params);
    }
  });

  return {
    ready: openPromise,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, fn) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(fn);
    },
    off(method, fn) {
      const list = listeners.get(method);
      if (!list) return;
      listeners.set(
        method,
        list.filter((f) => f !== fn),
      );
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(client, expression) {
  const res = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(
      `Eval error: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`,
    );
  }
  return res.result?.value;
}

async function screenshot(client, filename) {
  const { data } = await client.send("Page.captureScreenshot", { format: "png" });
  const outPath = path.join(REPORT_ASSETS_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(data, "base64"));
  return outPath;
}

async function scrollToProgress(client, progress) {
  await evaluate(
    client,
    `(() => {
      const runway = document.querySelector('[data-cxp02-runway]');
      if (!runway) return;
      const scrollable = Math.max(1, runway.offsetHeight - window.innerHeight);
      window.scrollTo({ top: Math.round(scrollable * ${progress}), behavior: 'instant' });
    })()`,
  );
  await sleep(160);
}

async function recordWheelSegment(client, dirName, outWebm, steps, deltaY) {
  const framesDir = path.join(SCRATCH_DIR, dirName);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  let frameIdx = 0;

  const onFrame = async (params) => {
    const idx = frameIdx++;
    fs.writeFileSync(
      path.join(framesDir, `frame_${String(idx).padStart(4, "0")}.jpg`),
      Buffer.from(params.data, "base64"),
    );
    try {
      await client.send("Page.screencastFrameAck", { sessionId: params.sessionId });
    } catch {
      // ignore if stopped
    }
  };

  client.on("Page.screencastFrame", onFrame);
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 80,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1,
  });

  await sleep(250);
  for (let i = 0; i < steps; i++) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 640,
      y: 360,
      deltaX: 0,
      deltaY,
    });
    await sleep(36);
  }
  await sleep(300);

  await client.send("Page.stopScreencast");
  client.off("Page.screencastFrame", onFrame);
  await sleep(200);

  const webmPath = path.join(SCRATCH_DIR, outWebm);
  const ffPath = path.join(
    process.env.LOCALAPPDATA || "",
    "ms-playwright",
    "ffmpeg-1013",
    "ffmpeg-win64.exe",
  );
  const ffmpegBin = fs.existsSync(ffPath) ? ffPath : "ffmpeg";
  const files = fs
    .readdirSync(framesDir)
    .filter((f) => f.endsWith(".jpg"))
    .sort();
  let encoded = false;
  if (files.length > 0) {
    const mjpeg = path.join(SCRATCH_DIR, `${dirName}.mjpeg`);
    fs.writeFileSync(
      mjpeg,
      Buffer.concat(files.map((f) => fs.readFileSync(path.join(framesDir, f)))),
    );
    const ff = spawnSync(
      ffmpegBin,
      [
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
        "32",
        "-b:v",
        "0",
        webmPath,
      ],
      { stdio: "ignore" },
    );
    encoded = ff.status === 0 && fs.existsSync(webmPath);
  }

  return {
    frames: frameIdx,
    webmPath: encoded ? webmPath : null,
    webmBytes: encoded ? fs.statSync(webmPath).size : 0,
  };
}

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "adora-cxp03-chrome-"));
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  const report = {
    baseUrl: BASE_URL,
    screenshots: [],
    headerOwnership: null,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    overflowChecks: {},
    performance: {},
    tripSwitcherCheck: null,
    conciergeModalCheck: null,
    scrollRestoration: null,
    reducedMotion: null,
    motionOffAttr: null,
    noJsFallback: null,
    mobileMenuCheck: null,
    floatingVisibility: { desktop: {}, mobile: {} },
    routeNavigation: {},
    recordings: {},
  };

  try {
    await waitForCdp(CDP_PORT);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
    const pageTarget = targets.find((t) => t.type === "page");
    if (!pageTarget) throw new Error("No page target found");

    const client = createCdpClient(pageTarget.webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");

    let scriptDisabled = false;
    client.on("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error") {
        report.consoleErrors.push(p.args.map((a) => a.value ?? a.description).join(" "));
      }
    });
    client.on("Runtime.exceptionThrown", (p) => {
      report.pageErrors.push(p.exceptionDetails.text);
    });
    client.on("Network.loadingFailed", (p) => {
      if (!p.canceled && !(scriptDisabled && p.type === "Script")) {
        report.failedRequests.push(`${p.type}: ${p.errorText}`);
      }
    });

    // 1. Desktop 1440x900 Production Homepage Audit
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(1600);

    // Performance & LCP/CLS/LongTasks
    report.performance = await evaluate(
      client,
      `new Promise((resolve) => {
        let cls = 0;
        let lcp = 0;
        let longTaskMs = 0;
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length) lcp = Math.round(entries[entries.length - 1].startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) longTaskMs += Math.round(entry.duration);
          }).observe({ type: 'longtask', buffered: true });
        } catch {}
        setTimeout(() => {
          const resources = performance.getEntriesByType('resource');
          const jsBytes = resources.filter(r => r.initiatorType === 'script' || r.name.endsWith('.js')).reduce((a, r) => a + (r.transferSize || 0), 0);
          const imgBytes = resources.filter(r => r.initiatorType === 'img' || /\\.(jpg|jpeg|png|webp)$/i.test(r.name)).reduce((a, r) => a + (r.transferSize || 0), 0);
          const cssBytes = resources.filter(r => r.name.endsWith('.css')).reduce((a, r) => a + (r.transferSize || 0), 0);
          const nav = performance.getEntriesByType('navigation')[0];
          resolve({
            jsTransferKB: Math.round(jsBytes / 1024),
            imgTransferKB: Math.round(imgBytes / 1024),
            cssTransferKB: Math.round(cssBytes / 1024),
            domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
            loadEventMs: nav ? Math.round(nav.loadEventEnd) : 0,
            lcpMs: lcp,
            cls: Number(cls.toFixed(4)),
            longTaskMs,
          });
        }, 400);
      })`,
    );

    // Header & semantic landmark ownership check
    report.headerOwnership = await evaluate(
      client,
      `(() => {
        const headers = document.querySelectorAll('header');
        const footers = document.querySelectorAll('footer');
        const h1s = document.querySelectorAll('h1');
        const mains = document.querySelectorAll('main');
        const labHeader = document.querySelector('.cxp01-chrome-header');
        const openingCta = document.querySelector('.cxp01-opening-overlay [data-concierge-trigger], .cxp01-opening-overlay .cxp03-opening-cta');
        const outerFrame = document.querySelector('.cxp01-outer-frame')?.getBoundingClientRect();
        const railInner = document.querySelector('.cxp01-chrome-footer-inner')?.getBoundingClientRect();
        const railAligned = Boolean(
          outerFrame &&
            railInner &&
            Math.abs(outerFrame.left - railInner.left) <= 2 &&
            Math.abs(outerFrame.right - railInner.right) <= 2,
        );
        const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.getAttribute('loading') !== 'lazy');
        const brokenImgs = imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
        return {
          headerCount: headers.length,
          footerCount: footers.length,
          h1Count: h1s.length,
          mainCount: mains.length,
          hasLabHeader: Boolean(labHeader),
          hasInHeroCta: Boolean(openingCta),
          railAlignedWithFrame: railAligned,
          brokenEagerImages: brokenImgs,
          h1Text: h1s[0]?.textContent?.trim() || '',
        };
      })()`,
    );

    // Desktop 6-movement captures + Floating Concierge movement visibility matrix
    const desktopCaptures = [
      { p: 0.0, name: "01_home_identity.png", key: "m01_start", expectFloating: false },
      { p: 0.13, name: "02_home_passage_a.png", key: "m01_passage", expectFloating: false },
      { p: 0.255, name: "03_home_world.png", key: "m02_world", expectFloating: true },
      { p: 0.355, name: "04_home_colonnade_handoff.png", key: "m02_colonnade", expectFloating: true },
      { p: 0.44, name: "05_home_human_moment.png", key: "m03_human", expectFloating: true },
      { p: 0.62, name: "06_home_discovery_ribbon.png", key: "m04_discovery", expectFloating: true },
      { p: 0.83, name: "07_home_your_journey.png", key: "m05_journey", expectFloating: true },
      { p: 0.97, name: "08_home_ai_concierge.png", key: "m06_concierge", expectFloating: false },
    ];
    for (const c of desktopCaptures) {
      await scrollToProgress(client, c.p);
      const vis = await evaluate(
        client,
        "(() => { const el = document.querySelector('a.concierge-floating'); return Boolean(el && el.checkVisibility()); })()",
      );
      report.floatingVisibility.desktop[c.key] = { visible: vis, expected: c.expectFloating, ok: vis === c.expectFloating };
      report.screenshots.push(await screenshot(client, c.name));
    }
    // Check M01 near-end (0.17), M06 start (0.90), and reverse scroll back to M04 (0.62) & M01 (0.0)
    for (const [key, p, exp] of [
      ["m01_end", 0.17, false],
      ["m06_start", 0.9, false],
      ["rev_m04", 0.62, true],
      ["rev_m01", 0.0, false],
    ]) {
      await scrollToProgress(client, p);
      const vis = await evaluate(
        client,
        "(() => { const el = document.querySelector('a.concierge-floating'); return Boolean(el && el.checkVisibility()); })()",
      );
      report.floatingVisibility.desktop[key] = { visible: vis, expected: exp, ok: vis === exp };
    }

    // Interactive Itinerary Switcher Check (Movement 05)
    await scrollToProgress(client, 0.83);
    report.tripSwitcherCheck = await evaluate(
      client,
      `(() => {
        const pills = Array.from(document.querySelectorAll('.cxp02-trip-pill'));
        const beforeDays = document.querySelectorAll('.cxp02-day-item').length;
        if (pills[1]) pills[1].click();
        return new Promise((resolve) => setTimeout(() => {
          const afterDays = document.querySelectorAll('.cxp02-day-item').length;
          const tripLink = document.querySelector('.cxp02-itinerary-meta a')?.getAttribute('href');
          resolve({ buttonCount: pills.length, beforeDays, afterDays, switchedHref: tripLink });
        }, 120));
      })()`,
    );

    // Interactive Concierge Modal Check from Movement 06 + Scroll Position Preservation
    await scrollToProgress(client, 0.97);
    const scrollBeforeModal = await evaluate(client, "window.scrollY");
    report.conciergeModalCheck = await evaluate(
      client,
      `(() => {
        const trigger = document.querySelector('.cxp02-concierge-actions [data-concierge-trigger]');
        if (!trigger) return { found: false };
        trigger.click();
        return new Promise((resolve) => setTimeout(() => {
          const dlg = document.querySelector('dialog.concierge-dialog');
          const open = Boolean(dlg && dlg.open);
          const heading = dlg?.querySelector('#concierge-title')?.textContent?.trim() || null;
          resolve({ found: true, isOpen: open, headingText: heading });
        }, 500));
      })()`,
    );
    report.screenshots.push(await screenshot(client, "09_home_concierge_modal_open.png"));
    await client.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await client.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await sleep(250);
    const scrollAfterModal = await evaluate(client, "window.scrollY");
    report.conciergeModalCheck.scrollPreserved = Math.abs(scrollAfterModal - scrollBeforeModal) <= 2;

    // Footer screenshot at absolute bottom + floating hidden check
    await evaluate(client, "window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })");
    await sleep(250);
    const footerFloatingVis = await evaluate(
      client,
      "(() => { const el = document.querySelector('a.concierge-floating'); return Boolean(el && el.checkVisibility()); })()",
    );
    report.floatingVisibility.desktop.footer = {
      visible: footerFloatingVis,
      expected: false,
      ok: footerFloatingVis === false,
    };
    report.screenshots.push(await screenshot(client, "10_home_footer.png"));

    // Mid-scroll Reload & Scroll Restoration Check
    await scrollToProgress(client, 0.62);
    const beforeReloadY = await evaluate(client, "window.scrollY");
    await client.send("Page.reload", {});
    await sleep(1100);
    report.scrollRestoration = await evaluate(
      client,
      `({
        beforeReloadY: ${beforeReloadY},
        afterReloadY: window.scrollY,
        movement: document.querySelector('[data-cxp03-movement]')?.getAttribute('data-cxp03-movement') || '',
      })`,
    );

    // 2. Motion Recordings (Desktop Forward + Reverse)
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluate(client, "window.scrollTo({ top: 0, behavior: 'instant' })");
    await sleep(300);
    report.recordings.desktopForward = await recordWheelSegment(
      client,
      "frames_desktop_fwd",
      "cxp03_forward_motion.webm",
      82,
      140,
    );
    report.recordings.desktopReverse = await recordWheelSegment(
      client,
      "frames_desktop_rev",
      "cxp03_reverse_motion.webm",
      86,
      -140,
    );

    // 3. Responsive 6-Viewport Overflow Matrix & Mobile Captures
    const viewports = [
      { name: "1920x1080", w: 1920, h: 1080, mobile: false },
      { name: "1440x900", w: 1440, h: 900, mobile: false },
      { name: "1024x768", w: 1024, h: 768, mobile: false },
      { name: "768x1024", w: 768, h: 1024, mobile: false },
      { name: "390x844", w: 390, h: 844, mobile: true },
      { name: "360x800", w: 360, h: 800, mobile: true },
    ];
    for (const vp of viewports) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await sleep(220);
      await scrollToProgress(client, 0.62);
      const ov = await evaluate(
        client,
        `({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })`,
      );
      report.overflowChecks[vp.name] = { ...ov, ok: ov.scrollWidth <= ov.innerWidth };
    }

    // Mobile 390x844 narrative screenshots + mobile menu + mobile recording
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(280);
    const mobileShots = [
      { p: 0.0, name: "11_mobile_opening.png", key: "m01_start", expectFloating: false },
      { p: 0.44, name: "12_mobile_human.png", key: "m03_human", expectFloating: true },
      { p: 0.62, name: "13_mobile_discovery.png", key: "m04_discovery", expectFloating: true },
      { p: 0.83, name: "14_mobile_journey.png", key: "m05_journey", expectFloating: true },
      { p: 0.97, name: "15_mobile_concierge.png", key: "m06_concierge", expectFloating: false },
    ];
    for (const m of mobileShots) {
      await scrollToProgress(client, m.p);
      const vis = await evaluate(
        client,
        "(() => { const el = document.querySelector('a.concierge-floating'); return Boolean(el && el.checkVisibility()); })()",
      );
      report.floatingVisibility.mobile[m.key] = { visible: vis, expected: m.expectFloating, ok: vis === m.expectFloating };
      report.screenshots.push(await screenshot(client, m.name));
    }

    // Mobile Menu usability check above cinematic stage
    await scrollToProgress(client, 0.0);
    report.mobileMenuCheck = await evaluate(
      client,
      `(() => {
        const btn = document.querySelector('button[aria-controls="mobile-navigation"]');
        if (!btn) return { found: false };
        btn.click();
        return new Promise((resolve) => setTimeout(() => {
          const nav = document.querySelector('#mobile-navigation');
          const expanded = btn.getAttribute('aria-expanded');
          const links = nav ? nav.querySelectorAll('a').length : 0;
          const zHeader = parseInt(getComputedStyle(document.querySelector('header')).zIndex || '0', 10);
          btn.click();
          resolve({ found: true, expanded, links, headerZIndex: zHeader });
        }, 120));
      })()`,
    );

    // Mobile scroll recording
    await evaluate(client, "window.scrollTo({ top: 0, behavior: 'instant' })");
    await sleep(250);
    report.recordings.mobileForward = await recordWheelSegment(
      client,
      "frames_mobile_fwd",
      "cxp03_mobile_motion.webm",
      60,
      140,
    );

    // 4. Reduced Motion Verification
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await sleep(300);
    await evaluate(client, "window.scrollTo({ top: 0, behavior: 'instant' })");
    await sleep(200);
    report.reducedMotion = await evaluate(
      client,
      `({
        mode: document.querySelector('main')?.getAttribute('data-cxp02-mode'),
        sections: document.querySelectorAll('main > section').length,
        hasDestinationLink: Boolean(document.querySelector('a[href="/destinations/da-lat"]')),
        hasTripLink: Boolean(document.querySelector('a[href^="/trips/"]')),
        hasConciergeTrigger: Boolean(document.querySelector('[data-concierge-trigger]')),
        hasFooter: Boolean(document.querySelector('footer')),
      })`,
    );
    report.screenshots.push(await screenshot(client, "16_reduced_motion.png"));
    await client.send("Emulation.setEmulatedMedia", { features: [] });
    await sleep(250);

    // 5. html[data-motion="off"] Verification
    report.motionOffAttr = await evaluate(
      client,
      `(() => {
        document.documentElement.setAttribute('data-motion', 'off');
        return new Promise((resolve) => setTimeout(() => {
          const mode = document.querySelector('main')?.getAttribute('data-cxp02-mode');
          document.documentElement.removeAttribute('data-motion');
          resolve({ modeWhenOff: mode });
        }, 180));
      })()`,
    );

    // 6. No-JS Fallback Verification
    scriptDisabled = true;
    await client.send("Emulation.setScriptExecutionDisabled", { value: true });
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(900);
    report.noJsFallback = await evaluate(
      client,
      `({
        h1Count: document.querySelectorAll('h1').length,
        headerCount: document.querySelectorAll('header').length,
        footerCount: document.querySelectorAll('footer').length,
        hasLoadingSkeleton: Boolean(document.querySelector('[aria-busy="true"]')),
        openingPaintedHeight: Math.round(document.querySelector('.cxp01-opening-overlay')?.getBoundingClientRect().height || 0),
        discoveryOpacity: getComputedStyle(document.querySelector('.cxp02-discovery-layer')).opacity,
        journeyOpacity: getComputedStyle(document.querySelector('.cxp02-journey-overlay')).opacity,
        conciergeOpacity: getComputedStyle(document.querySelector('.cxp02-concierge-overlay')).opacity,
        hasDestinationLink: Boolean(document.querySelector('a[href="/destinations/da-lat"]')),
        hasAiPlannerLink: Boolean(document.querySelector('a[href="/ai-planner"]')),
      })`,
    );
    report.screenshots.push(await screenshot(client, "17_no_js_fallback.png"));
    await client.send("Emulation.setScriptExecutionDisabled", { value: false });
    scriptDisabled = false;

    // 7. Route Navigation Checks
    const routes = [
      ["destinationDaLat", "/destinations/da-lat"],
      ["experiencePine", "/experiences/rung-thong-binh-minh"],
      ["tripDaLat", "/trips/da-lat-3-ngay"],
      ["aiPlanner", "/ai-planner"],
      ["labCxp02", "/creative-lab/cinematic-journey"],
    ];
    for (const [key, r] of routes) {
      await client.send("Page.navigate", { url: `${BASE_URL}${r}` });
      await sleep(700);
      report.routeNavigation[key] = await evaluate(
        client,
        `({ title: document.title, h1Count: document.querySelectorAll('h1').length })`,
      );
    }

    client.close();
  } finally {
    chrome.kill();
    await sleep(400);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  const reportPath = path.join(SCRATCH_DIR, "verify_cxp03_homepage.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed =
    report.consoleErrors.length > 0 ||
    report.pageErrors.length > 0 ||
    report.failedRequests.length > 0 ||
    report.headerOwnership?.headerCount !== 1 ||
    report.headerOwnership?.footerCount !== 1 ||
    report.headerOwnership?.h1Count !== 1 ||
    report.headerOwnership?.hasLabHeader !== false ||
    report.headerOwnership?.hasInHeroCta !== false ||
    report.headerOwnership?.railAlignedWithFrame !== true ||
    (report.headerOwnership?.brokenEagerImages?.length ?? 0) > 0 ||
    Object.values(report.overflowChecks).some((o) => !o.ok) ||
    Object.values(report.floatingVisibility.desktop).some((v) => !v.ok) ||
    Object.values(report.floatingVisibility.mobile).some((v) => !v.ok) ||
    !report.conciergeModalCheck?.isOpen ||
    !report.conciergeModalCheck?.scrollPreserved ||
    report.reducedMotion?.mode !== "reduced-motion" ||
    report.motionOffAttr?.modeWhenOff !== "reduced-motion" ||
    report.noJsFallback?.hasLoadingSkeleton !== false ||
    (report.noJsFallback?.openingPaintedHeight ?? 0) < 100 ||
    report.noJsFallback?.discoveryOpacity !== "1" ||
    report.noJsFallback?.conciergeOpacity !== "1";

  if (failed) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

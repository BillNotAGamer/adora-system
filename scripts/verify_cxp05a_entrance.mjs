import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = process.env.CXP05A_PORT || "3105";
const BASE_URL = process.env.ADORA_WEB_URL || `http://127.0.0.1:${PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT_DESKTOP = Number(process.env.CXP05A_CDP_PORT || 9261);
const CDP_PORT_MOBILE = Number(process.env.CXP05A_CDP_MOBILE_PORT || 9262);
const SCRATCH_DIR =
  process.env.CXP05A_SCRATCH_DIR || path.join(os.tmpdir(), "adora-cxp05a-scratch");
const REPORT_ASSETS_DIR =
  process.env.CXP05A_OUTPUT_DIR ||
  path.resolve(process.cwd(), "docs/reports/assets/cxp05a");

fs.mkdirSync(SCRATCH_DIR, { recursive: true });
fs.mkdirSync(REPORT_ASSETS_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FF_BIN = (() => {
  const candidate = path.join(
    process.env.LOCALAPPDATA || "",
    "ms-playwright",
    "ffmpeg-1013",
    "ffmpeg-win64.exe",
  );
  return fs.existsSync(candidate) ? candidate : "ffmpeg";
})();

async function waitForCdp(port) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(150);
  }
  throw new Error(`Timed out waiting for Chrome CDP on ${port}`);
}

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  const ready = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
  });

  ws.addEventListener("message", (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id) {
      const p = pending.get(msg.id);
      if (p) {
        pending.delete(msg.id);
        if (msg.error) p.rej(new Error(msg.error.message));
        else p.res(msg.result);
      }
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) || []) fn(msg.params);
    }
  });

  return {
    ready,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((res, rej) => {
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, fn) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(fn);
    },
    off(method, fn) {
      listeners.set(method, (listeners.get(method) || []).filter((f) => f !== fn));
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
    throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
  }
  return res.result?.value;
}

async function pressKey(client, key, code, keyCode) {
  const ev = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", ...ev });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...ev });
}

function gitHeadSha() {
  const res = spawnSync("git", ["-c", "safe.directory=*", "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  return (res.stdout || "").trim() || "unknown";
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function inspectAndVerifyWebm(webmPath) {
  const probePng = path.join(SCRATCH_DIR, "decode_probe.png");
  const info = spawnSync(
    FF_BIN,
    ["-y", "-v", "info", "-i", webmPath, "-frames:v", "1", "-f", "image2", probePng],
    { encoding: "utf8" },
  );
  const decodeOk = info.status === 0 && fs.existsSync(probePng) && fs.statSync(probePng).size > 0;
  fs.rmSync(probePng, { force: true });
  const stderr = `${info.stderr || ""}`;
  const streamMatch = stderr.match(
    /Video:\s+([^,]+).*?,\s+(\d+)x(\d+)[^,\n]*?(?:SAR\s+([0-9:]+)\s+DAR\s+([0-9:]+))?.*?(\d+(?:\.\d+)?)\s+fps/,
  );
  const durMatch = stderr.match(/Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const durationSec = durMatch
    ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
    : 0;
  return {
    decodeOk,
    codec: streamMatch?.[1]?.trim() || "unknown",
    width: streamMatch ? Number(streamMatch[2]) : 0,
    height: streamMatch ? Number(streamMatch[3]) : 0,
    sar: streamMatch?.[4] || "1:1",
    dar: streamMatch?.[5] || (streamMatch ? `${streamMatch[2]}:${streamMatch[3]}` : "unknown"),
    fps: streamMatch ? Number(streamMatch[6]) : 0,
    durationSec: Number(durationSec.toFixed(2)),
    bytes: fs.existsSync(webmPath) ? fs.statSync(webmPath).size : 0,
  };
}

/**
 * Wall-clock synchronized CDP screencast recorder at smooth 20 fps.
 * Captures genuine real-time animation motion without fast-forwarding gaps or distorting viewport aspect ratio.
 */
async function startRealtimeRecorder(client, opts) {
  let latestFrame = null;
  const sampledFrames = [];
  const fps = opts.fps || 20;
  const intervalMs = Math.round(1000 / fps);

  const onFrame = async (params) => {
    latestFrame = Buffer.from(params.data, "base64");
    try {
      await client.send("Page.screencastFrameAck", { sessionId: params.sessionId });
    } catch {}
  };

  client.on("Page.screencastFrame", onFrame);
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: opts.maxWidth,
    maxHeight: opts.maxHeight,
    everyNthFrame: 1,
  });

  const timer = setInterval(() => {
    if (latestFrame) sampledFrames.push(latestFrame);
  }, intervalMs);

  return {
    async stop(outWebmPath) {
      clearInterval(timer);
      try {
        await client.send("Page.stopScreencast");
      } catch {}
      client.off("Page.screencastFrame", onFrame);
      await sleep(160);

      const mjpegPath = path.join(SCRATCH_DIR, `${path.basename(outWebmPath)}.mjpeg`);
      fs.writeFileSync(mjpegPath, Buffer.concat(sampledFrames));

      const vf = opts.exactDimensions
        ? ["-vf", `scale=${opts.exactDimensions.w}:${opts.exactDimensions.h}:flags=lanczos`]
        : [];
      const ff = spawnSync(
        FF_BIN,
        [
          "-y",
          "-f",
          "image2pipe",
          "-vcodec",
          "mjpeg",
          "-framerate",
          String(fps),
          "-i",
          mjpegPath,
          ...vf,
          "-c:v",
          "libvpx-vp9",
          "-crf",
          "26",
          "-b:v",
          "0",
          outWebmPath,
        ],
        { encoding: "utf8" },
      );
      if (ff.status !== 0) {
        throw new Error(`ffmpeg failed (${outWebmPath}): ${ff.stderr}`);
      }
      const meta = inspectAndVerifyWebm(outWebmPath);
      return { frames: sampledFrames.length, webmPath: outWebmPath, ...meta };
    },
  };
}

async function waitForCondition(client, expr, timeoutMs = 7000, pollMs = 35) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const val = await evaluate(client, expr);
      if (val) return val;
    } catch {}
    await sleep(pollMs);
  }
  return null;
}

async function waitForEntranceComplete(client, timeoutMs = 9000) {
  return waitForCondition(
    client,
    `Boolean(window.location.pathname === "/" && window.__ADORA_CXP05_OWNED__ && window.__ADORA_CXP05_TELEMETRY__ && (window.__ADORA_CXP05_TELEMETRY__.phase === "complete" || window.__ADORA_CXP05_TELEMETRY__.phase === "skipped"))`,
    timeoutMs,
    40,
  );
}

async function smoothScrollToY(client, targetY, steps = 14, stepMs = 45) {
  const startY = (await evaluate(client, `window.scrollY`)) || 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await evaluate(client, `window.scrollTo(0, ${Math.round(startY + (targetY - startY) * eased)})`);
    await sleep(stepMs);
  }
}

async function run() {
  const gitSha = gitHeadSha();
  const manifest = [];
  const captureEvidence = async (client, filename, meta) => {
    const { data } = await client.send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(data, "base64");
    const outPath = path.join(REPORT_ASSETS_DIR, filename);
    fs.writeFileSync(outPath, buf);
    manifest.push({
      filename,
      sha256: sha256File(outPath),
      bytes: buf.length,
      capturedAt: new Date().toISOString(),
      gitSha,
      ...meta,
    });
    return outPath;
  };

  const report = {
    baseUrl: BASE_URL,
    gitSha,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    desktopEntrance: null,
    performance: null,
    slowNetwork: null,
    assetErrorRecovery: null,
    reloadAtMovement04: null,
    backForwardNavigation: null,
    reducedMotion: null,
    noJsFallback: null,
    routeIsolation: {},
    atelierRegression: null,
    rapidNavigationCleanup: null,
    accessibility: null,
    responsiveMatrix: {},
    mobileEntrance: null,
    recordings: {},
  };

  // =========================================================================
  // 1. DEDICATED DESKTOP CHROME INSTANCE (1440x900)
  // =========================================================================
  const userDataDesktop = fs.mkdtempSync(path.join(os.tmpdir(), "adora-cxp05a-desk-"));
  const chromeDesktop = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT_DESKTOP}`,
      `--user-data-dir=${userDataDesktop}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  try {
    await waitForCdp(CDP_PORT_DESKTOP);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT_DESKTOP}/json/list`)).json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const client = createCdp(pageTarget.webSocketDebuggerUrl);
    await client.ready;

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("DOM.enable");

    let ignoreExpectedFailures = false;
    client.on("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error" && !ignoreExpectedFailures) {
        report.consoleErrors.push(p.args.map((a) => a.value ?? a.description).join(" "));
      }
    });
    client.on("Runtime.exceptionThrown", (p) => {
      if (!ignoreExpectedFailures) {
        report.pageErrors.push(p.exceptionDetails.text);
      }
    });
    client.on("Network.loadingFailed", (p) => {
      if (!ignoreExpectedFailures && !p.canceled) {
        report.failedRequests.push({ type: p.type, errorText: p.errorText });
      }
    });

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // --- PASS 1: CONTINUOUS UNINTERRUPTED DESKTOP WEBM RECORDING (1440x900) ---
    await client.send("Network.clearBrowserCache");
    const desktopRec = await startRealtimeRecorder(client, {
      fps: 20,
      maxWidth: 1440,
      maxHeight: 900,
      exactDimensions: { w: 1440, h: 900 },
    });
    await sleep(140);
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await waitForEntranceComplete(client, 8000);
    await sleep(550);
    // Brief smooth scroll into Movement 02 to prove normal homepage operation
    await smoothScrollToY(client, 2600, 22, 42);
    await sleep(600);
    const desktopWebmPath = path.join(REPORT_ASSETS_DIR, "cxp05a_desktop_entrance.webm");
    report.recordings.desktop = await desktopRec.stop(desktopWebmPath);
    manifest.push({
      filename: "cxp05a_desktop_entrance.webm",
      sha256: sha256File(desktopWebmPath),
      bytes: report.recordings.desktop.bytes,
      capturedAt: new Date().toISOString(),
      gitSha,
      scenario: "desktop_continuous_recording",
      viewport: "1440x900",
    });

    // Collect performance & resource duplication check on fresh load
    report.performance = await evaluate(
      client,
      `(() => {
        const res = performance.getEntriesByType('resource');
        const highlandRequests = res.filter(r => r.name.includes('highland-world.jpg'));
        const jsBytes = res.filter(r => r.initiatorType === 'script').reduce((a, r) => a + (r.transferSize || 0), 0);
        const cssBytes = res.filter(r => r.initiatorType === 'link' || r.name.endsWith('.css')).reduce((a, r) => a + (r.transferSize || 0), 0);
        const imgBytes = res.filter(r => r.initiatorType === 'img' || r.name.includes('/images/')).reduce((a, r) => a + (r.transferSize || 0), 0);
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          highlandRequestCount: highlandRequests.length,
          jsTransferKB: Math.round(jsBytes / 1024),
          cssTransferKB: Math.round(cssBytes / 1024),
          imgTransferKB: Math.round(imgBytes / 1024),
          domContentLoadedMs: Math.round(nav ? nav.domContentLoadedEventEnd : 0),
          loadEventMs: Math.round(nav ? nav.loadEventEnd : 0),
        };
      })()`,
    );

    // --- PASS 2: MILESTONE SCREENSHOTS + ACCESSIBILITY + GEOMETRY PROOF (DESKTOP) ---
    await client.send("Page.navigate", { url: "about:blank" });
    await sleep(150);
    // Slightly throttle image by 320ms ONLY for deterministic mid-progress milestone capture
    await client.send("Fetch.enable", {
      patterns: [{ urlPattern: "*highland-world.jpg*", requestStage: "Request" }],
    });
    let releaseDelayImg = null;
    const onFetchPaused = async (params) => {
      await new Promise((resolve) => {
        releaseDelayImg = resolve;
        setTimeout(resolve, 420);
      });
      try {
        await client.send("Fetch.continueRequest", { requestId: params.requestId });
      } catch {}
    };
    client.on("Fetch.requestPaused", onFetchPaused);

    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await waitForCondition(
      client,
      `Boolean(window.location.pathname === "/" && document.documentElement.dataset.cxp05Entrance === "active" && document.querySelector('[data-cxp05-hud="cinematic"]'))`,
      5000,
      20,
    );
    await captureEvidence(client, "01_desktop_initial_a.png", {
      route: "/",
      viewport: "1440x900",
      scenario: "desktop_initial_a",
    });

    // Check accessibility & inert lock while loading
    const duringLoadA11y = await evaluate(
      client,
      `({
        hasProgressbar: Boolean(document.querySelector('[role="progressbar"]')),
        ariaMin: document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuemin'),
        ariaMax: document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuemax'),
        ariaNow: document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'),
        statusText: document.querySelector('[role="status"]')?.textContent?.trim() || '',
        headerInert: Boolean(document.querySelector('header')?.closest('[inert]')),
        runwayInert: Boolean(document.querySelector('[data-cxp02-runway][inert]')),
        overflowLocked: document.documentElement.style.overflow === 'hidden',
      })`,
    );

    await waitForCondition(
      client,
      `Number(document.querySelector('[data-cxp05-percent]')?.getAttribute('data-cxp05-percent') || 0) >= 40`,
      3000,
      25,
    );
    await captureEvidence(client, "02_desktop_mid_progress.png", {
      route: "/",
      viewport: "1440x900",
      scenario: "desktop_mid_progress",
    });
    if (releaseDelayImg) releaseDelayImg();

    await waitForCondition(
      client,
      `document.querySelector('[data-cxp05-hud]')?.getAttribute('data-cxp05-phase') === "complete-hold"`,
      4000,
      20,
    );
    await captureEvidence(client, "03_desktop_100_percent.png", {
      route: "/",
      viewport: "1440x900",
      scenario: "desktop_100_percent",
    });

    await waitForCondition(
      client,
      `document.querySelector('[data-cxp05-hud]')?.getAttribute('data-cxp05-phase') === "transforming"`,
      3000,
      16,
    );
    await sleep(420);
    await captureEvidence(client, "04_desktop_a_mid_flight.png", {
      route: "/",
      viewport: "1440x900",
      scenario: "desktop_a_mid_flight",
    });

    await sleep(340);
    await captureEvidence(client, "05_desktop_final_landing.png", {
      route: "/",
      viewport: "1440x900",
      scenario: "desktop_final_landing",
    });

    await waitForEntranceComplete(client, 5000);
    await sleep(160);
    await captureEvidence(client, "06_desktop_settled_hero.png", {
      route: "/",
      viewport: "1440x900",
      scenario: "desktop_settled_hero",
    });

    client.off("Fetch.requestPaused", onFetchPaused);
    await client.send("Fetch.disable");

    const afterLoadA11y = await evaluate(
      client,
      `({
        hudRemoved: !document.querySelector('[data-cxp05-hud]'),
        headerInert: Boolean(document.querySelector('header')?.closest('[inert]')),
        runwayInert: Boolean(document.querySelector('[data-cxp02-runway][inert]')),
        overflowRestored: document.documentElement.style.overflow === '',
        firstATransformCleared: !document.querySelector('[data-cxp05-first-a]')?.getAttribute('transform'),
        firstAFont: getComputedStyle(document.querySelector('[data-cxp05-first-a] text')).fontFamily,
        anchorFont: getComputedStyle(document.querySelector('[data-cxp05-target-anchor]')).fontFamily,
        statusReadyText: document.querySelector('[role="status"]')?.textContent?.trim() || '',
      })`,
    );
    report.accessibility = { duringLoad: duringLoadA11y, afterLoad: afterLoadA11y };
    report.desktopEntrance = await evaluate(client, `window.__ADORA_CXP05_TELEMETRY__`);

    // --- SCENARIO 5: SLOW NETWORK (1.5s throttled highland-world.jpg) ---
    await client.send("Page.navigate", { url: "about:blank" });
    await sleep(100);
    await client.send("Network.clearBrowserCache");
    await client.send("Fetch.enable", {
      patterns: [{ urlPattern: "*highland-world.jpg*", requestStage: "Request" }],
    });
    let releaseSlowImg = null;
    const onSlowPaused = async (params) => {
      await new Promise((resolve) => {
        releaseSlowImg = resolve;
      });
      try {
        await client.send("Fetch.continueRequest", { requestId: params.requestId });
      } catch {}
    };
    client.on("Fetch.requestPaused", onSlowPaused);
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(950);
    const heldWhileThrottled = await evaluate(
      client,
      `({
        percent: Number(document.querySelector('[data-cxp05-percent]')?.getAttribute('data-cxp05-percent') || 0),
        phase: window.__ADORA_CXP05_TELEMETRY__?.phase,
        heroMediaStage: window.__ADORA_CXP05_TELEMETRY__?.stages?.heroMedia,
      })`,
    );
    if (releaseSlowImg) releaseSlowImg();
    await waitForEntranceComplete(client, 7000);
    const afterThrottledComplete = await evaluate(client, `window.__ADORA_CXP05_TELEMETRY__`);
    client.off("Fetch.requestPaused", onSlowPaused);
    await client.send("Fetch.disable");
    report.slowNetwork = {
      heldWhileThrottled,
      completedOutcome: afterThrottledComplete?.outcome,
      completedPhase: afterThrottledComplete?.phase,
      heroMediaStageAfter: afterThrottledComplete?.stages?.heroMedia,
    };

    // --- SCENARIO 6: ASSET ERROR FAIL-OPEN RECOVERY ---
    ignoreExpectedFailures = true;
    await client.send("Page.navigate", { url: "about:blank" });
    await sleep(100);
    await client.send("Network.clearBrowserCache");
    await client.send("Fetch.enable", {
      patterns: [{ urlPattern: "*highland-world.jpg*", requestStage: "Request" }],
    });
    const onFailImg = async (params) => {
      try {
        await client.send("Fetch.failRequest", {
          requestId: params.requestId,
          errorReason: "Failed",
        });
      } catch {}
    };
    client.on("Fetch.requestPaused", onFailImg);
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await waitForEntranceComplete(client, 7000);
    await sleep(200);
    report.assetErrorRecovery = await evaluate(
      client,
      `({
        outcome: window.__ADORA_CXP05_TELEMETRY__?.outcome,
        heroMediaStage: window.__ADORA_CXP05_TELEMETRY__?.stages?.heroMedia,
        hudRemoved: !document.querySelector('[data-cxp05-hud]'),
        overflowRestored: document.documentElement.style.overflow === '',
        hasAtelierTrigger: Boolean(document.querySelector('header a[data-concierge-trigger]')),
      })`,
    );
    client.off("Fetch.requestPaused", onFailImg);
    await client.send("Fetch.disable");
    ignoreExpectedFailures = false;

    // --- SCENARIO 7: RELOAD AT MOVEMENT 04 PRESERVES SCROLL RESTORATION ---
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await waitForEntranceComplete(client, 7000);
    await evaluate(client, `window.scrollTo(0, 5800)`);
    await sleep(450);
    await client.send("Page.reload");
    await sleep(1200);
    report.reloadAtMovement04 = await evaluate(
      client,
      `({
        scrollY: Math.round(window.scrollY),
        policyMode: window.__ADORA_CXP05_TELEMETRY__?.policyMode,
        policyReason: window.__ADORA_CXP05_TELEMETRY__?.policyReason,
        hudPresent: Boolean(document.querySelector('[data-cxp05-hud]')),
      })`,
    );

    // --- SCENARIO 8: CLIENT-SIDE NAV & BACK/FORWARD (NO REPLAY) ---
    await evaluate(client, `window.scrollTo(0, 0)`);
    await sleep(150);
    await evaluate(client, `document.querySelector('header a[href="/destinations"]')?.click()`);
    await waitForCondition(client, `window.location.pathname === "/destinations"`, 5000, 50);
    await sleep(300);
    await evaluate(client, `window.history.back()`);
    await waitForCondition(client, `window.location.pathname === "/"`, 5000, 50);
    await sleep(450);
    report.backForwardNavigation = await evaluate(
      client,
      `({
        path: window.location.pathname,
        policyMode: window.__ADORA_CXP05_TELEMETRY__?.policyMode,
        hudPresent: Boolean(document.querySelector('[data-cxp05-hud]')),
        overflowRestored: document.documentElement.style.overflow === '',
      })`,
    );

    // --- SCENARIO 12: ATELIER REGRESSION AFTER ENTRANCE ---
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(450);
    const atelierOpen = await evaluate(
      client,
      `Boolean(document.querySelector('dialog.cxp04-dialog-host[open]'))`,
    );
    await pressKey(client, "Escape", "Escape", 27);
    await sleep(450);
    const atelierClosed = await evaluate(
      client,
      `!document.querySelector('dialog.cxp04-dialog-host[open]') && document.documentElement.style.overflow === ''`,
    );
    report.atelierRegression = { opened: atelierOpen, closedCleanly: atelierClosed };

    // --- SCENARIO 13: RAPID NAVIGATION MID-LOAD CLEANUP ---
    await client.send("Page.navigate", { url: "about:blank" });
    await sleep(80);
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(220);
    await client.send("Page.navigate", { url: `${BASE_URL}/destinations/da-lat` });
    await waitForCondition(client, `window.location.pathname === "/destinations/da-lat"`, 5000, 50);
    await sleep(350);
    report.rapidNavigationCleanup = await evaluate(
      client,
      `({
        path: window.location.pathname,
        hasEntranceAttr: Boolean(document.documentElement.dataset.cxp05Entrance),
        overflowRestored: document.documentElement.style.overflow === '',
        inertCount: document.querySelectorAll('[inert]').length,
        hasHud: Boolean(document.querySelector('[data-cxp05-hud]')),
      })`,
    );

    // --- SCENARIO 11: ROUTE ISOLATION ---
    for (const r of [
      "/ai-planner",
      "/destinations/da-lat",
      "/experiences/rung-thong-binh-minh",
      "/trips/da-lat-3-ngay",
    ]) {
      await client.send("Page.navigate", { url: `${BASE_URL}${r}` });
      await sleep(550);
      report.routeIsolation[r] = await evaluate(
        client,
        `({
          hasBootScript: Boolean(document.getElementById('adora-cxp05-boot')),
          hasHud: Boolean(document.querySelector('[data-cxp05-hud]')),
          hasEntranceAttr: Boolean(document.documentElement.dataset.cxp05Entrance),
        })`,
      );
    }

    // --- SCENARIO 9: REDUCED MOTION ---
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await waitForEntranceComplete(client, 6000);
    await sleep(250);
    report.reducedMotion = await evaluate(
      client,
      `({
        matchesReduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        mode: document.querySelector('main')?.getAttribute('data-cxp02-mode'),
        policyMode: window.__ADORA_CXP05_TELEMETRY__?.policyMode,
        flightDurationMs: window.__ADORA_CXP05_TELEMETRY__?.flightDurationMs,
        hudRemoved: !document.querySelector('[data-cxp05-hud]'),
      })`,
    );
    await captureEvidence(client, "10_reduced_motion_settled.png", {
      route: "/",
      viewport: "1440x900",
      media: "prefers-reduced-motion: reduce",
      scenario: "reduced_motion_settled",
    });
    await client.send("Emulation.setEmulatedMedia", { features: [] });

    // --- SCENARIO 10: NO-JS FALLBACK ---
    ignoreExpectedFailures = true;
    await client.send("Emulation.setScriptExecutionDisabled", { value: true });
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(800);
    report.noJsFallback = await evaluate(
      client,
      `({
        hasEntranceAttr: Boolean(document.documentElement.dataset.cxp05Entrance),
        h1Count: document.querySelectorAll('h1').length,
        openingPaintedHeight: Math.round(document.querySelector('.cxp01-opening-overlay')?.getBoundingClientRect().height || 0),
        discoveryOpacity: getComputedStyle(document.querySelector('.cxp02-discovery-layer')).opacity,
        hasHud: Boolean(document.querySelector('[data-cxp05-hud]')),
      })`,
    );
    await captureEvidence(client, "11_no_js_homepage.png", {
      route: "/",
      viewport: "1440x900",
      javascript: false,
      scenario: "no_js_homepage",
    });
    await client.send("Emulation.setScriptExecutionDisabled", { value: false });
    ignoreExpectedFailures = false;

    // --- SCENARIO 14b: 8-VIEWPORT RESPONSIVE GEOMETRY & OVERFLOW MATRIX ---
    const viewports = [
      [360, 640, true],
      [360, 800, true],
      [390, 844, true],
      [430, 932, true],
      [768, 1024, false],
      [1024, 768, false],
      [1440, 900, false],
      [1920, 1080, false],
    ];
    for (const [w, h, mob] of viewports) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile: mob,
      });
      await client.send("Page.navigate", { url: "about:blank" });
      await sleep(60);
      await client.send("Page.navigate", { url: `${BASE_URL}/` });
      await waitForEntranceComplete(client, 7000);
      await sleep(120);
      report.responsiveMatrix[`${w}x${h}`] = await evaluate(
        client,
        `(() => {
          const tel = window.__ADORA_CXP05_TELEMETRY__;
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            overflowOk: document.documentElement.scrollWidth <= window.innerWidth,
            policyMode: tel?.policyMode,
            outcome: tel?.outcome,
            startScale: tel?.startScale,
            landingDeltaPx: tel?.landingDeltaPx,
            targetWidth: tel?.targetRect?.width,
            targetHeight: tel?.targetRect?.height,
          };
        })()`,
      );
    }

    client.close();
  } finally {
    chromeDesktop.kill();
    await sleep(450);
    try {
      fs.rmSync(userDataDesktop, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }

  // =========================================================================
  // 2. DEDICATED PORTRAIT MOBILE CHROME INSTANCE (EXACT 390x844 — NO DISTORTION!)
  // =========================================================================
  const userDataMobile = fs.mkdtempSync(path.join(os.tmpdir(), "adora-cxp05a-mob-"));
  const chromeMobile = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT_MOBILE}`,
      `--user-data-dir=${userDataMobile}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--window-size=390,844",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  try {
    await waitForCdp(CDP_PORT_MOBILE);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT_MOBILE}/json/list`)).json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const mobClient = createCdp(pageTarget.webSocketDebuggerUrl);
    await mobClient.ready;

    await mobClient.send("Page.enable");
    await mobClient.send("Runtime.enable");
    await mobClient.send("Network.enable");
    await mobClient.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    // Pass 1: Continuous Mobile WebM Recording (exact 390x844 portrait)
    await mobClient.send("Network.clearBrowserCache");
    const mobRec = await startRealtimeRecorder(mobClient, {
      fps: 20,
      maxWidth: 390,
      maxHeight: 844,
      exactDimensions: { w: 390, h: 844 },
    });
    await sleep(140);
    await mobClient.send("Page.navigate", { url: `${BASE_URL}/` });
    await waitForEntranceComplete(mobClient, 8000);
    await sleep(700);
    const mobileWebmPath = path.join(REPORT_ASSETS_DIR, "cxp05a_mobile_entrance.webm");
    report.recordings.mobile = await mobRec.stop(mobileWebmPath);
    manifest.push({
      filename: "cxp05a_mobile_entrance.webm",
      sha256: sha256File(mobileWebmPath),
      bytes: report.recordings.mobile.bytes,
      capturedAt: new Date().toISOString(),
      gitSha,
      scenario: "mobile_continuous_recording",
      viewport: "390x844",
    });

    // Pass 2: Crisp Mobile Milestone Screenshots
    await mobClient.send("Page.navigate", { url: "about:blank" });
    await sleep(120);
    await mobClient.send("Fetch.enable", {
      patterns: [{ urlPattern: "*highland-world.jpg*", requestStage: "Request" }],
    });
    const onMobPause = async (params) => {
      await sleep(360);
      try {
        await mobClient.send("Fetch.continueRequest", { requestId: params.requestId });
      } catch {}
    };
    mobClient.on("Fetch.requestPaused", onMobPause);
    await mobClient.send("Page.navigate", { url: `${BASE_URL}/` });
    await waitForCondition(
      mobClient,
      `Boolean(window.location.pathname === "/" && document.documentElement.dataset.cxp05Entrance === "active" && document.querySelector('[data-cxp05-hud="cinematic"]'))`,
      5000,
      20,
    );
    await captureEvidence(mobClient, "07_mobile_initial_a.png", {
      route: "/",
      viewport: "390x844",
      scenario: "mobile_initial_a",
    });

    await waitForCondition(
      mobClient,
      `document.querySelector('[data-cxp05-hud]')?.getAttribute('data-cxp05-phase') === "transforming"`,
      5000,
      16,
    );
    await sleep(460);
    await captureEvidence(mobClient, "08_mobile_mid_flight.png", {
      route: "/",
      viewport: "390x844",
      scenario: "mobile_mid_flight",
    });

    await waitForEntranceComplete(mobClient, 5000);
    await sleep(180);
    await captureEvidence(mobClient, "09_mobile_settled_hero.png", {
      route: "/",
      viewport: "390x844",
      scenario: "mobile_settled_hero",
    });

    mobClient.off("Fetch.requestPaused", onMobPause);
    await mobClient.send("Fetch.disable");

    report.mobileEntrance = await evaluate(mobClient, `window.__ADORA_CXP05_TELEMETRY__`);
    mobClient.close();
  } finally {
    chromeMobile.kill();
    await sleep(450);
    try {
      fs.rmSync(userDataMobile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }

  const summaryPath = path.join(SCRATCH_DIR, "verify_cxp05a_entrance.json");
  fs.writeFileSync(summaryPath, JSON.stringify({ report, manifest }, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed =
    report.consoleErrors.length > 0 ||
    report.pageErrors.length > 0 ||
    report.failedRequests.length > 0 ||
    report.desktopEntrance?.outcome !== "ready" ||
    Math.abs(report.desktopEntrance?.landingDeltaPx?.dx ?? 99) > 1 ||
    Math.abs(report.desktopEntrance?.landingDeltaPx?.dy ?? 99) > 1 ||
    report.performance?.highlandRequestCount !== 1 ||
    (report.slowNetwork?.heldWhileThrottled?.percent ?? 100) >= 100 ||
    report.slowNetwork?.completedOutcome !== "ready" ||
    report.assetErrorRecovery?.outcome !== "degraded" ||
    !report.assetErrorRecovery?.hudRemoved ||
    !report.assetErrorRecovery?.overflowRestored ||
    (report.reloadAtMovement04?.scrollY ?? 0) < 4000 ||
    report.reloadAtMovement04?.policyMode !== "skip" ||
    report.backForwardNavigation?.hudPresent ||
    !report.reducedMotion?.matchesReduce ||
    report.reducedMotion?.policyMode !== "reduced" ||
    report.reducedMotion?.flightDurationMs !== 0 ||
    report.noJsFallback?.hasEntranceAttr ||
    (report.noJsFallback?.openingPaintedHeight ?? 0) < 100 ||
    Object.values(report.routeIsolation).some((r) => r.hasBootScript || r.hasHud || r.hasEntranceAttr) ||
    !report.atelierRegression?.opened ||
    !report.atelierRegression?.closedCleanly ||
    report.rapidNavigationCleanup?.hasEntranceAttr ||
    !report.rapidNavigationCleanup?.overflowRestored ||
    report.rapidNavigationCleanup?.inertCount !== 0 ||
    !report.accessibility?.duringLoad?.hasProgressbar ||
    !report.accessibility?.duringLoad?.headerInert ||
    !report.accessibility?.afterLoad?.hudRemoved ||
    report.accessibility?.afterLoad?.headerInert ||
    !report.accessibility?.afterLoad?.firstATransformCleared ||
    Object.values(report.responsiveMatrix).some((m) => !m.overflowOk || m.outcome !== "ready") ||
    !report.recordings.desktop?.decodeOk ||
    report.recordings.desktop?.width !== 1440 ||
    report.recordings.desktop?.height !== 900 ||
    !report.recordings.mobile?.decodeOk ||
    report.recordings.mobile?.width !== 390 ||
    report.recordings.mobile?.height !== 844;

  if (failed) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

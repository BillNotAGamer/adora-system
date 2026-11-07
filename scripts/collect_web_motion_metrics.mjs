import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, tmpdir, totalmem } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COLLECTOR_VERSION = "1.0.0";
const SCHEMA_VERSION = "adora.web.motion-metrics.v1";
const DEFAULT_BASELINE_APP_SHA = "c49595573f8b7214f414a589006b748d5d6babfb";

const scriptFilePath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptFilePath), "..");
const repoRootPosix = repoRoot.replace(/\\/g, "/");

function parseCliArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output" && argv[i + 1]) {
      parsed.output = argv[i + 1];
      i += 1;
    } else if (arg === "--label" && argv[i + 1]) {
      parsed.label = argv[i + 1];
      i += 1;
    } else if (arg === "--runs" && argv[i + 1]) {
      parsed.runs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--baseline-sha" && argv[i + 1]) {
      parsed.baselineSha = argv[i + 1];
      i += 1;
    } else if (arg === "--docs-sha" && argv[i + 1]) {
      parsed.docsSha = argv[i + 1];
      i += 1;
    }
  }
  return parsed;
}

const cliArgs = parseCliArgs(process.argv.slice(2));
const chromePath =
  process.env.ADORA_CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const siteUrl = process.env.ADORA_WEB_URL ?? "http://127.0.0.1:3100";
const outputFilePath = resolve(
  repoRoot,
  cliArgs.output ?? process.env.ADORA_METRICS_OUTPUT ?? "docs/reports/baseline_0_3_metrics.json",
);
const phaseLabel =
  cliArgs.label ?? process.env.ADORA_METRICS_PHASE_LABEL ?? "package-a0-pre-motion-baseline";
const baselineAppSha =
  cliArgs.baselineSha ?? process.env.ADORA_BASELINE_APP_SHA ?? DEFAULT_BASELINE_APP_SHA;
const explicitDocsSha = cliArgs.docsSha ?? process.env.ADORA_DOCS_CHECKPOINT_SHA ?? null;
const runsPerRoute = Number.isInteger(cliArgs.runs) && cliArgs.runs > 0
  ? cliArgs.runs
  : Number(process.env.ADORA_METRICS_RUNS ?? 5);
const debugPort = Number(process.env.ADORA_METRICS_CDP_PORT ?? 9228);

const TESTED_ROUTES = [
  "/",
  "/destinations",
  "/destinations/da-lat",
  "/experiences",
  "/experiences/ca-phe-nho-giot-cao-nguyen",
  "/ai-planner",
  "/trips",
  "/trips/da-lat-3-ngay",
];

const PROFILES = [
  {
    id: "desktop_unthrottled",
    description: "Desktop 1440x900 unthrottled baseline profile",
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    },
    cpuThrottlingRate: 1,
    networkEmulation: {
      throttled: false,
      offline: false,
      latencyMs: 0,
      downloadThroughputBytesPerSec: -1,
      uploadThroughputBytesPerSec: -1,
      approxDownloadMbps: null,
      approxUploadKbps: null,
    },
  },
  {
    id: "mobile_lab_throttled",
    description: "Mobile 390x844 laboratory profile (4x CPU slowdown, ~150ms RTT, ~1.6 Mbps down)",
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    },
    cpuThrottlingRate: 4,
    networkEmulation: {
      throttled: true,
      offline: false,
      latencyMs: 150,
      downloadThroughputBytesPerSec: 200_000, // 1.6 Mbps (1,600,000 bits / 8)
      uploadThroughputBytesPerSec: 93_750, // 750 Kbps (750,000 bits / 8)
      approxDownloadMbps: 1.6,
      approxUploadKbps: 750,
    },
  },
];

const INTERACTION_SPECS = [
  {
    id: "destination_filter_select",
    route: "/destinations",
    description: "Select 'Ven biển' region filter chip on /destinations",
    locateSelectorExpression: `(() => {
      const btn = Array.from(document.querySelectorAll('button.filter-chip'))
        .find((el) => el.textContent?.trim() === 'Ven biển');
      if (!btn) return null;
      btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: btn.textContent?.trim() ?? null };
    })()`,
    verifyExpression: `(() => {
      const count = document.querySelector('[data-testid="destination-count"]')?.textContent?.trim() ?? '';
      const btn = Array.from(document.querySelectorAll('button.filter-chip'))
        .find((el) => el.textContent?.trim() === 'Ven biển');
      return {
        verified: count === 'Hiển thị 2 / 4 điểm đến' && btn?.getAttribute('aria-pressed') === 'true',
        observedState: count,
      };
    })()`,
  },
  {
    id: "experience_category_select",
    route: "/experiences",
    description: "Select 'Ẩm thực & cà phê' category filter chip on /experiences",
    locateSelectorExpression: `(() => {
      const btn = Array.from(document.querySelectorAll('button.filter-chip'))
        .find((el) => el.textContent?.includes('Ẩm thực & cà phê'));
      if (!btn) return null;
      btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: btn.textContent?.trim() ?? null };
    })()`,
    verifyExpression: `(() => {
      const count = document.querySelector('[data-testid="experience-count"]')?.textContent?.trim() ?? '';
      const btn = Array.from(document.querySelectorAll('button.filter-chip'))
        .find((el) => el.textContent?.includes('Ẩm thực & cà phê'));
      return {
        verified: count === 'Hiển thị 2 / 6 trải nghiệm' && btn?.getAttribute('aria-pressed') === 'true',
        observedState: count,
      };
    })()`,
  },
  {
    id: "planner_scripted_prompt_select",
    route: "/ai-planner",
    description: "Click 3-day Đà Lạt suggested prompt card in /ai-planner",
    locateSelectorExpression: `(() => {
      const btn = Array.from(document.querySelectorAll('ul[aria-label="Gợi ý câu hỏi"] button'))
        .find((el) => el.textContent?.includes('Lên kế hoạch chuyến đi 3 ngày tới Đà Lạt'));
      if (!btn) return null;
      btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: '3-day Da Lat prompt' };
    })()`,
    verifyExpression: `(() => {
      const hasUser = Boolean(document.querySelector('article[aria-label="Bạn"]'));
      const hasReply = Boolean(document.querySelector('[data-testid="scripted-reply"]'));
      return {
        verified: hasUser && hasReply,
        observedState: hasReply ? 'scripted-reply-rendered' : 'missing-reply',
      };
    })()`,
  },
  {
    id: "itinerary_day_switch",
    route: "/trips/da-lat-3-ngay",
    description: "Switch from Day 1 to Day 2 tab on /trips/da-lat-3-ngay",
    locateSelectorExpression: `(() => {
      const btn = document.querySelector('#day-tab-2');
      if (!btn) return null;
      btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: 'Ngày 2' };
    })()`,
    verifyExpression: `(() => {
      const tab2 = document.querySelector('#day-tab-2');
      const heading = document.querySelector('[data-testid="day-panel"] h3')?.textContent?.trim() ?? '';
      return {
        verified: tab2?.getAttribute('aria-selected') === 'true' && heading.includes('Ngày 2'),
        observedState: heading,
      };
    })()`,
  },
  {
    id: "itinerary_accordion_toggle",
    route: "/trips/da-lat-3-ngay",
    description: "Expand collapsed second activity accordion on /trips/da-lat-3-ngay",
    locateSelectorExpression: `(() => {
      const btn = Array.from(document.querySelectorAll('ol button[aria-controls^="activity-"]'))
        .find((el) => el.getAttribute('aria-expanded') === 'false');
      if (!btn) return null;
      btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = btn.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        controlId: btn.getAttribute('aria-controls'),
      };
    })()`,
    verifyExpression: `(controlId) => {
      const btn = document.querySelector(\`button[aria-controls="\${controlId}"]\`);
      const region = document.getElementById(controlId);
      return {
        verified: btn?.getAttribute('aria-expanded') === 'true' && Boolean(region),
        observedState: btn?.getAttribute('aria-expanded') ?? null,
      };
    }`,
  },
];

const NEW_DOCUMENT_OBSERVER_SCRIPT = `(() => {
  const supported = Array.isArray(PerformanceObserver.supportedEntryTypes)
    ? PerformanceObserver.supportedEntryTypes.slice()
    : [];

  const state = {
    supportedEntryTypes: supported,
    phase: 'initial_load',
    lcpEntries: [],
    initialLoadLcpSnapshot: null,
    layoutShiftEntries: [],
    longTaskEntries: [],
    eventTimingEntries: [],
    firstInputEntries: [],
    observerErrors: [],
  };

  function stripOrigin(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return parsed.pathname + parsed.search;
      }
      return parsed.origin + parsed.pathname;
    } catch {
      return url;
    }
  }

  function describeElement(el) {
    if (!el || typeof el !== 'object') return null;
    const tag = el.tagName ? el.tagName.toLowerCase() : null;
    const id = el.id ? String(el.id) : null;
    const cls = typeof el.className === 'string' && el.className.trim()
      ? el.className.trim().split(/\\s+/).slice(0, 5).join('.')
      : null;
    const testId = el.getAttribute ? el.getAttribute('data-testid') : null;
    let selector = tag || 'unknown';
    if (id) selector += '#' + id;
    else if (testId) selector += '[data-testid="' + testId + '"]';
    else if (cls) selector += '.' + cls;
    return selector;
  }

  if (supported.includes('largest-contentful-paint')) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const el = entry.element || null;
          const isImg = el && el.tagName && el.tagName.toLowerCase() === 'img';
          const rawSrc = isImg ? (el.currentSrc || el.getAttribute('src') || entry.url || null) : (entry.url || null);
          const textSnippet = !isImg && el && typeof el.textContent === 'string'
            ? el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 96) || null
            : null;
          state.lcpEntries.push({
            startTimeMs: Math.round(entry.startTime * 100) / 100,
            renderTimeMs: entry.renderTime ? Math.round(entry.renderTime * 100) / 100 : null,
            loadTimeMs: entry.loadTime ? Math.round(entry.loadTime * 100) / 100 : null,
            size: entry.size ?? null,
            elementTag: el && el.tagName ? el.tagName.toLowerCase() : null,
            elementIdentity: describeElement(el),
            imageSrc: stripOrigin(rawSrc),
            representativeText: textSnippet,
            phaseAtCapture: state.phase,
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (err) {
      state.observerErrors.push('lcp: ' + String(err && err.message ? err.message : err));
    }
  }

  if (supported.includes('layout-shift')) {
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const sources = Array.isArray(entry.sources)
            ? entry.sources.slice(0, 3).map((s) => describeElement(s && s.node)).filter(Boolean)
            : [];
          state.layoutShiftEntries.push({
            startTimeMs: Math.round(entry.startTime * 100) / 100,
            value: Math.round(entry.value * 100000) / 100000,
            hadRecentInput: Boolean(entry.hadRecentInput),
            phase: state.phase,
            sources,
          });
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (err) {
      state.observerErrors.push('layout-shift: ' + String(err && err.message ? err.message : err));
    }
  }

  if (supported.includes('longtask')) {
    try {
      const ltObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTaskEntries.push({
            startTimeMs: Math.round(entry.startTime * 100) / 100,
            durationMs: Math.round(entry.duration * 100) / 100,
            name: entry.name || 'unknown',
            phase: state.phase,
          });
        }
      });
      ltObserver.observe({ type: 'longtask', buffered: true });
    } catch (err) {
      state.observerErrors.push('longtask: ' + String(err && err.message ? err.message : err));
    }
  }

  if (supported.includes('event')) {
    try {
      const eventObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.eventTimingEntries.push({
            name: entry.name,
            startTimeMs: Math.round(entry.startTime * 100) / 100,
            durationMs: Math.round(entry.duration * 100) / 100,
            processingStartMs: Math.round(entry.processingStart * 100) / 100,
            processingEndMs: Math.round(entry.processingEnd * 100) / 100,
            processingDurationMs: Math.round((entry.processingEnd - entry.processingStart) * 100) / 100,
            interactionId: entry.interactionId ?? 0,
            cancelable: Boolean(entry.cancelable),
          });
        }
      });
      eventObserver.observe({ type: 'event', durationThreshold: 16, buffered: true });
    } catch (err) {
      state.observerErrors.push('event: ' + String(err && err.message ? err.message : err));
    }
  }

  if (supported.includes('first-input')) {
    try {
      const fiObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.firstInputEntries.push({
            name: entry.name,
            startTimeMs: Math.round(entry.startTime * 100) / 100,
            durationMs: Math.round(entry.duration * 100) / 100,
            processingStartMs: Math.round(entry.processingStart * 100) / 100,
            processingEndMs: Math.round(entry.processingEnd * 100) / 100,
            processingDurationMs: Math.round((entry.processingEnd - entry.processingStart) * 100) / 100,
            interactionId: entry.interactionId ?? 0,
          });
        }
      });
      fiObserver.observe({ type: 'first-input', buffered: true });
    } catch (err) {
      state.observerErrors.push('first-input: ' + String(err && err.message ? err.message : err));
    }
  }

  window.__adoraMetrics = state;
})();`;

function wait(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function round(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function computeMedian(values, digits = 2) {
  const valid = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const mid = Math.floor(valid.length / 2);
  const raw = valid.length % 2 === 1 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
  return round(raw, digits);
}

function computePercentile(values, percentile, digits = 2) {
  const valid = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const index = Math.min(valid.length - 1, Math.max(0, Math.ceil((percentile / 100) * valid.length) - 1));
  return round(valid[index], digits);
}

function computeMaxSessionWindowCls(entries) {
  const eligible = entries
    .filter((entry) => !entry.hadRecentInput && typeof entry.value === "number")
    .sort((a, b) => a.startTimeMs - b.startTimeMs);
  let maxScore = 0;
  let currentScore = 0;
  let windowStart = -Infinity;
  let prevTime = -Infinity;
  for (const entry of eligible) {
    if (
      currentScore > 0 &&
      entry.startTimeMs - prevTime < 1000 &&
      entry.startTimeMs - windowStart < 5000
    ) {
      currentScore += entry.value;
    } else {
      currentScore = entry.value;
      windowStart = entry.startTimeMs;
    }
    prevTime = entry.startTimeMs;
    if (currentScore > maxScore) maxScore = currentScore;
  }
  return round(maxScore, 5) ?? 0;
}

function runGit(args) {
  return execFileSync("git", ["-c", `safe.directory=${repoRootPosix}`, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function detectPnpmVersion(rootPackageJson) {
  if (typeof rootPackageJson.packageManager === "string" && rootPackageJson.packageManager.startsWith("pnpm@")) {
    return rootPackageJson.packageManager.slice("pnpm@".length);
  }
  return null;
}

async function waitForJsonVersion() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await wait(100);
  }
  throw new Error(`Chrome DevTools Protocol did not become available on port ${debugPort}`);
}

async function lookupTargetWsUrl(targetId) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    if (response.ok) {
      const targets = await response.json();
      const match = targets.find((item) => item.id === targetId && item.webSocketDebuggerUrl);
      if (match) return match.webSocketDebuggerUrl;
    }
    await wait(50);
  }
  throw new Error(`Unable to find webSocketDebuggerUrl for target ${targetId}`);
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const events = new Map();

  socket.addEventListener("message", (message) => {
    const payload = JSON.parse(message.data);
    if (payload.id) {
      const handler = pending.get(payload.id);
      if (handler) {
        pending.delete(payload.id);
        if (payload.error) handler.reject(new Error(payload.error.message));
        else handler.resolve(payload.result);
      }
      return;
    }
    const listeners = events.get(payload.method) ?? [];
    for (const listener of listeners) listener(payload.params);
  });

  const ready = new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });

  return {
    ready,
    send(method, params = {}) {
      id += 1;
      const messageId = id;
      return new Promise((resolvePromise, rejectPromise) => {
        pending.set(messageId, { resolve: resolvePromise, reject: rejectPromise });
        socket.send(JSON.stringify({ id: messageId, method, params }));
      });
    },
    on(method, callback) {
      const existing = events.get(method) ?? [];
      existing.push(callback);
      events.set(method, existing);
    },
    close() {
      try {
        socket.close();
      } catch {
        // Ignore close errors.
      }
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Runtime.evaluate failed",
    );
  }
  return result.result.value;
}

async function configureProfileSession(client, profile) {
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Network.enable"),
  ]);
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  try {
    await client.send("Network.clearBrowserCache");
  } catch {
    // Optional if unsupported in isolated context.
  }
  await client.send("Emulation.setDeviceMetricsOverride", profile.viewport);
  await client.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuThrottlingRate });
  await client.send("Network.emulateNetworkConditions", {
    offline: profile.networkEmulation.offline,
    latency: profile.networkEmulation.latencyMs,
    downloadThroughput: profile.networkEmulation.downloadThroughputBytesPerSec,
    uploadThroughput: profile.networkEmulation.uploadThroughputBytesPerSec,
  });
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: NEW_DOCUMENT_OBSERVER_SCRIPT,
  });
}

function attachScriptNetworkTracker(client) {
  const scriptRequests = new Map();
  const servedFromCacheIds = new Set();

  client.on("Network.requestServedFromCache", (params) => {
    if (params?.requestId) servedFromCacheIds.add(params.requestId);
  });

  client.on("Network.responseReceived", (params) => {
    const { requestId, type, response } = params ?? {};
    if (!requestId || !response) return;
    const url = response.url ?? "";
    const mime = response.mimeType ?? "";
    const isScript =
      type === "Script" ||
      mime.includes("javascript") ||
      /\.m?js(\?|$)/i.test(url);
    if (!isScript) return;

    let cleanUrl = url;
    try {
      const parsed = new URL(url);
      cleanUrl = parsed.origin === new URL(siteUrl).origin
        ? parsed.pathname + parsed.search
        : parsed.origin + parsed.pathname;
    } catch {
      // Keep raw URL if unparsable.
    }

    scriptRequests.set(requestId, {
      url: cleanUrl,
      status: response.status ?? null,
      mimeType: mime || null,
      fromDiskCache: Boolean(response.fromDiskCache),
      fromServiceWorker: Boolean(response.fromServiceWorker),
      fromPrefetchCache: Boolean(response.fromPrefetchCache),
      servedFromCacheEvent: servedFromCacheIds.has(requestId),
      responseEncodedBytes: typeof response.encodedDataLength === "number" ? response.encodedDataLength : null,
      finishedEncodedBytes: null,
    });
  });

  client.on("Network.loadingFinished", (params) => {
    const entry = scriptRequests.get(params?.requestId);
    if (!entry) return;
    if (typeof params.encodedDataLength === "number") {
      entry.finishedEncodedBytes = params.encodedDataLength;
    }
    if (servedFromCacheIds.has(params.requestId)) {
      entry.servedFromCacheEvent = true;
    }
  });

  return {
    summarize() {
      const scripts = [];
      let totalCompressedBytes = 0;
      let cachedCount = 0;
      for (const item of scriptRequests.values()) {
        const compressedBytes =
          typeof item.finishedEncodedBytes === "number" && item.finishedEncodedBytes >= 0
            ? item.finishedEncodedBytes
            : typeof item.responseEncodedBytes === "number" && item.responseEncodedBytes >= 0
              ? item.responseEncodedBytes
              : 0;
        const servedFromCache =
          item.fromDiskCache || item.fromServiceWorker || item.fromPrefetchCache || item.servedFromCacheEvent;
        if (servedFromCache) cachedCount += 1;
        totalCompressedBytes += compressedBytes;
        scripts.push({
          url: item.url,
          status: item.status,
          compressedTransferBytes: compressedBytes,
          servedFromCache,
        });
      }
      return {
        scriptCount: scripts.length,
        cachedScriptCount: cachedCount,
        totalCompressedTransferBytes: totalCompressedBytes,
        perScriptTransfers: scripts,
      };
    },
  };
}

async function navigateAndWaitForLoad(client, url, timeoutMs = 20000) {
  let loadFired = false;
  const loadPromise = new Promise((resolvePromise) => {
    client.on("Page.loadEventFired", () => {
      if (!loadFired) {
        loadFired = true;
        resolvePromise(true);
      }
    });
  });
  await client.send("Page.navigate", { url });
  await Promise.race([loadPromise, wait(timeoutMs)]);
}

async function runSingleColdRouteMeasurement(browserClient, profile, route, runNumber) {
  const { browserContextId } = await browserClient.send("Target.createBrowserContext", {
    disposeOnDetach: true,
  });
  const { targetId } = await browserClient.send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });

  const targetWsUrl = await lookupTargetWsUrl(targetId);
  const client = createCdpClient(targetWsUrl);
  const runtimeErrors = [];

  try {
    await client.ready;
    client.on("Runtime.exceptionThrown", (event) => {
      runtimeErrors.push(event.exceptionDetails?.text ?? "runtime_exception");
    });

    const scriptTracker = attachScriptNetworkTracker(client);
    await configureProfileSession(client, profile);

    const targetUrl = `${siteUrl}${route}`;
    await navigateAndWaitForLoad(client, targetUrl, 25000);

    // Wait for fonts, visible above-the-fold images, and (on /) the offline catalog fallback resolution
    // so initial-load LCP and Suspense fallback swaps settle cleanly before scrolling.
    const initialSettleMs = route === "/" ? 2200 : 700;
    await evaluate(
      client,
      `(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        if (document.fonts && document.fonts.ready) {
          await Promise.race([document.fonts.ready, delay(4000)]);
        }
        const visibleImgs = Array.from(document.images).filter((img) => {
          const rect = img.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        });
        await Promise.race([
          Promise.all(visibleImgs.map((img) => img.complete
            ? Promise.resolve()
            : new Promise((r) => {
                img.addEventListener('load', r, { once: true });
                img.addEventListener('error', r, { once: true });
              }))),
          delay(6000),
        ]);
        await delay(${initialSettleMs});
        return true;
      })()`,
    );

    // Sample post-load rAF intervals over a deterministic 500ms observation window and snapshot initial-load LCP
    const postLoadSample = await evaluate(
      client,
      `(async () => {
        const deltas = [];
        await new Promise((resolveWindow) => {
          const start = performance.now();
          let prev = start;
          function tick(now) {
            const dt = now - prev;
            prev = now;
            if (deltas.length > 0 || dt > 0) deltas.push(Math.round(dt * 100) / 100);
            if (now - start >= 500) {
              resolveWindow();
              return;
            }
            requestAnimationFrame(tick);
          }
          requestAnimationFrame((first) => {
            prev = first;
            requestAnimationFrame(tick);
          });
        });

        const state = window.__adoraMetrics;
        if (state) {
          const entries = state.lcpEntries;
          state.initialLoadLcpSnapshot = entries.length > 0 ? entries[entries.length - 1] : null;
          state.phase = 'scroll_pass';
        }
        return { postLoadRafDeltasMs: deltas };
      })()`,
    );

    // Deterministic full-page scroll pass (reusable for both unanimated 0.3 and animated 0.4)
    const scrollPassResult = await evaluate(
      client,
      `(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        const scrollRafDeltas = [];
        let sampling = true;
        let prevFrame = performance.now();
        function sampleLoop(now) {
          if (!sampling) return;
          scrollRafDeltas.push(Math.round((now - prevFrame) * 100) / 100);
          prevFrame = now;
          requestAnimationFrame(sampleLoop);
        }
        requestAnimationFrame((t0) => {
          prevFrame = t0;
          requestAnimationFrame(sampleLoop);
        });

        document.documentElement.style.scrollBehavior = 'auto';
        const stepPx = Math.max(Math.floor(window.innerHeight * 0.75), 400);
        let stepsExecuted = 0;
        for (let y = 0; y <= document.documentElement.scrollHeight; y += stepPx) {
          window.scrollTo(0, y);
          stepsExecuted += 1;
          await delay(260);
          const finiteAnims = document.getAnimations({ subtree: true }).filter((anim) => {
            const iterations = anim.effect?.getTiming?.().iterations;
            return iterations !== Infinity;
          });
          if (finiteAnims.length > 0) {
            await Promise.race([
              Promise.all(finiteAnims.map((anim) => anim.finished.catch(() => null))),
              delay(1200),
            ]);
            await delay(120);
          }
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
        await delay(300);
        await Promise.race([
          Promise.all(Array.from(document.images).map((img) => img.complete
            ? Promise.resolve()
            : new Promise((r) => {
                img.addEventListener('load', r, { once: true });
                img.addEventListener('error', r, { once: true });
              }))),
          delay(5000),
        ]);
        window.scrollTo(0, 0);
        await delay(260);
        sampling = false;

        const allAnimations = document.getAnimations({ subtree: true }).map((anim) => ({
          animationName: anim.animationName ?? null,
          playState: anim.playState,
          infinite: anim.effect?.getTiming?.().iterations === Infinity,
        }));

        let nonAutoWillChangeCount = 0;
        for (const el of document.querySelectorAll('*')) {
          const wc = getComputedStyle(el).willChange;
          if (wc && wc !== 'auto') nonAutoWillChangeCount += 1;
        }

        const pendingRevealCount = document.querySelectorAll('[data-reveal="pending"]').length;

        return {
          stepsExecuted,
          stepPx,
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          scrollRafDeltasMs: scrollRafDeltas,
          activeAnimationsAfterSettle: allAnimations,
          nonAutoWillChangeCount,
          pendingRevealCount,
        };
      })()`,
    );

    const inPageMetrics = await evaluate(client, "window.__adoraMetrics ?? null");
    const scriptSummary = scriptTracker.summarize();

    const lcpSupported = Boolean(inPageMetrics?.supportedEntryTypes?.includes("largest-contentful-paint"));
    const lcpCandidate =
      inPageMetrics?.initialLoadLcpSnapshot ??
      (inPageMetrics?.lcpEntries?.length > 0
        ? inPageMetrics.lcpEntries[inPageMetrics.lcpEntries.length - 1]
        : null);

    const clsSupported = Boolean(inPageMetrics?.supportedEntryTypes?.includes("layout-shift"));
    const allShiftEntries = inPageMetrics?.layoutShiftEntries ?? [];
    const unexpectedShifts = allShiftEntries.filter((e) => !e.hadRecentInput);
    const clsInitialLoad = round(
      unexpectedShifts
        .filter((e) => e.phase === "initial_load")
        .reduce((acc, e) => acc + e.value, 0),
      5,
    );
    const clsScrollPass = round(
      unexpectedShifts
        .filter((e) => e.phase === "scroll_pass")
        .reduce((acc, e) => acc + e.value, 0),
      5,
    );
    const clsCumulative = round(
      unexpectedShifts.reduce((acc, e) => acc + e.value, 0),
      5,
    );
    const clsSessionWindow = computeMaxSessionWindowCls(allShiftEntries);

    const longTaskSupported = Boolean(inPageMetrics?.supportedEntryTypes?.includes("longtask"));
    const longTasks = inPageMetrics?.longTaskEntries ?? [];
    const totalLongTaskTimeMs =
      round(longTasks.reduce((acc, t) => acc + t.durationMs, 0), 2) ?? 0;
    const totalBlockingTimeMs =
      round(longTasks.reduce((acc, t) => acc + Math.max(0, t.durationMs - 50), 0), 2) ?? 0;
    const maxLongTaskMs =
      longTasks.length > 0 ? round(Math.max(...longTasks.map((t) => t.durationMs)), 2) : 0;

    const combinedRaf = [
      ...(postLoadSample?.postLoadRafDeltasMs ?? []),
      ...(scrollPassResult?.scrollRafDeltasMs ?? []),
    ];

    return {
      runNumber,
      lcp: {
        supported: lcpSupported,
        timestampMs: lcpCandidate ? lcpCandidate.startTimeMs : null,
        elementTag: lcpCandidate ? lcpCandidate.elementTag : null,
        elementIdentity: lcpCandidate ? lcpCandidate.elementIdentity : null,
        imageSrc: lcpCandidate ? lcpCandidate.imageSrc : null,
        representativeText: lcpCandidate ? lcpCandidate.representativeText : null,
        size: lcpCandidate ? lcpCandidate.size : null,
        candidateCountBeforeScroll: inPageMetrics?.lcpEntries?.filter((e) => e.phaseAtCapture === "initial_load").length ?? 0,
        missingReason: !lcpSupported
          ? "largest-contentful-paint not supported by PerformanceObserver"
          : !lcpCandidate
            ? "No largest-contentful-paint entry emitted before scroll pass"
            : null,
      },
      cls: {
        supported: clsSupported,
        cumulativeScore: clsSupported ? clsCumulative : null,
        maxSessionWindowScore: clsSupported ? clsSessionWindow : null,
        initialLoadScore: clsSupported ? clsInitialLoad : null,
        scrollPassScore: clsSupported ? clsScrollPass : null,
        totalShiftEntryCount: allShiftEntries.length,
        hadRecentInputEntryCount: allShiftEntries.filter((e) => e.hadRecentInput).length,
        entries: allShiftEntries,
        missingReason: !clsSupported ? "layout-shift not supported by PerformanceObserver" : null,
      },
      longTasks: {
        supported: longTaskSupported,
        count: longTaskSupported ? longTasks.length : null,
        durationsMs: longTasks.map((t) => t.durationMs),
        totalLongTaskTimeMs: longTaskSupported ? totalLongTaskTimeMs : null,
        totalBlockingTimeMs: longTaskSupported ? totalBlockingTimeMs : null,
        maxTaskDurationMs: longTaskSupported ? maxLongTaskMs : null,
        missingReason: !longTaskSupported ? "longtask not supported by PerformanceObserver" : null,
      },
      javascriptTransfer: scriptSummary,
      frameBaseline: {
        postLoadWindowMs: 500,
        sampleCount: combinedRaf.length,
        medianFrameIntervalMs: computeMedian(combinedRaf, 2),
        p95FrameIntervalMs: computePercentile(combinedRaf, 95, 2),
        maxFrameIntervalMs: combinedRaf.length > 0 ? round(Math.max(...combinedRaf), 2) : null,
        framesOver50ms: combinedRaf.filter((dt) => dt > 50).length,
        activeAnimationsAfterSettle: scrollPassResult?.activeAnimationsAfterSettle ?? [],
        nonAutoWillChangeCount: scrollPassResult?.nonAutoWillChangeCount ?? 0,
        pendingRevealCount: scrollPassResult?.pendingRevealCount ?? 0,
      },
      layoutGeometry: {
        innerWidth: scrollPassResult?.innerWidth ?? null,
        scrollWidth: scrollPassResult?.scrollWidth ?? null,
        scrollHeight: scrollPassResult?.scrollHeight ?? null,
        scrollStepsExecuted: scrollPassResult?.stepsExecuted ?? 0,
      },
      observerErrors: inPageMetrics?.observerErrors ?? [],
      runtimeErrors,
    };
  } finally {
    client.close();
    try {
      await browserClient.send("Target.closeTarget", { targetId });
    } catch {
      // Ignore if already closed.
    }
    try {
      await browserClient.send("Target.disposeBrowserContext", { browserContextId });
    } catch {
      // Ignore if already disposed.
    }
  }
}

async function runSingleTrustedInteraction(browserClient, profile, spec, runNumber) {
  const { browserContextId } = await browserClient.send("Target.createBrowserContext", {
    disposeOnDetach: true,
  });
  const { targetId } = await browserClient.send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });

  const targetWsUrl = await lookupTargetWsUrl(targetId);
  const client = createCdpClient(targetWsUrl);

  try {
    await client.ready;
    await configureProfileSession(client, profile);
    await navigateAndWaitForLoad(client, `${siteUrl}${spec.route}`, 25000);
    await wait(650);

    const targetCoords = await evaluate(client, spec.locateSelectorExpression);
    if (!targetCoords || !Number.isFinite(targetCoords.x) || !Number.isFinite(targetCoords.y)) {
      return {
        runNumber,
        verified: false,
        missingReason: `Target element not found for ${spec.id} on ${spec.route}`,
      };
    }

    // Allow scrollIntoView layout to settle and arm a double-rAF next-paint timer on pointerdown
    await evaluate(
      client,
      `(async () => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (window.__adoraMetrics) {
          window.__adoraMetrics.eventTimingEntries.length = 0;
          window.__adoraMetrics.firstInputEntries.length = 0;
        }
        window.__adoraNextFrameLatencyMs = null;
        window.addEventListener(
          'click',
          () => {
            const t0 = performance.now();
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.__adoraNextFrameLatencyMs = Math.round((performance.now() - t0) * 100) / 100;
              });
            });
          },
          { capture: true, once: true },
        );
        return true;
      })()`,
    );

    const x = Math.round(targetCoords.x);
    const y = Math.round(targetCoords.y);

    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "none",
    });
    await client.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      buttons: 1,
      clickCount: 1,
    });
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      buttons: 0,
      clickCount: 1,
    });

    await wait(320);

    const verification = targetCoords.controlId
      ? await evaluate(
          client,
          `(${spec.verifyExpression})(${JSON.stringify(targetCoords.controlId)})`,
        )
      : await evaluate(client, spec.verifyExpression);

    const timingSnapshot = await evaluate(
      client,
      `(() => {
        const m = window.__adoraMetrics;
        return {
          eventSupported: Boolean(m?.supportedEntryTypes?.includes('event')),
          firstInputSupported: Boolean(m?.supportedEntryTypes?.includes('first-input')),
          eventEntries: m?.eventTimingEntries ?? [],
          firstInputEntries: m?.firstInputEntries ?? [],
          clientClickToNextPaintMs: window.__adoraNextFrameLatencyMs ?? null,
        };
      })()`,
    );

    const discreteEvents = (timingSnapshot.eventEntries ?? []).filter((e) =>
      ["pointerdown", "mousedown", "pointerup", "mouseup", "click", "keydown", "keyup"].includes(e.name),
    );
    const firstInput = timingSnapshot.firstInputEntries?.[0] ?? null;

    const maxEventTimingAbove16Ms =
      discreteEvents.length > 0
        ? round(Math.max(...discreteEvents.map((e) => e.durationMs)), 2)
        : null;

    // Combined W3C Event Timing duration: uses max discrete event entry (>=16ms) if present,
    // otherwise falls back to W3C `first-input` PerformanceEventTiming entry (which has no 16ms floor).
    const observedEventTimingDurationMs =
      maxEventTimingAbove16Ms !== null
        ? maxEventTimingAbove16Ms
        : firstInput
          ? firstInput.durationMs
          : null;

    const observedProcessingDurationMs =
      discreteEvents.length > 0
        ? round(Math.max(...discreteEvents.map((e) => e.processingDurationMs)), 2)
        : firstInput
          ? firstInput.processingDurationMs
          : null;

    return {
      runNumber,
      verified: Boolean(verification?.verified),
      observedState: verification?.observedState ?? null,
      eventTimingSupported: timingSnapshot.eventSupported,
      firstInputSupported: timingSnapshot.firstInputSupported,
      exceeded16msEventThreshold: discreteEvents.length > 0,
      eventTimingDurationMs: observedEventTimingDurationMs,
      eventTimingAbove16msMaxMs: maxEventTimingAbove16Ms,
      firstInputDurationMs: firstInput ? firstInput.durationMs : null,
      processingDurationMs: observedProcessingDurationMs,
      clientClickToNextPaintMs: timingSnapshot.clientClickToNextPaintMs,
      discreteEventCountAbove16ms: discreteEvents.length,
      missingReason:
        !timingSnapshot.eventSupported && !timingSnapshot.firstInputSupported
          ? "Event Timing API (event / first-input) not supported in this browser"
          : observedEventTimingDurationMs === null
            ? "Trusted interaction completed below 16ms event threshold and no first-input entry was emitted"
            : null,
    };
  } finally {
    client.close();
    try {
      await browserClient.send("Target.closeTarget", { targetId });
    } catch {
      // Ignore.
    }
    try {
      await browserClient.send("Target.disposeBrowserContext", { browserContextId });
    } catch {
      // Ignore.
    }
  }
}

function summarizeRouteRuns(route, profileId, samples) {
  const lcpTimestamps = samples.map((s) => s.lcp.timestampMs);
  const clsCumulativeScores = samples.map((s) => s.cls.cumulativeScore);
  const clsSessionScores = samples.map((s) => s.cls.maxSessionWindowScore);
  const clsInitialScores = samples.map((s) => s.cls.initialLoadScore);
  const clsScrollScores = samples.map((s) => s.cls.scrollPassScore);
  const longTaskCounts = samples.map((s) => s.longTasks.count);
  const longTaskTotals = samples.map((s) => s.longTasks.totalLongTaskTimeMs);
  const tbtTotals = samples.map((s) => s.longTasks.totalBlockingTimeMs);
  const maxLongTasks = samples.map((s) => s.longTasks.maxTaskDurationMs);
  const jsTransferBytes = samples.map((s) => s.javascriptTransfer.totalCompressedTransferBytes);
  const cachedScriptCounts = samples.map((s) => s.javascriptTransfer.cachedScriptCount);
  const rafMedians = samples.map((s) => s.frameBaseline.medianFrameIntervalMs);
  const rafP95s = samples.map((s) => s.frameBaseline.p95FrameIntervalMs);

  // Representative LCP element from the run closest to the median LCP timestamp
  const medianLcp = computeMedian(lcpTimestamps, 2);
  let representativeLcp = null;
  if (medianLcp !== null) {
    const sortedByDist = samples
      .filter((s) => typeof s.lcp.timestampMs === "number")
      .sort((a, b) => Math.abs(a.lcp.timestampMs - medianLcp) - Math.abs(b.lcp.timestampMs - medianLcp));
    if (sortedByDist[0]) {
      representativeLcp = {
        elementTag: sortedByDist[0].lcp.elementTag,
        elementIdentity: sortedByDist[0].lcp.elementIdentity,
        imageSrc: sortedByDist[0].lcp.imageSrc,
        representativeText: sortedByDist[0].lcp.representativeText,
        size: sortedByDist[0].lcp.size,
      };
    }
  }

  return {
    route,
    profileId,
    completedColdRuns: samples.length,
    lcp: {
      medianMs: medianLcp,
      minMs: lcpTimestamps.some((v) => v !== null) ? round(Math.min(...lcpTimestamps.filter((v) => v !== null)), 2) : null,
      maxMs: lcpTimestamps.some((v) => v !== null) ? round(Math.max(...lcpTimestamps.filter((v) => v !== null)), 2) : null,
      representativeElement: representativeLcp,
      missingRuns: samples.filter((s) => s.lcp.timestampMs === null).map((s) => ({
        run: s.runNumber,
        reason: s.lcp.missingReason,
      })),
    },
    cls: {
      medianCumulativeScore: computeMedian(clsCumulativeScores, 5),
      medianMaxSessionWindowScore: computeMedian(clsSessionScores, 5),
      medianInitialLoadScore: computeMedian(clsInitialScores, 5),
      medianScrollPassScore: computeMedian(clsScrollScores, 5),
      maxCumulativeScoreAcrossRuns: clsCumulativeScores.some((v) => v !== null)
        ? round(Math.max(...clsCumulativeScores.filter((v) => v !== null)), 5)
        : null,
    },
    longTasks: {
      medianCount: computeMedian(longTaskCounts, 1),
      medianTotalLongTaskTimeMs: computeMedian(longTaskTotals, 2),
      medianTotalBlockingTimeMs: computeMedian(tbtTotals, 2),
      maxIndividualTaskDurationMsAcrossRuns: maxLongTasks.some((v) => v !== null)
        ? round(Math.max(...maxLongTasks.filter((v) => v !== null)), 2)
        : null,
    },
    javascriptTransfer: {
      medianCompressedTransferBytes: computeMedian(jsTransferBytes, 0),
      scriptResourceCount: samples[0]?.javascriptTransfer?.scriptCount ?? 0,
      anyServedFromCacheCountAcrossRuns: cachedScriptCounts.reduce((acc, c) => acc + (c ?? 0), 0),
    },
    frameBaselineIndicative: {
      medianOfRunMedianFrameIntervalMs: computeMedian(rafMedians, 2),
      medianOfRunP95FrameIntervalMs: computeMedian(rafP95s, 2),
      totalFramesOver50msAcrossRuns: samples.reduce((acc, s) => acc + (s.frameBaseline.framesOver50ms ?? 0), 0),
      maxNonAutoWillChangeCount: Math.max(...samples.map((s) => s.frameBaseline.nonAutoWillChangeCount ?? 0)),
      caveat: "Indicative headless-Chromium rAF interval sample; not a physical device GPU frame-rate measurement.",
    },
  };
}

function summarizeInteractionRuns(spec, profileId, samples) {
  const durations = samples.map((s) => s.eventTimingDurationMs);
  const processingDurations = samples.map((s) => s.processingDurationMs);
  const nextPaintProxies = samples.map((s) => s.clientClickToNextPaintMs);
  const validDurations = durations.filter((v) => typeof v === "number");

  return {
    interactionId: spec.id,
    route: spec.route,
    description: spec.description,
    profileId,
    completedRuns: samples.length,
    verifiedDomUpdateRuns: samples.filter((s) => s.verified).length,
    eventTimingSupported: samples.every((s) => s.eventTimingSupported),
    firstInputSupported: samples.every((s) => s.firstInputSupported),
    runsExceeding16msEventThreshold: samples.filter((s) => s.exceeded16msEventThreshold).length,
    medianEventTimingDurationMs: computeMedian(durations, 2),
    maxEventTimingDurationMs: validDurations.length > 0 ? round(Math.max(...validDurations), 2) : null,
    medianProcessingDurationMs: computeMedian(processingDurations, 2),
    medianClientClickToNextPaintMs: computeMedian(nextPaintProxies, 2),
    caveat:
      "Synthetic laboratory trusted-CDP input proxy (W3C Event Timing / first-input + double-rAF next-paint); not equivalent to field CrUX INP.",
  };
}

const scriptContentBuffer = await readFile(scriptFilePath);
const collectorSha256 = createHash("sha256").update(scriptContentBuffer).digest("hex");
const rootPkg = JSON.parse(await readFile(resolve(repoRoot, "package.json"), "utf8"));
const webPkg = JSON.parse(await readFile(resolve(repoRoot, "apps/web/package.json"), "utf8"));

const gitBranch = runGit(["branch", "--show-current"]);
const currentHeadSha = runGit(["rev-parse", "HEAD"]);
const appDiffAgainstBaseline = runGit([
  "diff",
  "--name-only",
  baselineAppSha,
  "--",
  "apps/web",
  "packages",
  "package.json",
  "pnpm-lock.yaml",
]);
const appWorkingTreeStatus = runGit([
  "status",
  "--porcelain",
  "--",
  "apps/web",
  "packages",
  "package.json",
  "pnpm-lock.yaml",
]);
const appByteIdenticalTo03Baseline =
  appDiffAgainstBaseline === "" && appWorkingTreeStatus === "";

// Confirm FastAPI offline condition on localhost:8000
let fastApiReachable = false;
try {
  const apiProbe = await fetch("http://127.0.0.1:8000/health", {
    signal: AbortSignal.timeout(800),
  });
  fastApiReachable = apiProbe.ok;
} catch {
  fastApiReachable = false;
}

const profileDirectory = await mkdtemp(join(tmpdir(), "adora-motion-metrics-chrome-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

try {
  const versionInfo = await waitForJsonVersion();
  const browserClient = createCdpClient(versionInfo.webSocketDebuggerUrl);
  await browserClient.ready;

  const routeMedians = [];
  const rawRouteSamples = {};
  const interactionSummaries = [];
  const rawInteractionSamples = {};
  const missingOrUnsupportedNotes = [];

  for (const profile of PROFILES) {
    rawRouteSamples[profile.id] = {};
    for (const route of TESTED_ROUTES) {
      console.error(
        `[${profile.id}] Measuring route ${route} (${runsPerRoute} cold runs)...`,
      );
      const samples = [];
      for (let runNumber = 1; runNumber <= runsPerRoute; runNumber += 1) {
        const sample = await runSingleColdRouteMeasurement(
          browserClient,
          profile,
          route,
          runNumber,
        );
        samples.push(sample);
      }
      rawRouteSamples[profile.id][route] = samples;
      const summary = summarizeRouteRuns(route, profile.id, samples);
      routeMedians.push(summary);

      if (summary.lcp.missingRuns.length > 0) {
        missingOrUnsupportedNotes.push({
          scope: `${profile.id}:${route}:lcp`,
          missingRuns: summary.lcp.missingRuns,
        });
      }
    }

    rawInteractionSamples[profile.id] = {};
    for (const spec of INTERACTION_SPECS) {
      console.error(
        `[${profile.id}] Measuring trusted interaction ${spec.id} on ${spec.route} (${runsPerRoute} cold runs)...`,
      );
      const samples = [];
      for (let runNumber = 1; runNumber <= runsPerRoute; runNumber += 1) {
        const sample = await runSingleTrustedInteraction(
          browserClient,
          profile,
          spec,
          runNumber,
        );
        samples.push(sample);
      }
      rawInteractionSamples[profile.id][spec.id] = samples;
      const summary = summarizeInteractionRuns(spec, profile.id, samples);
      interactionSummaries.push(summary);

      if (summary.medianEventTimingDurationMs === null) {
        missingOrUnsupportedNotes.push({
          scope: `${profile.id}:${spec.id}:eventTiming`,
          reason: "No PerformanceEventTiming entry emitted across runs",
        });
      }
    }
  }

  browserClient.close();

  const postRunAppDiff = runGit([
    "diff",
    "--name-only",
    baselineAppSha,
    "--",
    "apps/web",
    "packages",
    "package.json",
    "pnpm-lock.yaml",
  ]);
  const postRunAppStatus = runGit([
    "status",
    "--porcelain",
    "--",
    "apps/web",
    "packages",
    "package.json",
    "pnpm-lock.yaml",
  ]);

  const cpuList = cpus();
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    phaseLabel,
    collectedAt: new Date().toISOString(),
    project: rootPkg.name ?? "adora-system",
    collector: {
      scriptPath: relative(repoRoot, scriptFilePath).replace(/\\/g, "/"),
      version: COLLECTOR_VERSION,
      sha256: collectorSha256,
    },
    git: {
      branch: gitBranch,
      currentHeadSha,
      webDesign03ApplicationBaselineSha: baselineAppSha,
      documentationCheckpointSha: explicitDocsSha ?? currentHeadSha,
      applicationSourceIntegrity: {
        preCollectionByteIdenticalTo03Baseline: appByteIdenticalTo03Baseline,
        postCollectionByteIdenticalTo03Baseline:
          postRunAppDiff === "" && postRunAppStatus === "",
        modifiedApplicationPaths: postRunAppDiff ? postRunAppDiff.split(/\r?\n/) : [],
      },
    },
    environment: {
      osPlatform: platform(),
      osRelease: release(),
      cpuArchitecture: arch(),
      logicalCpuCount: cpuList.length,
      cpuModelSummary: cpuList[0]?.model?.trim() ?? null,
      totalMemoryGiB: round(totalmem() / 1024 ** 3, 1),
      nodeVersion: process.version,
      pnpmVersion: detectPnpmVersion(rootPkg),
      nextVersion: webPkg.dependencies?.next ?? null,
      reactVersion: webPkg.dependencies?.react ?? null,
      chromeBrowser: versionInfo.Browser ?? null,
      cdpProtocolVersion: versionInfo["Protocol-Version"] ?? null,
      v8Version: versionInfo["V8-Version"] ?? null,
      siteOrigin: siteUrl,
      productionBuildMode: true,
      fastApiReachable,
    },
    methodology: {
      coldRunIsolation:
        "Each run creates a fresh isolated CDP BrowserContext (Target.createBrowserContext), disables network cache (Network.setCacheDisabled), clears browser cache, and disposes the context after capture.",
      runsPerRouteAndProfile: runsPerRoute,
      clsMeasurementWindow:
        "Phase 1 (initial_load): navigation start through Page.loadEventFired, document.fonts.ready, initial-viewport images complete, plus post-load settle (2200ms on / to include offline catalog Suspense fallback resolution; 700ms on static routes). Phase 2 (scroll_pass): stepped scroll from y=0 to scrollHeight in 0.75*innerHeight increments (260ms dwell + finite animation completion wait) and return to y=0.",
      lcpMeasurementWindow:
        "Captured via buffered PerformanceObserver('largest-contentful-paint') initialized via Page.addScriptToEvaluateOnNewDocument and snapshotted immediately before the programmatic scroll pass so below-the-fold scroll images do not overwrite initial-load LCP.",
      interactionMeasurementProtocol:
        "Trusted mouse events dispatched via CDP Input.dispatchMouseEvent on fresh page loads per interaction, capturing both W3C PerformanceObserver('event', durationThreshold: 16) and PerformanceObserver('first-input') (which has no 16ms floor), alongside a double-rAF click-to-next-paint timing.",
      profiles: PROFILES,
      testedRoutes: TESTED_ROUTES,
      testedInteractions: INTERACTION_SPECS.map(({ id, route, description }) => ({
        id,
        route,
        description,
      })),
    },
    limitations: [
      "Synthetic headless-Chromium laboratory measurements on a single workstation are for controlled A/B comparison (Package A0 vs Package E) and are not equivalent to field CrUX telemetry or physical mobile hardware GPU profiling.",
      "Chromium's W3C Event Timing 'event' observer enforces a minimum durationThreshold of 16ms; sub-16ms discrete interactions are captured via the W3C 'first-input' observer (8ms coarsened resolution) and a client double-rAF next-paint timer.",
      "RequestAnimationFrame interval sampling in headless mode reflects software/headless compositor scheduling rather than physical mobile display refresh pacing.",
      "FastAPI backend is intentionally offline per Frontend-First scope; '/' exercises the deterministic 1800ms catalog fallback path.",
    ],
    missingOrUnsupportedMetrics: missingOrUnsupportedNotes,
    mediansByRouteAndProfile: routeMedians,
    interactionLatencySummaries: interactionSummaries,
    rawSamples: {
      routes: rawRouteSamples,
      interactions: rawInteractionSamples,
    },
  };

  await mkdir(dirname(outputFilePath), { recursive: true });
  await writeFile(outputFilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: "ok",
        outputFile: relative(repoRoot, outputFilePath).replace(/\\/g, "/"),
        routeProfileCells: routeMedians.length,
        totalColdRouteRuns: routeMedians.reduce((acc, r) => acc + r.completedColdRuns, 0),
        interactionProfileCells: interactionSummaries.length,
        totalInteractionRuns: interactionSummaries.reduce((acc, i) => acc + i.completedRuns, 0),
        applicationByteIdentical:
          payload.git.applicationSourceIntegrity.postCollectionByteIdenticalTo03Baseline,
      },
      null,
      2,
    ),
  );
} finally {
  chrome.kill();
  await Promise.race([new Promise((r) => chrome.once("exit", r)), wait(2000)]);
  const resolvedProfile = resolve(profileDirectory);
  if (
    resolvedProfile.startsWith(resolve(tmpdir())) &&
    basename(resolvedProfile).startsWith("adora-motion-metrics-chrome-")
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(resolvedProfile, { recursive: true, force: true });
        break;
      } catch {
        await wait(250);
      }
    }
  }
}

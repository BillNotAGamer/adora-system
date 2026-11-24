import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = process.env.CXP04D_PERF_PORT || "3105";
const BASE_URL = process.env.ADORA_WEB_URL || `http://127.0.0.1:${PORT}`;
const PROFILE_LABEL = process.env.CXP04D_PROFILE || "mode-off";
const SAMPLES = Number(process.env.CXP04D_SAMPLES || 5);
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = Number(process.env.CXP04D_PERF_CDP_PORT || 9255);
const MEASURE_OPEN = process.env.CXP04D_MEASURE_OPEN === "1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(150);
  }
  throw new Error("Timed out waiting for Chrome CDP");
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
    close() {
      ws.close();
    },
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function runProfile(vp) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "adora-perf-"));
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--window-size=${vp.w},${vp.h}`,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  const samples = [];
  let openMeasurement = null;

  try {
    await waitForCdp(CDP_PORT);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
    const client = createCdp(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: vp.w,
      height: vp.h,
      deviceScaleFactor: vp.dpr,
      mobile: vp.mobile,
    });
    if (vp.cpuRate > 1) {
      await client.send("Emulation.setCPUThrottlingRate", { rate: vp.cpuRate });
    }

    let reqTypes = new Map();
    let bytesByType = { Script: 0, Stylesheet: 0, Image: 0 };
    client.on("Network.requestWillBeSent", (p) => reqTypes.set(p.requestId, p.type));
    client.on("Network.loadingFinished", (p) => {
      const t = reqTypes.get(p.requestId);
      if (t && bytesByType[t] !== undefined) bytesByType[t] += p.encodedDataLength || 0;
    });

    for (let i = 0; i < SAMPLES; i++) {
      reqTypes = new Map();
      bytesByType = { Script: 0, Stylesheet: 0, Image: 0 };
      await client.send("Page.navigate", { url: `${BASE_URL}/` });
      await client.send("Runtime.evaluate", {
        expression: `(() => {
          window.__lcp = 0; window.__cls = 0; window.__ltCount = 0; window.__ltMax = 0;
          new PerformanceObserver(list => { for (const e of list.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver(list => { for (const e of list.getEntries()) { window.__ltCount += 1; window.__ltMax = Math.max(window.__ltMax, e.duration); } }).observe({ type: 'longtask', buffered: true });
        })()`,
      });
      await sleep(1600);
      const perfRes = await client.send("Runtime.evaluate", {
        expression: `({ lcpMs: Math.round(window.__lcp || 0), cls: Number((window.__cls || 0).toFixed(4)), longTaskCount: window.__ltCount || 0, maxLongTaskMs: Math.round(window.__ltMax || 0) })`,
        returnByValue: true,
      });
      samples.push({
        ...(perfRes.result?.value || {}),
        jsBytes: bytesByType.Script,
        cssBytes: bytesByType.Stylesheet,
        imgBytes: bytesByType.Image,
      });
    }

    if (MEASURE_OPEN) {
      const preJs = bytesByType.Script;
      const preImg = bytesByType.Image;
      await client.send("Runtime.evaluate", {
        expression: `(() => { performance.mark('open-click'); document.querySelector('header a[data-concierge-trigger]')?.click(); })()`,
      });
      await sleep(900);
      const openStats = await client.send("Runtime.evaluate", {
        expression: `(() => {
          const painted = performance.getEntriesByName('adora-concierge-painted').at(-1);
          const click = performance.getEntriesByName('open-click').at(-1);
          return {
            openToPaintedMs: painted && click ? Math.round(painted.startTime - click.startTime) : null,
            hasOpenAtelier: Boolean(document.querySelector('dialog.cxp04-dialog-host[open]')),
          };
        })()`,
        returnByValue: true,
      });
      openMeasurement = {
        incrementalJsBytes: bytesByType.Script - preJs,
        incrementalImgBytes: bytesByType.Image - preImg,
        ...(openStats.result?.value || {}),
      };
    }

    client.close();
  } finally {
    chrome.kill();
    await sleep(250);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  const lcpVals = samples.map((s) => s.lcpMs);
  return {
    viewport: vp.name,
    cpuThrottling: vp.cpuRate,
    sampleCount: samples.length,
    medianLcpMs: median(lcpVals),
    lcpRangeMs: [Math.min(...lcpVals), Math.max(...lcpVals)],
    maxCls: Math.max(...samples.map((s) => s.cls)),
    medianJsBytes: median(samples.map((s) => s.jsBytes)),
    medianCssBytes: median(samples.map((s) => s.cssBytes)),
    medianImgBytes: median(samples.map((s) => s.imgBytes)),
    totalLongTasksAcrossSamples: samples.reduce((acc, s) => acc + s.longTaskCount, 0),
    maxLongTaskMs: Math.max(...samples.map((s) => s.maxLongTaskMs)),
    openMeasurement,
  };
}

async function main() {
  const desktop = await runProfile({ name: "1440x900", w: 1440, h: 900, dpr: 1, mobile: false, cpuRate: 1 });
  const mobile = await runProfile({ name: "390x844", w: 390, h: 844, dpr: 2, mobile: true, cpuRate: 4 });
  console.log(JSON.stringify({ profile: PROFILE_LABEL, desktop, mobile }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

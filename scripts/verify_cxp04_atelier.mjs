import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = process.env.CXP04_PORT || "3104";
const BASE_URL = process.env.ADORA_WEB_URL || `http://127.0.0.1:${PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = Number(process.env.CXP04_CDP_PORT || 9249);
const SCRATCH_DIR =
  process.env.CXP04_SCRATCH_DIR || path.join(os.tmpdir(), "adora-cxp04-scratch");
const REPORT_ASSETS_DIR =
  process.env.CXP04_OUTPUT_DIR ||
  path.resolve(process.cwd(), "docs/reports/assets/cxp04");

fs.mkdirSync(SCRATCH_DIR, { recursive: true });
fs.mkdirSync(REPORT_ASSETS_DIR, { recursive: true });

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

async function capture(client, filename) {
  const { data } = await client.send("Page.captureScreenshot", { format: "png" });
  const out = path.join(REPORT_ASSETS_DIR, filename);
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  return out;
}

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "adora-cxp04-chrome-"));
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  const report = {
    url: `${BASE_URL}/creative-lab/concierge-experience`,
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    flow: {},
    overflowChecks: {},
    reducedMotion: null,
    regressionCheck: {},
    recording: { frames: 0, webmPath: null, webmBytes: 0 },
  };

  const framesDir = path.join(SCRATCH_DIR, "atelier_frames");
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  try {
    await waitForCdp(CDP_PORT);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
    const client = createCdp(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");

    client.on("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error") {
        report.consoleErrors.push(p.args.map((a) => a.value ?? a.description).join(" "));
      }
    });
    client.on("Runtime.exceptionThrown", (p) => {
      report.pageErrors.push(p.exceptionDetails.text);
    });
    client.on("Network.loadingFailed", (p) => {
      if (!p.canceled) report.failedRequests.push(`${p.type}: ${p.errorText}`);
    });

    // Desktop 1440x900 interactive walkthrough + genuine CDP screencast recording
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    let frameIdx = 0;
    const onFrame = async (params) => {
      const idx = frameIdx++;
      fs.writeFileSync(
        path.join(framesDir, `f_${String(idx).padStart(4, "0")}.jpg`),
        Buffer.from(params.data, "base64"),
      );
      try {
        await client.send("Page.screencastFrameAck", { sessionId: params.sessionId });
      } catch {}
    };
    client.on("Page.screencastFrame", onFrame);
    await client.send("Page.startScreencast", {
      format: "jpeg",
      quality: 82,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 1,
    });

    await client.send("Page.navigate", { url: `${BASE_URL}/creative-lab/concierge-experience` });
    await sleep(1000);
    report.screenshots.push(await capture(client, "01_desktop_invitation.png"));

    // State I -> II via preset mood "Lãng mạn hai người" (tests contextual branching & inferred companions)
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-preset-chip')).find(b => b.textContent.includes('Lãng mạn'))?.click()`,
    );
    await sleep(450);
    report.flow.afterPreset = await evaluate(
      client,
      `({
        phase: document.querySelector('main')?.getAttribute('data-cxp04-phase'),
        hasInferredBadge: Boolean(document.querySelector('[data-status="inferred"]')),
      })`,
    );
    report.screenshots.push(await capture(client, "02_desktop_discovery.png"));

    // Jump to State III Interpretation, confirm inference, edit duration -> 2 days -> return
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    );
    await sleep(450);
    report.screenshots.push(await capture(client, "03_desktop_interpretation.png"));

    // Confirm inferred companion + edit duration -> 2 days
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-inline-btn')).find(b => b.textContent.trim() === 'Xác nhận')?.click()`,
    );
    await sleep(250);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-inline-btn')).find(b => b.textContent.includes('Thời lượng'))?.click()`,
    );
    await sleep(300);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-choice-btn')).find(b => b.textContent.includes('2 ngày'))?.click()`,
    );
    await sleep(200);
    await evaluate(client, `document.querySelector('[data-cxp04-next-btn]')?.click()`);
    await sleep(350);

    // State IV: Reveal Journey
    await evaluate(client, `document.querySelector('[data-cxp04-reveal-btn]')?.click()`);
    await sleep(550);
    const beforeCost = await evaluate(
      client,
      `document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim() || ''`,
    );
    report.screenshots.push(await capture(client, "04_desktop_journey_reveal.png"));

    // State V: Refinement (lower budget) + Unsupported prompt honesty + IME/Shift+Enter guard
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-refine-chip')).find(b => b.textContent.includes('Giảm ngân sách'))?.click()`,
    );
    await sleep(450);
    const afterCost = await evaluate(
      client,
      `document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim() || ''`,
    );

    const imeAndUnsupported = await evaluate(
      client,
      `(() => {
        const ta = document.querySelector('#cxp04-composer-input');
        const beforeMsgs = document.querySelectorAll('[role="log"] article').length;
        ta.focus();
        document.execCommand('insertText', false, 'Đặt vé máy bay đi Kyoto');
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, shiftKey: true }));
        const afterGuard = document.querySelectorAll('[role="log"] article').length;
        document.querySelector('.cxp04-composer button[type="submit"]').click();
        return new Promise((resolve) => setTimeout(() => {
          const afterSubmit = document.querySelectorAll('[role="log"] article').length;
          const lastProv = document.querySelectorAll('[role="log"] article')[afterSubmit - 1]?.getAttribute('data-provenance');
          resolve({ imeGuarded: afterGuard === beforeMsgs, appendedUnsupported: afterSubmit === beforeMsgs + 2 && lastProv === 'unsupported-notice' });
        }, 250));
      })()`,
    );
    await sleep(400);
    report.screenshots.push(await capture(client, "05_desktop_refinement.png"));
    report.flow.costChanged = beforeCost !== "" && afterCost !== "" && beforeCost !== afterCost;
    report.flow.beforeCost = beforeCost;
    report.flow.afterCost = afterCost;
    report.flow.imeAndUnsupported = imeAndUnsupported;

    await client.send("Page.stopScreencast");
    client.off("Page.screencastFrame", onFrame);
    report.recording.frames = frameIdx;

    // Responsive 6-viewport overflow checks
    for (const vp of [
      { name: "1920x1080", w: 1920, h: 1080, mobile: false },
      { name: "1440x900", w: 1440, h: 900, mobile: false },
      { name: "1024x768", w: 1024, h: 768, mobile: false },
      { name: "768x1024", w: 768, h: 1024, mobile: false },
      { name: "390x844", w: 390, h: 844, mobile: true },
      { name: "360x800", w: 360, h: 800, mobile: true },
    ]) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await sleep(200);
      const ov = await evaluate(
        client,
        `({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })`,
      );
      report.overflowChecks[vp.name] = { ...ov, ok: ov.scrollWidth <= ov.innerWidth };
    }

    // Mobile 390x844 captures (Invitation, Conversation, Itinerary)
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await client.send("Page.navigate", { url: `${BASE_URL}/creative-lab/concierge-experience` });
    await sleep(600);
    report.screenshots.push(await capture(client, "06_mobile_invitation.png"));

    await evaluate(client, `document.querySelector('[data-cxp04-start-btn]')?.click()`);
    await sleep(350);
    report.screenshots.push(await capture(client, "07_mobile_conversation.png"));

    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    );
    await sleep(250);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mở bản phác thảo'))?.click()`,
    );
    await sleep(450);
    report.screenshots.push(await capture(client, "08_mobile_itinerary.png"));

    // Reduced motion check
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await sleep(250);
    report.reducedMotion = await evaluate(
      client,
      `({ matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches, hasCost: Boolean(document.querySelector('[data-cxp04-cost-total]')) })`,
    );
    report.screenshots.push(await capture(client, "09_reduced_motion.png"));
    await client.send("Emulation.setEmulatedMedia", { features: [] });

    // Confirm homepage & /ai-planner remain untouched
    for (const [k, r] of [
      ["home", "/"],
      ["aiPlanner", "/ai-planner"],
    ]) {
      await client.send("Page.navigate", { url: `${BASE_URL}${r}` });
      await sleep(600);
      report.regressionCheck[k] = await evaluate(
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

  // Encode genuine VP9 WebM demo recording into scratch storage
  const ffPath = path.join(
    process.env.LOCALAPPDATA || "",
    "ms-playwright",
    "ffmpeg-1013",
    "ffmpeg-win64.exe",
  );
  const ffmpegBin = fs.existsSync(ffPath) ? ffPath : "ffmpeg";
  const frameFiles = fs.readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).sort();
  if (frameFiles.length > 0) {
    const mjpeg = path.join(SCRATCH_DIR, "atelier_demo.mjpeg");
    const webmOut = path.join(SCRATCH_DIR, "cxp04_atelier_demo.webm");
    fs.writeFileSync(
      mjpeg,
      Buffer.concat(frameFiles.map((f) => fs.readFileSync(path.join(framesDir, f)))),
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
        "12",
        "-i",
        mjpeg,
        "-c:v",
        "libvpx-vp9",
        "-crf",
        "32",
        "-b:v",
        "0",
        webmOut,
      ],
      { stdio: "ignore" },
    );
    if (ff.status === 0 && fs.existsSync(webmOut)) {
      report.recording.webmPath = webmOut;
      report.recording.webmBytes = fs.statSync(webmOut).size;
    }
  }

  fs.writeFileSync(path.join(SCRATCH_DIR, "verify_cxp04_atelier.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed =
    report.consoleErrors.length > 0 ||
    report.pageErrors.length > 0 ||
    report.failedRequests.length > 0 ||
    !report.flow.afterPreset?.hasInferredBadge ||
    !report.flow.costChanged ||
    !report.flow.imeAndUnsupported?.imeGuarded ||
    !report.flow.imeAndUnsupported?.appendedUnsupported ||
    Object.values(report.overflowChecks).some((o) => !o.ok) ||
    !report.reducedMotion?.hasCost;

  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

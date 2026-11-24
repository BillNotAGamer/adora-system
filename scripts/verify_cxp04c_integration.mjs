import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = process.env.CXP04C_PORT || "3105";
const BASE_URL = process.env.ADORA_WEB_URL || `http://127.0.0.1:${PORT}`;
const MODE = process.env.CXP04C_MODE === "off" ? "off" : "on";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT_DESKTOP = Number(process.env.CXP04C_CDP_PORT || 9251);
const CDP_PORT_MOBILE = Number(process.env.CXP04C_CDP_MOBILE_PORT || 9252);
const SCRATCH_DIR =
  process.env.CXP04C_SCRATCH_DIR || path.join(os.tmpdir(), "adora-cxp04d-scratch");
const REPORT_ASSETS_DIR =
  process.env.CXP04C_OUTPUT_DIR ||
  path.resolve(process.cwd(), "docs/reports/assets/cxp04d");

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
  for (let i = 0; i < 60; i++) {
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
 * Wall-clock synchronized CDP screencast recorder.
 * Preserves authentic human-readable interaction timing (~10 fps) without fast-forwarding gaps
 * or distorting native viewport dimensions.
 */
async function startRealtimeRecorder(client, opts) {
  let latestFrame = null;
  const sampledFrames = [];
  const fps = opts.fps || 10;
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
    quality: 86,
    maxWidth: opts.width,
    maxHeight: opts.height,
    everyNthFrame: 1,
  });

  const timer = setInterval(() => {
    if (latestFrame) sampledFrames.push(latestFrame);
  }, intervalMs);

  return {
    async stopAndEncode(outPath) {
      clearInterval(timer);
      await client.send("Page.stopScreencast");
      client.off("Page.screencastFrame", onFrame);
      if (sampledFrames.length === 0 && latestFrame) sampledFrames.push(latestFrame);
      if (sampledFrames.length === 0) return { frames: 0, webmPath: null, decodeOk: false };

      const mjpeg = `${outPath}.mjpeg`;
      fs.writeFileSync(mjpeg, Buffer.concat(sampledFrames));
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
          mjpeg,
          "-c:v",
          "libvpx-vp9",
          "-crf",
          "31",
          "-b:v",
          "0",
          outPath,
        ],
        { stdio: "ignore" },
      );
      fs.rmSync(mjpeg, { force: true });
      if (ff.status !== 0 || !fs.existsSync(outPath)) {
        return { frames: sampledFrames.length, webmPath: outPath, decodeOk: false };
      }
      const verified = inspectAndVerifyWebm(outPath);
      return {
        frames: sampledFrames.length,
        webmPath: outPath,
        ...verified,
      };
    },
  };
}

async function smoothScrollToProgress(client, targetProgress, steps = 10, stepMs = 110) {
  const startY = await evaluate(client, `Math.round(window.scrollY)`);
  const targetY = await evaluate(
    client,
    `(() => {
      const runway = document.querySelector('[data-cxp02-runway]');
      if (!runway) return 0;
      const scrollable = Math.max(1, runway.offsetHeight - window.innerHeight);
      return Math.round(scrollable * ${targetProgress});
    })()`,
  );
  for (let i = 1; i <= steps; i++) {
    const y = Math.round(startY + ((targetY - startY) * i) / steps);
    await evaluate(client, `window.scrollTo({ top: ${y}, behavior: 'instant' })`);
    await sleep(stepMs);
  }
  await sleep(220);
}

async function run() {
  const gitSha = gitHeadSha();
  const manifest = [];
  const captureEvidence = async (client, filename, meta) => {
    const { data } = await client.send("Page.captureScreenshot", { format: "png" });
    const outPath = path.join(REPORT_ASSETS_DIR, filename);
    const buf = Buffer.from(data, "base64");
    fs.writeFileSync(outPath, buf);
    manifest.push({
      filename,
      sha256: sha256File(outPath),
      bytes: buf.length,
      capturedAt: new Date().toISOString(),
      gitSha,
      mode: MODE,
      ...meta,
    });
    return outPath;
  };

  const userDataDesktop = fs.mkdtempSync(path.join(os.tmpdir(), "adora-cxp04d-desk-"));
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

  const report = {
    mode: MODE,
    baseUrl: BASE_URL,
    gitSha,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    movements: {},
    historyStress: {},
    draftLifecycle: {},
    dayTabsA11y: {},
    keyboardFocusPolish: {},
    mobileKeyboardSim: {},
    aiPlanner: {},
    overflowChecks: {},
    reducedMotionComparison: {},
    noJsHomepage: null,
    recordings: {},
    manifestCount: 0,
  };

  try {
    await waitForCdp(CDP_PORT_DESKTOP);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT_DESKTOP}/json`)).json();
    const client = createCdp(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");

    let ignoreNetworkForNoJsTest = false;
    client.on("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error") {
        report.consoleErrors.push(p.args.map((a) => a.value ?? a.description).join(" "));
      }
    });
    client.on("Runtime.exceptionThrown", (p) => {
      report.pageErrors.push(p.exceptionDetails.text);
    });
    client.on("Network.loadingFailed", (p) => {
      if (!p.canceled && !ignoreNetworkForNoJsTest) {
        report.failedRequests.push(`${p.type}: ${p.errorText}`);
      }
    });

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    if (MODE === "off") {
      await client.send("Page.navigate", { url: `${BASE_URL}/ai-planner` });
      await sleep(700);
      report.aiPlanner.modeOff = await evaluate(
        client,
        `({
          title: document.title,
          hasPlannerPrompt: Boolean(document.querySelector('#planner-prompt')),
          hasAtelierRoot: Boolean(document.querySelector('[data-cxp04-phase]')),
        })`,
      );
      await captureEvidence(client, "13_ai_planner_mode_off.png", {
        route: "/ai-planner",
        viewport: "1440x900",
        dpr: 1,
        scenario: "ai_planner_mode_off",
      });
      client.close();
      fs.writeFileSync(
        path.join(SCRATCH_DIR, "verify_cxp04d_off.json"),
        JSON.stringify(report, null, 2),
      );
      console.log(JSON.stringify(report, null, 2));
      if (
        report.consoleErrors.length > 0 ||
        report.pageErrors.length > 0 ||
        !report.aiPlanner.modeOff?.hasPlannerPrompt ||
        report.aiPlanner.modeOff?.hasAtelierRoot
      ) {
        process.exitCode = 1;
      }
      return;
    }

    // =========================================================================
    // MODE ON: RECORDED DESKTOP INTEGRATION WALKTHROUGH (~18-24s real timing)
    // =========================================================================
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(900);
    await captureEvidence(client, "01_home_before_open.png", {
      route: "/",
      viewport: "1440x900",
      dpr: 1,
      scenario: "home_m01_before_open",
    });

    const desktopRecorder = await startRealtimeRecorder(client, {
      width: 1280,
      height: 800,
      fps: 10,
    });

    await sleep(900);
    // Smooth scroll through Movements 01 -> 04
    await smoothScrollToProgress(client, 0.65, 16, 110);
    await sleep(1100);
    const m04BeforeY = await evaluate(client, `Math.round(window.scrollY)`);

    // Open Floating Concierge from Movement 04
    await evaluate(client, `document.querySelector('a.concierge-floating')?.click()`);
    await sleep(1500);
    await captureEvidence(client, "02_integrated_desktop_invitation.png", {
      route: "/ (overlay)",
      viewport: "1440x900",
      dpr: 1,
      scenario: "desktop_overlay_invitation",
    });

    // Romantic preset -> adaptive branching directly to destination
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-preset-chip')).find(b => b.textContent.includes('Lãng mạn'))?.click()`,
    );
    await sleep(1600);

    // Go to Interpretation -> edit companions -> 4 guests
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    );
    await sleep(1400);
    await captureEvidence(client, "03_integrated_interpretation.png", {
      route: "/ (overlay)",
      viewport: "1440x900",
      dpr: 1,
      scenario: "desktop_overlay_interpretation",
    });

    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-inline-btn')).find(b => b.textContent.includes('Người đồng hành'))?.click()`,
    );
    await sleep(900);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-choice-btn')).find(b => b.textContent.includes('Nhóm bạn nhỏ'))?.click()`,
    );
    await sleep(700);
    await evaluate(client, `document.querySelector('[data-cxp04-next-btn]')?.click()`);
    await sleep(1100);

    // Reveal Journey
    await evaluate(client, `document.querySelector('[data-cxp04-reveal-btn]')?.click()`);
    await sleep(1700);
    await captureEvidence(client, "04_integrated_journey_reveal.png", {
      route: "/ (overlay)",
      viewport: "1440x900",
      dpr: 1,
      scenario: "desktop_overlay_journey_reveal",
    });

    // Test Day Tabs keyboard roving tabindex & ArrowRight/Home/End!
    report.dayTabsA11y = await evaluate(
      client,
      `(() => {
        const tab1 = document.getElementById('cxp04-day-tab-1');
        if (!tab1) return { ok: false };
        tab1.focus();
        tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        return new Promise((resolve) => setTimeout(() => {
          const tab2 = document.getElementById('cxp04-day-tab-2');
          const focused2 = document.activeElement === tab2;
          const selected2 = tab2?.getAttribute('aria-selected') === 'true';
          const tab1IndexAfter = tab1.getAttribute('tabindex');
          const tab2IndexAfter = tab2?.getAttribute('tabindex');
          tab2?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
          setTimeout(() => {
            resolve({
              ok: focused2 && selected2 && tab1IndexAfter === '-1' && tab2IndexAfter === '0' && document.activeElement === tab1,
              focused2,
              selected2,
              tab1IndexAfter,
              tab2IndexAfter,
            });
          }, 120);
        }, 120));
      })()`,
    );

    // Budget refinement
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-refine-chip')).find(b => b.textContent.includes('Giảm ngân sách'))?.click()`,
    );
    await sleep(1700);
    await captureEvidence(client, "05_integrated_refinement_cost.png", {
      route: "/ (overlay)",
      viewport: "1440x900",
      dpr: 1,
      scenario: "desktop_overlay_refinement_cost",
    });

    // Close Atelier -> return to same Movement 04 context
    await evaluate(client, `document.querySelector('[data-cxp04-close-btn]')?.click()`);
    await sleep(1400);
    const m04AfterY = await evaluate(client, `Math.round(window.scrollY)`);
    await captureEvidence(client, "06_home_after_close.png", {
      route: "/",
      viewport: "1440x900",
      dpr: 1,
      scenario: "home_m04_after_close",
    });

    report.recordings.desktop = await desktopRecorder.stopAndEncode(
      path.join(SCRATCH_DIR, "cxp04d_desktop_integration.webm"),
    );

    // =========================================================================
    // P0 HISTORY HARDENING STRESS MATRIX (Scenarios A - F)
    // =========================================================================
    // Scenario A: 10 repeated Open -> Close cycles
    const lenBefore = await evaluate(client, `window.history.length`);
    let maxDialogs = 0;
    let residualLockFound = false;
    for (let i = 0; i < 10; i++) {
      await evaluate(client, `document.querySelector('a.concierge-floating')?.click()`);
      await sleep(120);
      const count = await evaluate(client, `document.querySelectorAll('dialog[open]').length`);
      if (count > maxDialogs) maxDialogs = count;
      await evaluate(client, `document.querySelector('[data-cxp04-close-btn]')?.click()`);
      await sleep(120);
      const overflowVal = await evaluate(client, `document.documentElement.style.overflow`);
      if (overflowVal === "hidden") residualLockFound = true;
    }
    const lenAfter = await evaluate(client, `window.history.length`);
    const yAfter10Cycles = await evaluate(client, `Math.round(window.scrollY)`);
    report.historyStress.scenarioA_10Cycles = {
      historyLenDelta: Math.abs(lenAfter - lenBefore),
      maxDialogs,
      residualLockFound,
      scrollDeltaPx: Math.abs(yAfter10Cycles - m04AfterY),
    };

    // Scenario B: Open -> Back -> Forward
    await evaluate(client, `document.querySelector('a.concierge-floating')?.click()`);
    await sleep(250);
    await evaluate(client, `window.history.back()`);
    await sleep(300);
    const sBack = await evaluate(
      client,
      `({ path: window.location.pathname, openDialogs: document.querySelectorAll('dialog[open]').length })`,
    );
    await evaluate(client, `window.history.forward()`);
    await sleep(300);
    const sFwd = await evaluate(
      client,
      `({ path: window.location.pathname, openDialogs: document.querySelectorAll('dialog[open]').length })`,
    );
    await pressKey(client, "Escape", "Escape", 27);
    await sleep(250);
    report.historyStress.scenarioB_backForward = { sBack, sFwd };

    // Scenario C: Overlay -> Mở trang riêng (/ai-planner) -> shared draft -> Back -> homepage CLOSED!
    await evaluate(client, `document.querySelector('a.concierge-floating')?.click()`);
    await sleep(300);
    await evaluate(client, `document.querySelector('a[href="/ai-planner"].cxp04-top-link')?.click()`);
    await sleep(750);
    const plannerShared = await evaluate(
      client,
      `({
        path: window.location.pathname,
        variant: document.querySelector('[data-cxp04-variant]')?.getAttribute('data-cxp04-variant'),
        phase: document.querySelector('[data-cxp04-phase]')?.getAttribute('data-cxp04-phase'),
        openDialogs: document.querySelectorAll('dialog[open]').length,
      })`,
    );
    await captureEvidence(client, "12_ai_planner_mode_on.png", {
      route: "/ai-planner",
      viewport: "1440x900",
      dpr: 1,
      scenario: "ai_planner_mode_on",
    });
    await evaluate(client, `window.history.back()`);
    await sleep(600);
    const backFromPlanner = await evaluate(
      client,
      `({ path: window.location.pathname, openDialogs: document.querySelectorAll('dialog[open]').length })`,
    );
    report.historyStress.scenarioC_overlayToPlannerBack = { plannerShared, backFromPlanner };

    // Scenario D: Navigation from overlay to catalog route (/trips/da-lat-3-ngay) releases inertness/overflow
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(350);
    await evaluate(client, `document.querySelector('a[href^="/trips/"]')?.click()`);
    await sleep(750);
    const onTripRoute = await evaluate(
      client,
      `({
        path: window.location.pathname,
        openDialogs: document.querySelectorAll('dialog[open]').length,
        overflow: document.documentElement.style.overflow,
      })`,
    );
    report.historyStress.scenarioD_overlayToTripRoute = onTripRoute;

    // Scenario E: Reload while overlay was open strips stale flag -> opens & closes cleanly staying on '/'
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(700);
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(350);
    await client.send("Page.reload");
    await sleep(700);
    const afterReload = await evaluate(
      client,
      `({
        openDialogs: document.querySelectorAll('dialog[open]').length,
        hasStaleMarker: Boolean(window.history.state?.adoraConciergeOverlay),
        path: window.location.pathname,
      })`,
    );
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(300);
    await pressKey(client, "Escape", "Escape", 27);
    await sleep(300);
    const afterPostReloadClose = await evaluate(
      client,
      `({ path: window.location.pathname, openDialogs: document.querySelectorAll('dialog[open]').length })`,
    );
    report.historyStress.scenarioE_reload = { afterReload, afterPostReloadClose };

    // Scenario F: Rapid double-click + Restart reset verification
    await evaluate(
      client,
      `(() => {
        const t = document.querySelector('header a[data-concierge-trigger]');
        t?.click();
        t?.click();
      })()`,
    );
    await sleep(350);
    const afterDoubleClickDialogs = await evaluate(client, `document.querySelectorAll('dialog[open]').length`);
    await captureEvidence(client, "10_keyboard_focus_state.png", {
      route: "/ (overlay)",
      viewport: "1440x900",
      dpr: 1,
      scenario: "keyboard_focus_and_overlay",
    });

    // Keyboard Tab reverse/forward containment test inside dialog
    await pressKey(client, "Tab", "Tab", 9);
    await sleep(100);
    const tabStaysInsideDialog = await evaluate(
      client,
      `Boolean(document.activeElement?.closest('dialog.cxp04-dialog-host[open]'))`,
    );
    report.keyboardFocusPolish = { afterDoubleClickDialogs, tabStaysInsideDialog };

    // Restart check
    await evaluate(client, `document.querySelector('[data-cxp04-start-btn]')?.click()`);
    await sleep(250);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Bắt đầu lại')?.click()`,
    );
    await sleep(250);
    report.draftLifecycle.resetRestoredInvitation = await evaluate(
      client,
      `document.querySelector('[data-cxp04-variant="overlay"]')?.getAttribute('data-cxp04-phase') === 'invitation'`,
    );
    await pressKey(client, "Escape", "Escape", 27);
    await sleep(250);

    // Full Movements 01 - 06 scroll drift check
    for (const [label, prog] of [
      ["m01_header", 0],
      ["m02_float", 0.34],
      ["m03_float", 0.48],
      ["m04_float", 0.65],
      ["m05_float", 0.80],
      ["m06_finale", 0.96],
    ]) {
      await smoothScrollToProgress(client, prog, 4, 40);
      const yBefore = await evaluate(client, `Math.round(window.scrollY)`);
      const sel =
        label === "m01_header"
          ? "header a[data-concierge-trigger]"
          : label === "m06_finale"
            ? ".cxp02-concierge-overlay a[data-concierge-trigger]"
            : "a.concierge-floating";
      await evaluate(client, `document.querySelector('${sel}')?.click()`);
      await sleep(250);
      const yWhileOpen = await evaluate(client, `Math.round(window.scrollY)`);
      await pressKey(client, "Escape", "Escape", 27);
      await sleep(250);
      const yAfter = await evaluate(client, `Math.round(window.scrollY)`);
      report.movements[label] = {
        yBefore,
        yWhileOpen,
        yAfter,
        scrollDeltaPx: Math.abs(yAfter - yBefore),
      };
    }

    // 8-Viewport Overflow Checks while overlay open
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(300);
    for (const vp of [
      { name: "360x640", w: 360, h: 640, mobile: true },
      { name: "360x800", w: 360, h: 800, mobile: true },
      { name: "390x844", w: 390, h: 844, mobile: true },
      { name: "430x932", w: 430, h: 932, mobile: true },
      { name: "768x1024", w: 768, h: 1024, mobile: false },
      { name: "1024x768", w: 1024, h: 768, mobile: false },
      { name: "1440x900", w: 1440, h: 900, mobile: false },
      { name: "1920x1080", w: 1920, h: 1080, mobile: false },
    ]) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: vp.mobile ? 2 : 1,
        mobile: vp.mobile,
      });
      await sleep(180);
      const ov = await evaluate(
        client,
        `(() => {
          const btn = document.querySelector('[data-cxp04-start-btn]');
          const r = btn ? btn.getBoundingClientRect() : null;
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            ctaVisible: Boolean(r && r.top >= 0 && r.bottom <= window.innerHeight),
          };
        })()`,
      );
      report.overflowChecks[vp.name] = { ...ov, ok: ov.scrollWidth <= ov.innerWidth };
      if (vp.name === "360x640") {
        await captureEvidence(client, "07_mobile_invitation_360x640.png", {
          route: "/ (overlay)",
          viewport: "360x640",
          dpr: 2,
          scenario: "mobile_invitation_360x640",
        });
      }
    }

    // No-JS Homepage Screenshot
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    ignoreNetworkForNoJsTest = true;
    await client.send("Emulation.setScriptExecutionDisabled", { value: true });
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(700);
    const noJsHtml = await (await fetch(`${BASE_URL}/`)).text();
    report.noJsHomepage = {
      hasH1: noJsHtml.includes("<h1") && noJsHtml.includes("Đi xa hơn"),
      hasFooter: noJsHtml.includes("<footer"),
      hasAiPlannerFallbackHref: noJsHtml.includes('href="/ai-planner"'),
    };
    await captureEvidence(client, "14_no_js_homepage.png", {
      route: "/",
      viewport: "1440x900",
      dpr: 1,
      scenario: "no_js_homepage",
    });
    await client.send("Emulation.setScriptExecutionDisabled", { value: false });
    ignoreNetworkForNoJsTest = false;
    client.close();
  } finally {
    chromeDesktop.kill();
    await sleep(300);
    fs.rmSync(userDataDesktop, { recursive: true, force: true });
  }

  // ===========================================================================
  // DEDICATED PORTRAIT MOBILE CHROME INSTANCE (EXACT 390x844 — NO STRETCHING!)
  // ===========================================================================
  const userDataMobile = fs.mkdtempSync(path.join(os.tmpdir(), "adora-cxp04d-mob-"));
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
    const targetsMob = await (await fetch(`http://127.0.0.1:${CDP_PORT_MOBILE}/json`)).json();
    const mobClient = createCdp(targetsMob.find((t) => t.type === "page").webSocketDebuggerUrl);
    await mobClient.ready;
    await mobClient.send("Page.enable");
    await mobClient.send("Runtime.enable");
    await mobClient.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    await mobClient.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(900);

    const mobileRecorder = await startRealtimeRecorder(mobClient, {
      width: 390,
      height: 844,
      fps: 10,
    });

    await sleep(900);
    await mobClient.send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-controls="mobile-navigation"]')?.click()`,
    });
    await sleep(900);
    await mobClient.send("Runtime.evaluate", {
      expression: `document.querySelector('#mobile-navigation a[data-concierge-trigger]')?.click()`,
    });
    await sleep(1500);
    await mobClient.send("Runtime.evaluate", {
      expression: `document.querySelector('[data-cxp04-start-btn]')?.click()`,
    });
    await sleep(1400);
    await captureEvidence(mobClient, "08_mobile_conversation_390x844.png", {
      route: "/ (overlay)",
      viewport: "390x844",
      dpr: 1,
      scenario: "mobile_conversation",
    });

    await mobClient.send("Runtime.evaluate", {
      expression: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    });
    await sleep(1100);
    await mobClient.send("Runtime.evaluate", {
      expression: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mở bản phác thảo'))?.click()`,
    });
    await sleep(1600);
    await captureEvidence(mobClient, "09_mobile_journey_canvas.png", {
      route: "/ (overlay)",
      viewport: "390x844",
      dpr: 1,
      scenario: "mobile_journey_canvas",
    });

    // Switch back to Conversation and type Vietnamese text into composer
    await mobClient.send("Runtime.evaluate", {
      expression: `Array.from(document.querySelectorAll('[role="tab"]')).find(b => b.textContent.includes('Trò chuyện'))?.click()`,
    });
    await sleep(900);
    await evaluate(
      mobClient,
      `(() => {
        const ta = document.querySelector('#cxp04-composer-input');
        ta?.focus();
        document.execCommand('insertText', false, 'Đặt vé máy bay đi Kyoto');
        document.querySelector('.cxp04-composer button[type="submit"]')?.click();
      })()`,
    );
    await sleep(1400);

    // Emulated short-height virtual keyboard check (390x460 while composer focused)
    await mobClient.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 460,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await sleep(300);
    report.mobileKeyboardSim = await evaluate(
      mobClient,
      `(() => {
        const ta = document.querySelector('#cxp04-composer-input');
        ta?.focus();
        const r = ta?.getBoundingClientRect();
        const btn = document.querySelector('.cxp04-composer button[type="submit"]')?.getBoundingClientRect();
        return {
          textareaVisibleInShortViewport: Boolean(r && r.top >= 0 && r.bottom <= window.innerHeight),
          submitVisibleInShortViewport: Boolean(btn && btn.top >= 0 && btn.bottom <= window.innerHeight),
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      })()`,
    );
    await mobClient.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await sleep(400);

    // Close and return to homepage
    await evaluate(mobClient, `document.querySelector('[data-cxp04-close-btn]')?.click()`);
    await sleep(1400);

    report.recordings.mobile = await mobileRecorder.stopAndEncode(
      path.join(SCRATCH_DIR, "cxp04d_mobile_integration.webm"),
    );

    // =========================================================================
    // REDUCED-MOTION MACHINE-READABLE PROOF (Two Distinct Media Conditions)
    // =========================================================================
    await mobClient.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await mobClient.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(600);
    await evaluate(mobClient, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(400);
    const noPref = await evaluate(
      mobClient,
      `(() => {
        const btn = document.querySelector('.cxp04-primary-btn');
        return {
          matchesReduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          btnTransitionDuration: btn ? getComputedStyle(btn).transitionDuration : '',
        };
      })()`,
    );

    await mobClient.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await sleep(300);
    const reduced = await evaluate(
      mobClient,
      `(() => {
        const btn = document.querySelector('.cxp04-primary-btn');
        return {
          matchesReduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          btnTransitionDuration: btn ? getComputedStyle(btn).transitionDuration : '',
          hasOverlay: Boolean(document.querySelector('dialog.cxp04-dialog-host[open]')),
        };
      })()`,
    );
    await captureEvidence(mobClient, "11_reduced_motion_workspace.png", {
      route: "/ (overlay)",
      viewport: "1440x900",
      dpr: 1,
      media: "prefers-reduced-motion: reduce",
      scenario: "reduced_motion_workspace",
    });
    await mobClient.send("Emulation.setEmulatedMedia", { features: [] });
    report.reducedMotionComparison = { noPreference: noPref, reduce: reduced };

    mobClient.close();
  } finally {
    chromeMobile.kill();
    await sleep(300);
    fs.rmSync(userDataMobile, { recursive: true, force: true });
  }

  report.manifestCount = manifest.length;
  const manifestPath = path.join(SCRATCH_DIR, "cxp04d_evidence_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ manifest, reportSummary: report }, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed =
    report.consoleErrors.length > 0 ||
    report.pageErrors.length > 0 ||
    report.failedRequests.length > 0 ||
    report.historyStress.scenarioA_10Cycles?.historyLenDelta !== 0 ||
    report.historyStress.scenarioA_10Cycles?.maxDialogs !== 1 ||
    report.historyStress.scenarioA_10Cycles?.residualLockFound ||
    report.historyStress.scenarioB_backForward?.sBack?.openDialogs !== 0 ||
    report.historyStress.scenarioB_backForward?.sFwd?.openDialogs !== 1 ||
    report.historyStress.scenarioC_overlayToPlannerBack?.backFromPlanner?.openDialogs !== 0 ||
    report.historyStress.scenarioD_overlayToTripRoute?.openDialogs !== 0 ||
    report.historyStress.scenarioE_reload?.afterReload?.hasStaleMarker ||
    report.historyStress.scenarioE_reload?.afterPostReloadClose?.path !== "/" ||
    !report.dayTabsA11y?.ok ||
    !report.keyboardFocusPolish?.tabStaysInsideDialog ||
    report.keyboardFocusPolish?.afterDoubleClickDialogs !== 1 ||
    !report.draftLifecycle?.resetRestoredInvitation ||
    Object.values(report.movements).some((m) => m.scrollDeltaPx > 8) ||
    Object.values(report.overflowChecks).some((o) => !o.ok) ||
    !report.mobileKeyboardSim?.textareaVisibleInShortViewport ||
    !report.reducedMotionComparison?.reduce?.matchesReduce ||
    report.reducedMotionComparison?.reduce?.btnTransitionDuration !== "0s" ||
    !report.recordings.mobile?.decodeOk ||
    report.recordings.mobile?.width !== 390 ||
    report.recordings.mobile?.height !== 844 ||
    !report.recordings.desktop?.decodeOk;

  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

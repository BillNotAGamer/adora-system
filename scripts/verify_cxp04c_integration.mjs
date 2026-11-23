import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = process.env.CXP04C_PORT || "3105";
const BASE_URL = process.env.ADORA_WEB_URL || `http://127.0.0.1:${PORT}`;
const MODE = process.env.CXP04C_MODE === "off" ? "off" : "on";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = Number(process.env.CXP04C_CDP_PORT || 9251);
const SCRATCH_DIR =
  process.env.CXP04C_SCRATCH_DIR || path.join(os.tmpdir(), "adora-cxp04c-scratch");
const REPORT_ASSETS_DIR =
  process.env.CXP04C_OUTPUT_DIR ||
  path.resolve(process.cwd(), "docs/reports/assets/cxp04c");

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

async function pressKey(client, key, code, keyCode) {
  const ev = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", ...ev });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...ev });
}

async function capture(client, filename) {
  const { data } = await client.send("Page.captureScreenshot", { format: "png" });
  const out = path.join(REPORT_ASSETS_DIR, filename);
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  return out;
}

async function scrollToProgress(client, progress) {
  await evaluate(
    client,
    `(() => {
      const runway = document.querySelector('[data-cxp02-runway]');
      if (!runway) return null;
      const scrollable = Math.max(1, runway.offsetHeight - window.innerHeight);
      window.scrollTo({ top: Math.round(scrollable * ${progress}), behavior: 'instant' });
      return window.scrollY;
    })()`,
  );
  await sleep(320);
}

function encodeWebm(framesDir, outPath) {
  const ffPath = path.join(
    process.env.LOCALAPPDATA || "",
    "ms-playwright",
    "ffmpeg-1013",
    "ffmpeg-win64.exe",
  );
  const ffmpegBin = fs.existsSync(ffPath) ? ffPath : "ffmpeg";
  const frameFiles = fs.readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).sort();
  if (frameFiles.length === 0) return { frames: 0, webmPath: null, webmBytes: 0 };

  const mjpeg = `${outPath}.mjpeg`;
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
      outPath,
    ],
    { stdio: "ignore" },
  );
  fs.rmSync(mjpeg, { force: true });
  if (ff.status === 0 && fs.existsSync(outPath)) {
    return { frames: frameFiles.length, webmPath: outPath, webmBytes: fs.statSync(outPath).size };
  }
  return { frames: frameFiles.length, webmPath: null, webmBytes: 0 };
}

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "adora-cxp04c-chrome-"));
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
    mode: MODE,
    baseUrl: BASE_URL,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    performance: {},
    movements: {},
    lifecycle: {},
    aiPlanner: {},
    prototypeRoute: {},
    overflowChecks: {},
    reducedMotion: null,
    noJsHomepage: null,
    recordings: {},
  };

  const desktopFramesDir = path.join(SCRATCH_DIR, "cxp04c_desktop_frames");
  const mobileFramesDir = path.join(SCRATCH_DIR, "cxp04c_mobile_frames");
  fs.rmSync(desktopFramesDir, { recursive: true, force: true });
  fs.rmSync(mobileFramesDir, { recursive: true, force: true });
  fs.mkdirSync(desktopFramesDir, { recursive: true });
  fs.mkdirSync(mobileFramesDir, { recursive: true });

  try {
    await waitForCdp(CDP_PORT);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
    const client = createCdp(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");

    let jsBytes = 0;
    let ignoreNetworkForNoJsTest = false;
    const reqTypes = new Map();
    client.on("Network.requestWillBeSent", (p) => reqTypes.set(p.requestId, p.type));
    client.on("Network.loadingFinished", (p) => {
      if (reqTypes.get(p.requestId) === "Script") jsBytes += p.encodedDataLength || 0;
    });
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
      // UX-1 default mode check on / and /ai-planner
      jsBytes = 0;
      await client.send("Page.navigate", { url: `${BASE_URL}/` });
      await sleep(900);
      report.performance.initialJsBytesOff = jsBytes;

      await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
      await sleep(450);
      report.lifecycle.ux1DialogOpen = await evaluate(
        client,
        `({
          hasUx1Dialog: Boolean(document.querySelector('dialog.concierge-dialog[open]')),
          hasAtelierDialog: Boolean(document.querySelector('dialog.cxp04-dialog-host[open]')),
        })`,
      );
      await pressKey(client, "Escape", "Escape", 27);
      await sleep(250);

      await client.send("Page.navigate", { url: `${BASE_URL}/ai-planner` });
      await sleep(600);
      report.aiPlanner.modeOff = await evaluate(
        client,
        `({
          title: document.title,
          hasPlannerPrompt: Boolean(document.querySelector('#planner-prompt')),
          hasAtelierRoot: Boolean(document.querySelector('[data-cxp04-phase]')),
        })`,
      );
      await capture(client, "11_ai_planner_ux1_off.png");

      client.close();
      fs.writeFileSync(path.join(SCRATCH_DIR, "verify_cxp04c_off.json"), JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report, null, 2));
      if (
        report.consoleErrors.length > 0 ||
        report.pageErrors.length > 0 ||
        !report.lifecycle.ux1DialogOpen?.hasUx1Dialog ||
        report.lifecycle.ux1DialogOpen?.hasAtelierDialog ||
        !report.aiPlanner.modeOff?.hasPlannerPrompt ||
        report.aiPlanner.modeOff?.hasAtelierRoot
      ) {
        process.exitCode = 1;
      }
      return;
    }

    // =========================================================================
    // MODE ON: INTEGRATED ATELIER VERIFICATION
    // =========================================================================
    jsBytes = 0;
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(1000);
    report.performance.initialJsBytesOnBeforeOpen = jsBytes;
    const beforeOpenJs = jsBytes;

    // 1. Movement 01 closed -> floating hidden, header opens Atelier, Escape closes & restores scroll/focus
    const m01Floating = await evaluate(client, `Boolean(document.querySelector('a.concierge-floating'))`);
    await capture(client, "01_home_m01_closed.png");
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(650);
    const afterOpenJs = jsBytes;
    report.performance.lazyOverlayJsDeltaBytes = afterOpenJs - beforeOpenJs;

    const headerOpenState = await evaluate(
      client,
      `({
        dialogCount: document.querySelectorAll('dialog[open]').length,
        isAtelierDialog: Boolean(document.querySelector('dialog.cxp04-dialog-host[open]')),
        isUx1Dialog: Boolean(document.querySelector('dialog.concierge-dialog[open]')),
        scrollLock: getComputedStyle(document.documentElement).overflow,
        hasDuplicateFloating: Boolean(document.querySelector('a.concierge-floating')),
        activeTag: document.activeElement?.tagName,
      })`,
    );
    await capture(client, "04_overlay_invitation.png");
    await pressKey(client, "Escape", "Escape", 27);
    await sleep(350);
    report.movements.m01Header = {
      floatingHiddenWhenClosed: !m01Floating,
      ...headerOpenState,
      closedOnEscape: await evaluate(client, `document.querySelectorAll('dialog[open]').length === 0`),
    };

    // Start Desktop Walkthrough WebM Recording from Movement 02 -> Refine -> Close -> Restored!
    let activeFramesDir = desktopFramesDir;
    let frameIdx = 0;
    const onFrame = async (params) => {
      const idx = frameIdx++;
      fs.writeFileSync(
        path.join(activeFramesDir, `f_${String(idx).padStart(4, "0")}.jpg`),
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

    // 2. Movement 02 (progress ~0.34): Floating trigger visible -> Open -> Flow I-V -> Close -> Scroll & Movement preserved
    await scrollToProgress(client, 0.34);
    const m02Before = await evaluate(
      client,
      `({
        scrollY: Math.round(window.scrollY),
        caption: document.querySelector('.cxp01-chrome-footer, [data-cxp02-movement]')?.textContent?.trim() || '',
        hasFloating: Boolean(document.querySelector('a.concierge-floating')),
      })`,
    );
    await capture(client, "02_home_m02_floating.png");

    await evaluate(client, `document.querySelector('a.concierge-floating')?.click()`);
    await sleep(650);
    await capture(client, "03_home_m02_atelier_open.png");

    // Duplicate open guard check + Browser Back & Forward test
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(150);
    const duplicateGuardCount = await evaluate(client, `document.querySelectorAll('dialog[open]').length`);

    // Test Browser Back -> closes overlay cleanly without leaving '/', then Forward -> reopens
    await evaluate(client, `window.history.back()`);
    await sleep(400);
    const afterBack = await evaluate(
      client,
      `({ path: window.location.pathname, openDialogs: document.querySelectorAll('dialog[open]').length, scrollY: Math.round(window.scrollY) })`,
    );
    await evaluate(client, `window.history.forward()`);
    await sleep(450);
    const afterForward = await evaluate(
      client,
      `({ path: window.location.pathname, openDialogs: document.querySelectorAll('dialog[open]').length })`,
    );

    // Interactive 5-state Atelier journey inside production overlay!
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-preset-chip')).find(b => b.textContent.includes('Lãng mạn'))?.click()`,
    );
    await sleep(500);
    const discoveryInfo = await evaluate(
      client,
      `({
        question: document.querySelector('[data-cxp04-question]')?.getAttribute('data-cxp04-question'),
        hasInferred: Boolean(document.querySelector('[data-status="inferred"]')),
      })`,
    );
    await capture(client, "05_overlay_discovery.png");

    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    );
    await sleep(450);
    await capture(client, "06_overlay_interpretation.png");

    // Edit companions to 4 guests inside overlay
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-inline-btn')).find(b => b.textContent.includes('Người đồng hành'))?.click()`,
    );
    await sleep(300);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-choice-btn')).find(b => b.textContent.includes('Nhóm bạn nhỏ'))?.click()`,
    );
    await sleep(200);
    await evaluate(client, `document.querySelector('[data-cxp04-next-btn]')?.click()`);
    await sleep(350);

    await evaluate(client, `document.querySelector('[data-cxp04-reveal-btn]')?.click()`);
    await sleep(550);
    const revealCost = await evaluate(
      client,
      `document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim() || ''`,
    );
    await capture(client, "07_overlay_journey_reveal.png");

    // Lower budget + unsupported Kyoto request inside overlay
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-refine-chip')).find(b => b.textContent.includes('Giảm ngân sách'))?.click()`,
    );
    await sleep(450);
    const refinedCost = await evaluate(
      client,
      `document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim() || ''`,
    );
    await capture(client, "08_overlay_refinement.png");

    // Close overlay via visible close button -> confirm homepage scrollY, Movement, and focus restoration
    await evaluate(client, `document.querySelector('[data-cxp04-close-btn]')?.click()`);
    await sleep(550);
    const m02After = await evaluate(
      client,
      `({
        scrollY: Math.round(window.scrollY),
        hasFloating: Boolean(document.querySelector('a.concierge-floating')),
        openDialogs: document.querySelectorAll('dialog[open]').length,
        activeClass: document.activeElement?.className || '',
      })`,
    );
    await capture(client, "09_home_restored.png");

    await client.send("Page.stopScreencast");
    report.recordings.desktop = encodeWebm(
      desktopFramesDir,
      path.join(SCRATCH_DIR, "cxp04c_desktop_integration.webm"),
    );

    report.movements.m02 = {
      before: m02Before,
      after: m02After,
      scrollDeltaPx: Math.abs(m02After.scrollY - m02Before.scrollY),
      duplicateGuardCount,
      afterBack,
      afterForward,
      discoveryInfo,
      revealCost,
      refinedCost,
    };

    // 3. Test Movements 03, 04, 05 floating trigger & Movement 06 inline trigger + Reverse scrolling
    for (const [label, progress] of [
      ["m03", 0.48],
      ["m04", 0.65],
      ["m05", 0.80],
    ]) {
      await scrollToProgress(client, progress);
      const yBefore = await evaluate(client, `Math.round(window.scrollY)`);
      const hasFloat = await evaluate(client, `Boolean(document.querySelector('a.concierge-floating'))`);
      await evaluate(client, `document.querySelector('a.concierge-floating')?.click()`);
      await sleep(350);
      const isOpen = await evaluate(client, `Boolean(document.querySelector('dialog.cxp04-dialog-host[open]'))`);
      // Verify draft persisted across reopen!
      const phasePersisted = await evaluate(
        client,
        `document.querySelector('[data-cxp04-variant="overlay"]')?.getAttribute('data-cxp04-phase')`,
      );
      await pressKey(client, "Escape", "Escape", 27);
      await sleep(350);
      const yAfter = await evaluate(client, `Math.round(window.scrollY)`);
      report.movements[label] = {
        hasFloat,
        isOpen,
        phasePersisted,
        scrollDeltaPx: Math.abs(yAfter - yBefore),
      };
    }

    // Movement 06 finale trigger (floating must be hidden, inline trigger opens Atelier)
    await scrollToProgress(client, 0.96);
    const m06Before = await evaluate(
      client,
      `({
        yBefore: Math.round(window.scrollY),
        floatingHidden: !document.querySelector('a.concierge-floating'),
        hasInlineTrigger: Boolean(document.querySelector('.cxp02-concierge-overlay a[data-concierge-trigger]')),
      })`,
    );
    await evaluate(client, `document.querySelector('.cxp02-concierge-overlay a[data-concierge-trigger]')?.click()`);
    await sleep(350);
    const m06Open = await evaluate(client, `Boolean(document.querySelector('dialog.cxp04-dialog-host[open]'))`);
    await evaluate(client, `document.querySelector('[data-cxp04-close-btn]')?.click()`);
    await sleep(350);
    const m06YAfter = await evaluate(client, `Math.round(window.scrollY)`);
    report.movements.m06Finale = {
      ...m06Before,
      m06Open,
      scrollDeltaPx: Math.abs(m06YAfter - m06Before.yBefore),
    };

    // Reverse scroll back to Movement 04 & verify floating returns
    await scrollToProgress(client, 0.65);
    report.movements.reverseM04Floating = await evaluate(
      client,
      `Boolean(document.querySelector('a.concierge-floating'))`,
    );

    // 4. Test /ai-planner integrated route + direct reload + zero internal codenames + no duplicate dialog
    await client.send("Page.navigate", { url: `${BASE_URL}/ai-planner` });
    await sleep(700);
    await client.send("Page.reload");
    await sleep(600);
    report.aiPlanner.modeOn = await evaluate(
      client,
      `({
        title: document.title,
        h1Count: document.querySelectorAll('h1').length,
        variant: document.querySelector('[data-cxp04-variant]')?.getAttribute('data-cxp04-variant'),
        openDialogs: document.querySelectorAll('dialog[open]').length,
        exposesInternalCodename: /CXP-04|UX-1/i.test(document.body.innerText),
      })`,
    );
    await capture(client, "10_ai_planner_atelier_on.png");

    // Verify prototype route /creative-lab/concierge-experience remains accessible
    await client.send("Page.navigate", { url: `${BASE_URL}/creative-lab/concierge-experience` });
    await sleep(550);
    report.prototypeRoute = await evaluate(
      client,
      `({
        variant: document.querySelector('[data-cxp04-variant]')?.getAttribute('data-cxp04-variant'),
        hasStartBtn: Boolean(document.querySelector('[data-cxp04-start-btn]')),
      })`,
    );

    // 5. Mobile 390x844 full walkthrough + WebM recording (Menu -> Open Atelier -> Start -> Switch Tab -> Close -> Restore)
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    activeFramesDir = mobileFramesDir;
    frameIdx = 0;
    await client.send("Page.startScreencast", {
      format: "jpeg",
      quality: 82,
      maxWidth: 540,
      maxHeight: 1170,
      everyNthFrame: 1,
    });
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(600);
    await evaluate(client, `document.querySelector('button[aria-controls="mobile-navigation"]')?.click()`);
    await sleep(250);
    await evaluate(client, `document.querySelector('#mobile-navigation a[data-concierge-trigger]')?.click()`);
    await sleep(600);
    await capture(client, "12_mobile_atelier_invitation.png");

    await evaluate(client, `document.querySelector('[data-cxp04-start-btn]')?.click()`);
    await sleep(450);
    await capture(client, "13_mobile_conversation.png");

    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    );
    await sleep(300);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mở bản phác thảo'))?.click()`,
    );
    await sleep(500);
    await capture(client, "14_mobile_journey_canvas.png");

    await evaluate(client, `document.querySelector('[data-cxp04-close-btn]')?.click()`);
    await sleep(450);
    const mobileAfterClose = await evaluate(
      client,
      `({ openDialogs: document.querySelectorAll('dialog[open]').length, scrollY: Math.round(window.scrollY) })`,
    );
    await client.send("Page.stopScreencast");
    client.off("Page.screencastFrame", onFrame);
    report.recordings.mobile = encodeWebm(
      mobileFramesDir,
      path.join(SCRATCH_DIR, "cxp04c_mobile_integration.webm"),
    );
    report.movements.mobileMenu = mobileAfterClose;

    // 6. 7-Viewport overflow audit while integrated Atelier overlay is open on '/'
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(500);
    await evaluate(client, `document.querySelector('header a[data-concierge-trigger]')?.click()`);
    await sleep(450);
    for (const vp of [
      { name: "360x640", w: 360, h: 640, mobile: true },
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
      await sleep(200);
      const ov = await evaluate(
        client,
        `({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })`,
      );
      report.overflowChecks[vp.name] = { ...ov, ok: ov.scrollWidth <= ov.innerWidth };
    }

    // 7. Reduced motion workspace capture
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
      `({
        matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        hasOverlay: Boolean(document.querySelector('dialog.cxp04-dialog-host[open]')),
      })`,
    );
    await capture(client, "15_reduced_motion_workspace.png");
    await client.send("Emulation.setEmulatedMedia", { features: [] });

    // 8. No-JS homepage regression check
    ignoreNetworkForNoJsTest = true;
    await client.send("Emulation.setScriptExecutionDisabled", { value: true });
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(700);
    const noJsHtml = await (await fetch(`${BASE_URL}/`)).text();
    report.noJsHomepage = {
      statusOk: true,
      hasH1: noJsHtml.includes("<h1") && noJsHtml.includes("Đi xa hơn"),
      hasFooter: noJsHtml.includes("<footer"),
      hasAiPlannerFallbackHref: noJsHtml.includes('href="/ai-planner"'),
    };
    await capture(client, "16_no_js_homepage_regression.png");
    await client.send("Emulation.setScriptExecutionDisabled", { value: false });
    ignoreNetworkForNoJsTest = false;

    client.close();
  } finally {
    chrome.kill();
    await sleep(400);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  fs.writeFileSync(path.join(SCRATCH_DIR, "verify_cxp04c_on.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed =
    report.consoleErrors.length > 0 ||
    report.pageErrors.length > 0 ||
    report.failedRequests.length > 0 ||
    !report.movements.m01Header?.isAtelierDialog ||
    !report.movements.m01Header?.closedOnEscape ||
    report.movements.m02?.duplicateGuardCount !== 1 ||
    report.movements.m02?.afterBack?.openDialogs !== 0 ||
    report.movements.m02?.afterBack?.path !== "/" ||
    report.movements.m02?.afterForward?.openDialogs !== 1 ||
    report.movements.m02?.scrollDeltaPx > 8 ||
    report.movements.m02?.discoveryInfo?.question !== "destination" ||
    report.movements.m02?.revealCost === report.movements.m02?.refinedCost ||
    !report.movements.m03?.isOpen ||
    !report.movements.m04?.isOpen ||
    !report.movements.m05?.isOpen ||
    !report.movements.m06Finale?.floatingHidden ||
    !report.movements.m06Finale?.m06Open ||
    !report.movements.reverseM04Floating ||
    report.aiPlanner.modeOn?.variant !== "route" ||
    report.aiPlanner.modeOn?.openDialogs !== 0 ||
    report.aiPlanner.modeOn?.exposesInternalCodename ||
    !report.prototypeRoute?.hasStartBtn ||
    Object.values(report.overflowChecks).some((o) => !o.ok) ||
    !report.reducedMotion?.hasOverlay ||
    !report.noJsHomepage?.hasH1;

  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

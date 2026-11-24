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
    mobileAboveFold: {},
    overflowChecks: {},
    reducedMotion: null,
    accessibility: {},
    regressionCheck: {},
    desktopRecording: null,
    mobileRecording: null,
  };

  const desktopFramesDir = path.join(SCRATCH_DIR, "atelier_desktop_frames");
  const mobileFramesDir = path.join(SCRATCH_DIR, "atelier_mobile_frames");
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

    await client.send("Page.navigate", { url: `${BASE_URL}/creative-lab/concierge-experience` });
    await sleep(900);
    report.screenshots.push(await capture(client, "01_desktop_invitation.png"));

    // Flow B: Romantic preset -> must skip redundant companions question and land on destination!
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-preset-chip')).find(b => b.textContent.includes('Lãng mạn'))?.click()`,
    );
    await sleep(550);
    report.flow.afterPreset = await evaluate(
      client,
      `({
        phase: document.querySelector('main')?.getAttribute('data-cxp04-phase'),
        activeQuestion: document.querySelector('[data-cxp04-question]')?.getAttribute('data-cxp04-question'),
        hasInferredBadge: Boolean(document.querySelector('[data-status="inferred"]')),
      })`,
    );
    report.screenshots.push(await capture(client, "02_desktop_discovery.png"));

    // Flow C: Interpretation with inferred count, then confirm & edit companions -> 4 travelers
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    );
    await sleep(500);
    report.screenshots.push(await capture(client, "03_desktop_interpretation.png"));

    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-inline-btn')).find(b => b.textContent.includes('Người đồng hành'))?.click()`,
    );
    await sleep(400);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-choice-btn')).find(b => b.textContent.includes('Nhóm bạn nhỏ'))?.click()`,
    );
    await sleep(250);
    await evaluate(client, `document.querySelector('[data-cxp04-next-btn]')?.click()`);
    await sleep(450);
    report.flow.afterEditCompanions = await evaluate(
      client,
      `({
        phase: document.querySelector('main')?.getAttribute('data-cxp04-phase'),
        confirmedCount: document.querySelectorAll('[data-status="confirmed"]').length,
      })`,
    );
    report.screenshots.push(await capture(client, "04_desktop_interpretation_updated.png"));

    // Flow D: Reveal Journey
    await evaluate(client, `document.querySelector('[data-cxp04-reveal-btn]')?.click()`);
    await sleep(600);
    const beforeCost = await evaluate(
      client,
      `document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim() || ''`,
    );
    report.screenshots.push(await capture(client, "05_desktop_journey_reveal.png"));

    // Flow E: Budget refinement with revision explanation card
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-refine-chip')).find(b => b.textContent.includes('Giảm ngân sách'))?.click()`,
    );
    await sleep(550);
    const afterBudgetCost = await evaluate(
      client,
      `document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim() || ''`,
    );
    const hasRevisionCard = await evaluate(
      client,
      `Boolean(document.querySelector('[data-cxp04-revision-card]'))`,
    );
    report.screenshots.push(await capture(client, "06_desktop_budget_refinement.png"));

    // Duration toggle refinement -> 2 days
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('.cxp04-refine-chip')).find(b => b.textContent.includes('Đổi thời lượng'))?.click()`,
    );
    await sleep(550);
    const afterDurationCost = await evaluate(
      client,
      `document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim() || ''`,
    );
    const dayTabsCount = await evaluate(
      client,
      `document.querySelectorAll('.cxp04-day-tab').length`,
    );
    report.screenshots.push(await capture(client, "07_desktop_duration_refinement.png"));

    // Flow F: Unsupported & negated free-text honesty + IME guard
    const imeAndUnsupported = await evaluate(
      client,
      `(() => {
        const ta = document.querySelector('#cxp04-composer-input');
        const beforeMsgs = document.querySelectorAll('[role="log"] article').length;
        const beforeCostText = document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim();
        ta.focus();
        document.execCommand('insertText', false, 'Đặt vé máy bay đi Kyoto');
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, shiftKey: true }));
        const afterGuard = document.querySelectorAll('[role="log"] article').length;
        document.querySelector('.cxp04-composer button[type="submit"]').click();
        return new Promise((resolve) => setTimeout(() => {
          const afterSubmit = document.querySelectorAll('[role="log"] article').length;
          const lastProv = document.querySelectorAll('[role="log"] article')[afterSubmit - 1]?.getAttribute('data-provenance');
          const afterCostText = document.querySelector('[data-cxp04-cost-total]')?.textContent?.trim();
          resolve({
            imeGuarded: afterGuard === beforeMsgs,
            appendedUnsupported: afterSubmit === beforeMsgs + 2 && lastProv === 'unsupported-notice',
            costUnchanged: beforeCostText === afterCostText,
          });
        }, 250));
      })()`,
    );

    report.flow.costChanged = beforeCost !== "" && afterBudgetCost !== "" && beforeCost !== afterBudgetCost;
    report.flow.beforeCost = beforeCost;
    report.flow.afterBudgetCost = afterBudgetCost;
    report.flow.afterDurationCost = afterDurationCost;
    report.flow.dayTabsCount = dayTabsCount;
    report.flow.hasRevisionCard = hasRevisionCard;
    report.flow.imeAndUnsupported = imeAndUnsupported;

    await client.send("Page.stopScreencast");
    report.desktopRecording = encodeWebm(
      desktopFramesDir,
      path.join(SCRATCH_DIR, "cxp04_atelier_demo.webm"),
    );

    // Mobile above-the-fold CTA checks + 8-viewport overflow audit
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
      await client.send("Page.navigate", { url: `${BASE_URL}/creative-lab/concierge-experience` });
      await sleep(350);
      const metrics = await evaluate(
        client,
        `(() => {
          const btn = document.querySelector('[data-cxp04-start-btn]');
          const rect = btn ? btn.getBoundingClientRect() : null;
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            ctaVisibleAboveFold: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight),
            ctaHeight: rect ? Math.round(rect.height) : 0,
          };
        })()`,
      );
      report.overflowChecks[vp.name] = {
        scrollWidth: metrics.scrollWidth,
        innerWidth: metrics.innerWidth,
        ok: metrics.scrollWidth <= metrics.innerWidth,
      };
      if (vp.mobile) {
        report.mobileAboveFold[vp.name] = {
          ctaVisibleAboveFold: metrics.ctaVisibleAboveFold,
          ctaHeight: metrics.ctaHeight,
        };
      }
      if (vp.name === "360x640") {
        report.screenshots.push(await capture(client, "08_mobile_invitation_360x640.png"));
      }
      if (vp.name === "390x844") {
        report.screenshots.push(await capture(client, "09_mobile_invitation_390x844.png"));
      }
    }

    // Mobile 390x844 recorded walkthrough (Invitation -> Conversation -> Journey Canvas)
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
    await client.send("Page.navigate", { url: `${BASE_URL}/creative-lab/concierge-experience` });
    await sleep(500);
    await evaluate(client, `document.querySelector('[data-cxp04-start-btn]')?.click()`);
    await sleep(450);
    report.screenshots.push(await capture(client, "10_mobile_conversation.png"));

    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xem tóm tắt ngay'))?.click()`,
    );
    await sleep(350);
    await evaluate(
      client,
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mở bản phác thảo'))?.click()`,
    );
    await sleep(550);
    report.screenshots.push(await capture(client, "11_mobile_itinerary.png"));

    await client.send("Page.stopScreencast");
    client.off("Page.screencastFrame", onFrame);
    report.mobileRecording = encodeWebm(
      mobileFramesDir,
      path.join(SCRATCH_DIR, "cxp04_atelier_mobile_demo.webm"),
    );

    // Reduced motion + Keyboard Accessibility check
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
    report.accessibility = await evaluate(
      client,
      `({
        hasMain: Boolean(document.querySelector('main#main-content')),
        h1Count: document.querySelectorAll('h1').length,
        hasLiveRegion: Boolean(document.querySelector('[aria-live="polite"]')),
        hasModalTrap: Boolean(document.querySelector('dialog[open]')),
      })`,
    );
    report.screenshots.push(await capture(client, "12_reduced_motion.png"));
    await client.send("Emulation.setEmulatedMedia", { features: [] });

    // Flow I: Homepage CXP-03D visual/DOM invariants + /ai-planner check
    await client.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(900);
    report.regressionCheck.home = await evaluate(
      client,
      `({
        title: document.title,
        h1Count: document.querySelectorAll('h1').length,
        hasCxp02Runway: Boolean(document.querySelector('[data-cxp02-runway]')),
        hasPhotographicWordmark: Boolean(document.querySelector('[data-cxp01-wordmark], svg text, .cxp01-wordmark')),
        hasObsoleteHeroAiCta: Boolean(
          Array.from(document.querySelectorAll('[data-cxp02-movement="01"] a, [data-cxp02-movement="01"] button, .cxp01-hero a, .cxp01-hero button')).find((el) =>
            el.textContent.includes('Plan with Adora AI')
          )
        ),
      })`,
    );
    report.screenshots.push(await capture(client, "13_homepage_regression.png"));

    await client.send("Page.navigate", { url: `${BASE_URL}/ai-planner` });
    await sleep(500);
    report.regressionCheck.aiPlanner = await evaluate(
      client,
      `({ title: document.title, h1Count: document.querySelectorAll('h1').length })`,
    );

    client.close();
  } finally {
    chrome.kill();
    await sleep(400);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  fs.writeFileSync(path.join(SCRATCH_DIR, "verify_cxp04_atelier.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed =
    report.consoleErrors.length > 0 ||
    report.pageErrors.length > 0 ||
    report.failedRequests.length > 0 ||
    report.flow.afterPreset?.activeQuestion !== "destination" ||
    !report.flow.afterPreset?.hasInferredBadge ||
    !report.flow.costChanged ||
    !report.flow.hasRevisionCard ||
    report.flow.dayTabsCount !== 2 ||
    !report.flow.imeAndUnsupported?.imeGuarded ||
    !report.flow.imeAndUnsupported?.appendedUnsupported ||
    !report.flow.imeAndUnsupported?.costUnchanged ||
    Object.values(report.mobileAboveFold).some((m) => !m.ctaVisibleAboveFold) ||
    Object.values(report.overflowChecks).some((o) => !o.ok) ||
    !report.reducedMotion?.hasCost ||
    !report.regressionCheck.home?.hasCxp02Runway ||
    report.regressionCheck.home?.hasObsoleteHeroAiCta;

  if (failed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

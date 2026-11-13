import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

/**
 * ADORA Web Design 0.4 — Incremental Motion Foundation & Choreography Verifier
 *
 * Package A scope (Specification v1.1 + Final Approval Errata E-1..E-4):
 * - SSR & No-JS fail-visible markup (zero `data-reveal` in SSR HTML, opacity 1 without JS, zero hydration errors)
 * - IntersectionObserver lifecycle (below-fold staging, partial-fold never hidden, one-shot reveal,
 *   E-1 newest-entry batch handling, E-4d fast jump-to-bottom 2-rAF test, /#philosophy anchor load)
 * - Multi-layer fail-visible overrides (reduced motion at load & toggled post-hydration,
 *   html[data-motion="off"] pre- & post-hydration, @media print, missing IntersectionObserver,
 *   E-4c keyboard focus-within via injected tabindex="-1" probe, E-2 stackOnMobile & stagger cap)
 * - Next.js 16 <Activity> Back/Forward lifecycle (both post-reveal idempotence and pre-reveal
 *   pending cleanup + re-observation), observer/listener leak checks, and optional React 19
 *   development Strict Mode verification when ADORA_STRICT_DEV_URL is supplied
 * - Six-viewport responsive matrix (360, 390, 768, 1024, 1440, 1920), desktop fine-pointer hover
 *   zoom vs. mobile touch hover guard (INV-15 P0 / E-3c), zero persistent will-change, zero
 *   horizontal overflow, homepage CLS safety, and zero motion work on unrelated routes.
 *
 * Package B scope (Homepage Cinematic Experience — INV-03..INV-11, Errata E-5..E-8):
 * - Hero opening: CSS-only preload image scale settle (INV-03), 0ms LCP-safe eyebrow + h1 transform
 *   rise and 4-step editorial rhythm (INV-04), bounded 1.5-iteration 3.3s scroll-line settle (INV-05 / E-5),
 *   CTA clickability & :focus-visible instant settle during entrance, and E-6 Server Component Activity restore
 * - Editorial chapters: BrandPhilosophy preservation (INV-06), DestinationStory stationary image frame
 *   & absolute coordinate badge Reveal (INV-07 / E-8a), ExperienceStory reversed mobile/desktop order,
 *   lg:translate-y-10 preservation, static <li> dividers & static provenance note (INV-08 / E-7 / E-8c),
 *   AiPlannerSection static ink band, honesty notice, zero fake streaming/pulse & +80/+160ms opacity-only
 *   sample bubbles (INV-09 / E-8b), HowItWorks static <li> dividers & mobile 0ms stack (INV-10 / E-7),
 *   and SiteFooter interior closing CTA reveal with static footer band & utility nav (INV-11).
 *
 * Package C scope (Discovery Experience — INV-12..INV-16, Errata E-6, E-7, E-11, E-12, N-5, N-6):
 * - INV-12 (E-6, E-12): PageIntro pure-CSS load entrance (0ms delay on both columns including DemoBadge,
 *   LCP-safe opacity: 1 h1 heading rise, Server Component <Activity> Back visibility preserved)
 * - INV-13: /destinations Featured Đà Lạt image scale(1.02) -> none settle (760ms, opacity 1 from 0ms,
 *   stationary outer frame & static overlapping lg:col-start-8 paper card)
 * - INV-14 (N-5): DestinationBrowser & ExperienceBrowser chip-scoped 220ms opacity 0.5 -> 1 settle
 *   (excluding search filter.query typing + covering empty states)
 * - INV-15 (E-11): ExperienceCard keyboard :focus-visible ArrowUpRight parity + touch hover guard
 * - INV-16 (E-7, N-6, B-7): Destination/Experience detail reveals (<Reveal> inside ruled <li> items,
 *   opt-in ExperienceGrid reveal, static prose & <aside>, PlannerCta inner reveal)
 *
 * Package D scope (Application Interactions — INV-17..INV-20, Errata E-9..E-10, P-6, N-4, N-7, B-5):
 * - AI Planner: opacity-only message entrances (160ms user bubble at 0ms, 200ms scripted/unsupported reply
 *   at +80ms on outer <article>), atomic non-streaming DOM insertion, scroll stability (|scrollTop(t=0) -
 *   scrollTop(settled)| <= 1px, settled userBubble.top - log.top in [8, 16]px), desktop Trip Preview 6px
 *   rise + opacity (keyed by preview.slug), mobile Trip Preview & Jumpbar opacity-only entrances, dynamic
 *   reduced-motion Jumpbar scrolling, P-6/N-4 welcome suggestion focus (#planner-prompt for keyboard/mouse,
 *   user turn <article tabIndex=-1> for touch), and Next.js <Activity> Back-navigation replay prevention.
 * - Trip Itinerary: stable outer role="tabpanel" node with inner keyed [data-day-panel-enter] wrapper
 *   suppressed on initial load via event-handler hasSwitched state (E-10), 220ms panel entrance with
 *   opacity 0.25 -> 1 and 6px rise (N-7), synchronous aria-selected/focus/day-budget updates, <Activity>
 *   replay prevention, and 3-layer CSS Grid activity accordion (0fr <-> 1fr, inert={!open} on role="region",
 *   collapsed height <= 1px, synchronous aria-expanded, and no content remount).
 *
 * Package E extends this script additively without weakening Package A, B, C, or D checks.
 */

const chromePath = process.env.ADORA_CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const siteUrl = process.env.ADORA_WEB_URL ?? "http://127.0.0.1:3100";
const strictDevUrl = process.env.ADORA_STRICT_DEV_URL ?? null;
const strictDevOnly = process.argv.includes("--strict-dev-only");
const capturePackageBEvidenceOnly = process.argv.includes("--capture-package-b-evidence-only");
const capturePackageBEvidenceFlag =
  capturePackageBEvidenceOnly || process.argv.includes("--capture-package-b-evidence");
const capturePackageCEvidenceOnly = process.argv.includes("--capture-package-c-evidence-only");
const capturePackageCEvidenceFlag =
  capturePackageCEvidenceOnly || process.argv.includes("--capture-package-c-evidence");
const capturePackageDEvidenceOnly = process.argv.includes("--capture-package-d-evidence-only");
const capturePackageDEvidenceFlag =
  capturePackageDEvidenceOnly || process.argv.includes("--capture-package-d-evidence");
const capturePackageEEvidenceOnly = process.argv.includes("--capture-package-e-evidence-only");
const capturePackageEEvidenceFlag =
  capturePackageEEvidenceOnly || process.argv.includes("--capture-package-e-evidence");
const CDP_COMMAND_TIMEOUT_MS = Number(process.env.ADORA_CDP_TIMEOUT_MS ?? "25000");
const outputDirectory = resolve(process.env.ADORA_VERIFY_OUTPUT ?? "docs/reports/assets/web-design-0-4");
const packageBEvidenceDirectory = resolve(
  process.env.ADORA_PACKAGE_B_EVIDENCE_DIR ?? "docs/reports/assets/web-design-0-4/package-b",
);
const packageCEvidenceDirectory = resolve(
  process.env.ADORA_PACKAGE_C_EVIDENCE_DIR ?? "docs/reports/assets/web-design-0-4/package-c",
);
const packageDEvidenceDirectory = resolve(
  process.env.ADORA_PACKAGE_D_EVIDENCE_DIR ?? "docs/reports/assets/web-design-0-4/package-d",
);
const packageEEvidenceDirectory = resolve(
  process.env.ADORA_PACKAGE_E_EVIDENCE_DIR ?? "docs/reports/assets/web-design-0-4/package-e",
);
const debugPort = Number(process.env.ADORA_VERIFY_0_4_PORT ?? "9228");

const configuredViewports = [
  { name: "360", width: 360, height: 800 },
  { name: "mobile", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 900 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
];

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitForBrowserEndpoint() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome is starting.
    }
    await wait(100);
  }
  throw new Error("Chrome DevTools Protocol did not become available");
}

function createCdpConnection(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (payload.id) {
      const entry = pending.get(payload.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(payload.id);
      if (payload.error) entry.reject(new Error(`${entry.method}: ${payload.error.message}`));
      else entry.resolve(payload.result);
      return;
    }
    const key = payload.sessionId ? `${payload.sessionId}:${payload.method}` : payload.method;
    for (const handler of listeners.get(key) ?? []) handler(payload.params);
  });

  const ready = new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });

  return {
    ready,
    send(method, params = {}, sessionId = undefined, timeoutMs = CDP_COMMAND_TIMEOUT_MS) {
      nextId += 1;
      const id = nextId;
      return new Promise((resolvePromise, rejectPromise) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          const detail =
            method === "Runtime.evaluate" && typeof params.expression === "string"
              ? ` (${params.expression.replace(/\s+/g, " ").slice(0, 140)}...)`
              : "";
          rejectPromise(new Error(`CDP command timed out after ${timeoutMs}ms: ${method}${detail}`));
        }, timeoutMs);
        pending.set(id, { method, timer, resolve: resolvePromise, reject: rejectPromise });
        const message = sessionId ? { id, method, params, sessionId } : { id, method, params };
        socket.send(JSON.stringify(message));
      });
    },
    on(method, handler, sessionId = undefined) {
      const key = sessionId ? `${sessionId}:${method}` : method;
      const current = listeners.get(key) ?? [];
      current.push(handler);
      listeners.set(key, current);
    },
    close() {
      for (const entry of pending.values()) clearTimeout(entry.timer);
      pending.clear();
      socket.close();
    },
  };
}

async function withIsolatedSession(browserClient, options, fn) {
  const {
    width = 1440,
    height = 900,
    deviceScaleFactor = 1,
    mobile = width < 768,
    touch = mobile,
    scriptDisabled = false,
    blockedUrls = null,
    reducedMotion = false,
    initScript = null,
  } = options;

  const { browserContextId } = await browserClient.send("Target.createBrowserContext");
  const { targetId } = await browserClient.send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  const { sessionId } = await browserClient.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });

  const session = {
    errors: [],
    hydrationWarnings: [],
    send(method, params = {}) {
      return browserClient.send(method, params, sessionId);
    },
    on(method, handler) {
      browserClient.on(method, handler, sessionId);
    },
    async evaluate(expression) {
      const result = await browserClient.send(
        "Runtime.evaluate",
        {
          expression,
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId,
      );
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      }
      return result.result.value;
    },
  };

  session.on("Runtime.exceptionThrown", (event) => {
    session.errors.push(`exception: ${event.exceptionDetails.text}`);
  });
  session.on("Runtime.consoleAPICalled", (event) => {
    const text = event.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
    if (event.type === "error") {
      session.errors.push(`console: ${text}`);
    }
    if ((event.type === "error" || event.type === "warning") && /hydrat|did not match/i.test(text)) {
      session.hydrationWarnings.push(text);
    }
  });
  session.on("Network.loadingFailed", (event) => {
    if (event.canceled) return;
    if (scriptDisabled && event.type === "Script") return;
    if (
      blockedUrls &&
      event.type === "Script" &&
      (event.blockedReason === "inspector" || !event.errorText || event.errorText === "net::ERR_BLOCKED_BY_CLIENT")
    ) {
      return;
    }
    session.errors.push(`network: ${event.errorText} (${event.type})`);
  });

  try {
    await Promise.all([
      session.send("Page.enable"),
      session.send("Runtime.enable"),
      session.send("Network.enable"),
      session.send("Network.setCacheDisabled", { cacheDisabled: true }),
      session.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor,
        mobile,
      }),
      session.send("Emulation.setTouchEmulationEnabled", {
        enabled: touch,
        ...(touch ? { maxTouchPoints: 5 } : {}),
      }),
    ]);

    if (scriptDisabled) {
      await session.send("Emulation.setScriptExecutionDisabled", { value: true });
    }
    if (blockedUrls && blockedUrls.length > 0) {
      await session.send("Network.setBlockedURLs", { urls: blockedUrls });
    }
    if (reducedMotion) {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
    }
    if (initScript) {
      await session.send("Page.addScriptToEvaluateOnNewDocument", { source: initScript });
    }

    return await fn(session);
  } finally {
    await browserClient.send("Target.closeTarget", { targetId }).catch(() => {});
    await browserClient.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  }
}

async function navigateAndWaitReady(session, url, waitForCatalogFallback = false) {
  const loadFired = new Promise((resolvePromise) => {
    let resolved = false;
    session.on("Page.loadEventFired", () => {
      if (!resolved) {
        resolved = true;
        resolvePromise();
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolvePromise();
      }
    }, 8000);
  });

  await session.send("Page.navigate", { url });
  await loadFired;
  await wait(waitForCatalogFallback ? 2400 : 350);
}

const OBSERVER_TRACKER_INIT_SCRIPT = `
(() => {
  const stats = {
    revealIoConstructed: 0,
    activeRevealObservers: new Set(),
    activeWindowListeners: new Map(),
    revealHistory: [],
  };
  window.__adoraMotionProbe = stats;

  const NativeIO = window.IntersectionObserver;
  if (NativeIO) {
    window.IntersectionObserver = class TrackedIntersectionObserver extends NativeIO {
      constructor(callback, options) {
        super(callback, options);
        this.__isRevealObserver = false;
      }
      observe(target) {
        if (target && typeof target.hasAttribute === "function" && target.hasAttribute("data-reveal-variant")) {
          if (!this.__isRevealObserver) {
            this.__isRevealObserver = true;
            stats.revealIoConstructed += 1;
          }
          this.__revealTarget = target;
          this.__sectionId = target.closest("section")?.id ?? (target.closest("footer") ? "footer" : "other");
          stats.activeRevealObservers.add(this);
        }
        return super.observe(target);
      }
      unobserve(target) {
        return super.unobserve(target);
      }
      disconnect() {
        stats.activeRevealObservers.delete(this);
        return super.disconnect();
      }
    };
  }

  const origAdd = window.addEventListener.bind(window);
  const origRemove = window.removeEventListener.bind(window);
  const trackedEvents = new Set(["scroll", "resize", "hashchange"]);

  window.addEventListener = function(type, listener, options) {
    if (trackedEvents.has(type) && typeof listener === "function") {
      if (!stats.activeWindowListeners.has(type)) stats.activeWindowListeners.set(type, new Set());
      stats.activeWindowListeners.get(type).add(listener);
    }
    return origAdd(type, listener, options);
  };

  window.removeEventListener = function(type, listener, options) {
    if (trackedEvents.has(type) && stats.activeWindowListeners.has(type)) {
      stats.activeWindowListeners.get(type).delete(listener);
    }
    return origRemove(type, listener, options);
  };

  const recordAttr = () => {
    if (!document.documentElement) return;
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === "attributes" && rec.attributeName === "data-reveal") {
          const el = rec.target;
          stats.revealHistory.push({
            id: el.closest("section")?.id ?? null,
            value: el.getAttribute("data-reveal"),
            top: Math.round(el.getBoundingClientRect().top),
            innerHeight: window.innerHeight,
          });
        }
      }
    });
    mo.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-reveal"],
    });
  };
  if (document.documentElement) recordAttr();
  else origAdd("DOMContentLoaded", recordAttr, { once: true });
})();
`;

async function runSsrAndNoJsSuite(browserClient) {
  const response = await fetch(siteUrl);
  const html = await response.text();
  const hasAnyDataRevealStateAttr = /\sdata-reveal=(?:"|')/.test(html);
  const totalSsrRevealVariantCount = (html.match(/data-reveal-variant="/g) ?? []).length;
  const hasPhilosophyHeading = html.includes("Triết lý ADORA") && html.includes("Không chỉ là nơi bạn đến.");

  const noJsScriptDisabled = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, scriptDisabled: true },
    async (session) => {
      await session.send("Page.navigate", { url: siteUrl });
      await wait(2400);
      const domCheck = await session.evaluate(`(() => {
        const section = document.querySelector('#philosophy');
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        const domUnits = Array.from(document.querySelectorAll('[data-reveal-variant]'));
        const sampleBubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        const heroImg = document.querySelector('img[data-image-settle]');
        const h1 = document.querySelector('h1');
        const streamHiddenAncestor = Boolean(section?.closest('[hidden]'));
        return {
          sectionPresent: Boolean(section),
          unitCount: units.length,
          domUnitCount: domUnits.length,
          anyDataRevealAttr: domUnits.some((el) => el.hasAttribute('data-reveal')),
          allBaseStyleVisible: domUnits.every((el) => {
            const s = getComputedStyle(el);
            return s.opacity === '1' && s.transform === 'none';
          }),
          sampleBubblesVisible:
            sampleBubbles.length >= 2 && sampleBubbles.every((el) => getComputedStyle(el).opacity === '1'),
          heroImgVisible: heroImg ? getComputedStyle(heroImg).opacity === '1' : false,
          h1Visible: h1 ? getComputedStyle(h1).opacity === '1' : false,
          sectionOpacity: section ? getComputedStyle(section).opacity : null,
          insideNextPprStreamContainerWhenAllScriptsBlocked: streamHiddenAncestor,
        };
      })()`);
      return { ...domCheck, errors: session.errors };
    },
  );

  const clientBundlesBlockedDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, blockedUrls: ["*/_next/static/chunks/*.js"] },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const domCheck = await session.evaluate(`(() => {
        const section = document.querySelector('#philosophy');
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        const allHomepageUnits = Array.from(document.querySelectorAll('[data-reveal-variant]'));
        const sampleBubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        return {
          sectionPresent: Boolean(section),
          unitCount: units.length,
          homepageUnitCount: allHomepageUnits.length,
          anyDataRevealAttr: allHomepageUnits.some((el) => el.hasAttribute('data-reveal')),
          allLaidOutAndVisible: allHomepageUnits.every((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.opacity === '1' && s.transform === 'none' && r.width > 0 && r.height > 0;
          }),
          sampleBubblesVisible:
            sampleBubbles.length === 2 &&
            sampleBubbles.every((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none'),
        };
      })()`);
      return { ...domCheck, errors: session.errors };
    },
  );

  const clientBundlesBlockedMobile = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, mobile: true, blockedUrls: ["*/_next/static/chunks/*.js"] },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const domCheck = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        const allHomepageUnits = Array.from(document.querySelectorAll('[data-reveal-variant]'));
        const sampleBubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        return {
          unitCount: units.length,
          homepageUnitCount: allHomepageUnits.length,
          anyDataRevealAttr: allHomepageUnits.some((el) => el.hasAttribute('data-reveal')),
          allLaidOutAndVisible: allHomepageUnits.every((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.opacity === '1' && s.transform === 'none' && r.width > 0 && r.height > 0;
          }),
          sampleBubblesVisible:
            sampleBubbles.length === 2 &&
            sampleBubbles.every((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none'),
        };
      })()`);
      return { ...domCheck, errors: session.errors };
    },
  );

  const passed =
    response.status === 200 &&
    !hasAnyDataRevealStateAttr &&
    totalSsrRevealVariantCount >= 20 &&
    hasPhilosophyHeading &&
    noJsScriptDisabled.sectionPresent &&
    noJsScriptDisabled.unitCount === 3 &&
    noJsScriptDisabled.domUnitCount >= 20 &&
    !noJsScriptDisabled.anyDataRevealAttr &&
    noJsScriptDisabled.allBaseStyleVisible &&
    noJsScriptDisabled.sampleBubblesVisible &&
    noJsScriptDisabled.heroImgVisible &&
    noJsScriptDisabled.h1Visible &&
    noJsScriptDisabled.sectionOpacity === "1" &&
    noJsScriptDisabled.errors.length === 0 &&
    clientBundlesBlockedDesktop.sectionPresent &&
    clientBundlesBlockedDesktop.unitCount === 3 &&
    clientBundlesBlockedDesktop.homepageUnitCount === 20 &&
    !clientBundlesBlockedDesktop.anyDataRevealAttr &&
    clientBundlesBlockedDesktop.allLaidOutAndVisible &&
    clientBundlesBlockedDesktop.sampleBubblesVisible &&
    clientBundlesBlockedDesktop.errors.length === 0 &&
    clientBundlesBlockedMobile.unitCount === 3 &&
    clientBundlesBlockedMobile.homepageUnitCount === 20 &&
    !clientBundlesBlockedMobile.anyDataRevealAttr &&
    clientBundlesBlockedMobile.allLaidOutAndVisible &&
    clientBundlesBlockedMobile.sampleBubblesVisible &&
    clientBundlesBlockedMobile.errors.length === 0;

  return {
    executed: true,
    passed,
    ssrHtml: {
      status: response.status,
      hasAnyDataRevealStateAttr,
      totalSsrRevealVariantCount,
      hasPhilosophyHeading,
    },
    noJsScriptDisabled,
    clientBundlesBlockedDesktop,
    clientBundlesBlockedMobile,
  };
}

async function runIntersectionObserverSuite(browserClient) {
  // 1. Below-fold staging, reveal transition, settled transform:none, and one-shot permanence
  const normalScrollAndOneShot = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      await session.evaluate("document.fonts.ready.then(() => true)");

      const initialBelowFold = await session.evaluate(`(() => {
        const section = document.querySelector('#philosophy');
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return {
          sectionOpacity: section ? getComputedStyle(section).opacity : null,
          sectionTransform: section ? getComputedStyle(section).transform : null,
          unitStates: units.map((el) => ({
            state: el.getAttribute('data-reveal'),
            opacity: getComputedStyle(el).opacity,
            transform: getComputedStyle(el).transform,
            top: Math.round(el.getBoundingClientRect().top),
          })),
        };
      })()`);

      await session.evaluate(`(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        const section = document.querySelector('#philosophy');
        section.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((anim) => section.contains(anim.effect?.target))
            .map((anim) => anim.finished.catch(() => {})),
        );
        return true;
      })()`);

      const afterReveal = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return units.map((el) => {
          const s = getComputedStyle(el);
          return {
            state: el.getAttribute('data-reveal'),
            opacity: s.opacity,
            transform: s.transform,
            transitionDuration: s.transitionDuration,
            transitionDelay: s.transitionDelay,
          };
        });
      })()`);

      // Scroll away to bottom, back to top, and back to #philosophy to confirm one-shot permanence
      const afterScrollAwayAndBack = await session.evaluate(`(async () => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, 150));
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 150));
        document.querySelector('#philosophy').scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return {
          allStillVisible: units.every((el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none'),
          pendingTransitionsAfterReveal: window.__adoraMotionProbe.revealHistory.filter((h) => h.id === 'philosophy' && h.value === 'pending').length,
        };
      })()`);

      return {
        initialBelowFold,
        afterReveal,
        afterScrollAwayAndBack,
        hydrationWarnings: session.hydrationWarnings,
        errors: session.errors,
      };
    },
  );

  // 2. Partially visible fold safety on real 768x1024 tablet portrait load (EditorialHero is 52rem = 832px,
  // placing #philosophy units naturally at ~944px inside the 90%-100% bottom band of the 1024px viewport at scrollY=0)
  const partialFoldSafety = await withIsolatedSession(
    browserClient,
    {
      width: 768,
      height: 1024,
      initScript: OBSERVER_TRACKER_INIT_SCRIPT,
    },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const check = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        const firstRect = units[0]?.getBoundingClientRect();
        const historyForFirst = window.__adoraMotionProbe.revealHistory;
        const partiallyVisibleUnits = units.filter((el) => el.getBoundingClientRect().top < window.innerHeight);
        return {
          viewportHeight: window.innerHeight,
          scrollY: Math.round(window.scrollY),
          firstUnitTop: firstRect ? Math.round(firstRect.top) : null,
          partiallyVisibleCount: partiallyVisibleUnits.length,
          partiallyVisibleStates: partiallyVisibleUnits.map((el) => ({
            state: el.getAttribute('data-reveal'),
            opacity: getComputedStyle(el).opacity,
          })),
          anyPartiallyVisibleEverPending: historyForFirst.some(
            (entry) => entry.value === 'pending' && entry.top < entry.innerHeight,
          ),
        };
      })()`);
      return { ...check, errors: session.errors };
    },
  );

  // 3. Binding Erratum E-4(d): Fast jump-to-bottom test (scrollTo(0, scrollHeight) + 2 rAF -> 0 pending in viewport & skipped above-viewport revealed)
  const fastScrollJumpTest = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const jumpResult = await session.evaluate(`(async () => {
        const beforePendingCount = document.querySelectorAll('#philosophy [data-reveal="pending"]').length;
        const beforeHomepagePendingCount = document.querySelectorAll('[data-reveal="pending"]').length;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const pendingElements = Array.from(document.querySelectorAll('[data-reveal="pending"]'));
        const pendingInViewport = pendingElements.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.bottom > 0 && r.top < window.innerHeight;
        }).length;
        const philosophyStates = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]')).map(
          (el) => el.getAttribute('data-reveal'),
        );
        const homepageVisibleCount = document.querySelectorAll('[data-reveal="visible"]').length;
        return {
          beforePendingCount,
          beforeHomepagePendingCount,
          totalPendingAfterJump: pendingElements.length,
          pendingInViewport,
          philosophyStates,
          homepageVisibleCount,
        };
      })()`);
      return { ...jumpResult, errors: session.errors };
    },
  );

  // 4. Direct anchor navigation to /#philosophy
  const anchorNavigationCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, `${siteUrl}/#philosophy`, false);
      await session.evaluate(`(async () => {
        const section = document.querySelector('#philosophy');
        await Promise.all(
          document.getAnimations()
            .filter((anim) => section?.contains(anim.effect?.target))
            .map((anim) => anim.finished.catch(() => {})),
        );
      })()`);
      const anchorState = await session.evaluate(`(() => {
        const section = document.querySelector('#philosophy');
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        const sectionRect = section?.getBoundingClientRect();
        return {
          hash: window.location.hash,
          sectionInViewport: Boolean(sectionRect && sectionRect.top < window.innerHeight && sectionRect.bottom > 0),
          allVisible: units.every((el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none'),
          anyVisibleUnitEverPending: window.__adoraMotionProbe.revealHistory.some(
            (h) => h.value === 'pending' && h.top < h.innerHeight,
          ),
        };
      })()`);
      return { ...anchorState, errors: session.errors };
    },
  );

  // 5. Binding Erratum E-1 check: multi-entry IntersectionObserver callback batching ([staleBelowFold, currentIntersecting])
  const erratumE1BatchedEntriesCheck = await withIsolatedSession(
    browserClient,
    {
      width: 1440,
      height: 900,
      initScript: `
        (() => {
          const NativeIO = window.IntersectionObserver;
          window.IntersectionObserver = class BatchedTestIO {
            constructor(cb) {
              this._cb = cb;
              this._disconnected = false;
            }
            observe(target) {
              setTimeout(() => {
                if (this._disconnected) return;
                const staleEntry = {
                  target,
                  isIntersecting: false,
                  boundingClientRect: { top: 1400, bottom: 1600 },
                };
                const newestEntry = {
                  target,
                  isIntersecting: true,
                  boundingClientRect: { top: 320, bottom: 520 },
                };
                this._cb([staleEntry, newestEntry], this);
              }, 20);
            }
            unobserve() {}
            disconnect() {
              this._disconnected = true;
            }
          };
        })();
      `,
    },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const batchResult = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return {
          unitCount: units.length,
          allReadNewestEntryAsVisible: units.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1',
          ),
        };
      })()`);
      return { ...batchResult, errors: session.errors };
    },
  );

  const passed =
    normalScrollAndOneShot.initialBelowFold.sectionOpacity === "1" &&
    normalScrollAndOneShot.initialBelowFold.sectionTransform === "none" &&
    normalScrollAndOneShot.initialBelowFold.unitStates.length === 3 &&
    normalScrollAndOneShot.initialBelowFold.unitStates.every((u) => u.state === "pending" && u.opacity === "0") &&
    normalScrollAndOneShot.afterReveal.every(
      (u) => u.state === "visible" && u.opacity === "1" && u.transform === "none" && u.transitionDuration === "0.68s",
    ) &&
    normalScrollAndOneShot.afterReveal[0]?.transitionDelay === "0s" &&
    normalScrollAndOneShot.afterReveal[1]?.transitionDelay === "0.08s" &&
    normalScrollAndOneShot.afterReveal[2]?.transitionDelay === "0.16s" &&
    normalScrollAndOneShot.afterScrollAwayAndBack.allStillVisible &&
    normalScrollAndOneShot.afterScrollAwayAndBack.pendingTransitionsAfterReveal === 3 &&
    normalScrollAndOneShot.hydrationWarnings.length === 0 &&
    normalScrollAndOneShot.errors.length === 0 &&
    partialFoldSafety.partiallyVisibleCount >= 1 &&
    partialFoldSafety.partiallyVisibleStates.every((u) => u.state === "visible" && u.opacity === "1") &&
    !partialFoldSafety.anyPartiallyVisibleEverPending &&
    partialFoldSafety.errors.length === 0 &&
    fastScrollJumpTest.beforePendingCount === 3 &&
    fastScrollJumpTest.beforeHomepagePendingCount === 20 &&
    fastScrollJumpTest.pendingInViewport === 0 &&
    fastScrollJumpTest.totalPendingAfterJump === 0 &&
    fastScrollJumpTest.philosophyStates.every((s) => s === "visible") &&
    fastScrollJumpTest.homepageVisibleCount === 20 &&
    fastScrollJumpTest.errors.length === 0 &&
    anchorNavigationCheck.hash === "#philosophy" &&
    anchorNavigationCheck.sectionInViewport &&
    anchorNavigationCheck.allVisible &&
    !anchorNavigationCheck.anyVisibleUnitEverPending &&
    anchorNavigationCheck.errors.length === 0 &&
    erratumE1BatchedEntriesCheck.unitCount === 3 &&
    erratumE1BatchedEntriesCheck.allReadNewestEntryAsVisible &&
    erratumE1BatchedEntriesCheck.errors.length === 0;

  return {
    executed: true,
    passed,
    normalScrollAndOneShot,
    partialFoldSafety,
    fastScrollJumpTest,
    anchorNavigationCheck,
    erratumE1BatchedEntriesCheck,
  };
}

async function runFailVisibleSuite(browserClient) {
  // 1. Reduced motion at initial load
  const reducedMotionInitial = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, reducedMotion: true, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const res = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return {
          allVisibleImmediately: units.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
          everEnteredPending: window.__adoraMotionProbe.revealHistory.some((h) => h.value === 'pending'),
        };
      })()`);
      return { ...res, errors: session.errors };
    },
  );

  // 2. Reduced motion toggled after hydration while pending
  const reducedMotionToggledAfterHydration = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const pendingCountBefore = await session.evaluate(
        "document.querySelectorAll('#philosophy [data-reveal=\"pending\"]').length",
      );
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await wait(60);
      const afterToggle = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return {
          allVisible: units.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
        };
      })()`);
      return { pendingCountBefore, ...afterToggle, errors: session.errors };
    },
  );

  // 3. html[data-motion="off"] (both pre-hydration and toggled post-hydration)
  const motionOffPreHydration = await withIsolatedSession(
    browserClient,
    {
      width: 1440,
      height: 900,
      initScript: `
        ${OBSERVER_TRACKER_INIT_SCRIPT}
        const applyMotionOff = () => {
          if (document.documentElement) document.documentElement.dataset.motion = "off";
        };
        applyMotionOff();
        window.addEventListener("DOMContentLoaded", applyMotionOff, { once: true });
      `,
    },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const res = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return {
          motionAttr: document.documentElement.dataset.motion ?? null,
          allVisible: units.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
          everEnteredPending: window.__adoraMotionProbe.revealHistory.some((h) => h.value === 'pending'),
        };
      })()`);
      return { ...res, errors: session.errors };
    },
  );

  const motionOffPostHydration = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const result = await session.evaluate(`(async () => {
        const beforePending = document.querySelectorAll('#philosophy [data-reveal="pending"]').length;
        document.documentElement.dataset.motion = 'off';
        const syncCssVisible = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]')).every(
          (el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
        );
        await new Promise((r) => setTimeout(r, 30));
        const settledAttrVisible = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]')).every(
          (el) => el.getAttribute('data-reveal') === 'visible',
        );
        return { beforePending, syncCssVisible, settledAttrVisible };
      })()`);
      return { ...result, errors: session.errors };
    },
  );

  // 4. Print media (@media print) while elements are pending
  const printMediaCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const pendingBeforePrint = await session.evaluate(
        "document.querySelectorAll('#philosophy [data-reveal=\"pending\"]').length",
      );
      await session.send("Emulation.setEmulatedMedia", { media: "print" });
      const inPrint = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal="pending"]'));
        return {
          pendingUnitsChecked: units.length,
          allPrintVisible: units.every(
            (el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
        };
      })()`);
      return { pendingBeforePrint, ...inPrint, errors: session.errors };
    },
  );

  // 5. Missing IntersectionObserver fallback
  const missingIntersectionObserverCheck = await withIsolatedSession(
    browserClient,
    {
      width: 1440,
      height: 900,
      initScript: "delete window.IntersectionObserver;",
    },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const res = await session.evaluate(`(() => {
        const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
        return {
          ioType: typeof window.IntersectionObserver,
          allVisible: units.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
        };
      })()`);
      return { ...res, errors: session.errors };
    },
  );

  // 6. Binding Erratum E-4(c): Keyboard focus inside a pending element via temporary tabindex="-1" probe
  const focusWithinPendingCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const res = await session.evaluate(`(() => {
        const targetUnit = document.querySelector('#philosophy [data-reveal="pending"]');
        if (!targetUnit) return { foundPendingTarget: false };
        const opacityBefore = getComputedStyle(targetUnit).opacity;
        const probe = document.createElement('span');
        probe.setAttribute('tabindex', '-1');
        probe.setAttribute('data-testid', 'temp-reveal-focus-probe');
        targetUnit.appendChild(probe);
        probe.focus({ preventScroll: true });

        const duringFocus = {
          activeIsProbe: document.activeElement === probe,
          state: targetUnit.getAttribute('data-reveal'),
          opacity: getComputedStyle(targetUnit).opacity,
          transform: getComputedStyle(targetUnit).transform,
          transitionDuration: getComputedStyle(targetUnit).transitionDuration,
        };

        probe.blur();
        probe.remove();

        const afterBlurAndCleanup = {
          state: targetUnit.getAttribute('data-reveal'),
          opacity: getComputedStyle(targetUnit).opacity,
          transform: getComputedStyle(targetUnit).transform,
        };

        return {
          foundPendingTarget: true,
          opacityBefore,
          duringFocus,
          afterBlurAndCleanup,
        };
      })()`);
      return { ...res, errors: session.errors };
    },
  );

  // 7. Binding Erratum E-2: CSS stagger cap (270ms desktop / 180ms mobile) and stackOnMobile (0ms on <48rem despite inline --reveal-delay)
  const erratumE2Desktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      return session.evaluate(`(() => {
        const probeCap = document.createElement('div');
        probeCap.setAttribute('data-reveal', 'visible');
        probeCap.style.setProperty('--reveal-delay', '600ms');

        const probeStack = document.createElement('div');
        probeStack.setAttribute('data-reveal', 'visible');
        probeStack.setAttribute('data-reveal-stack', '');
        probeStack.style.setProperty('--reveal-delay', '180ms');

        document.body.append(probeCap, probeStack);
        const capDelay = getComputedStyle(probeCap).transitionDelay;
        const stackDelayOnDesktop = getComputedStyle(probeStack).transitionDelay;
        probeCap.remove();
        probeStack.remove();
        return { capDelay, stackDelayOnDesktop };
      })()`);
    },
  );

  const erratumE2Mobile = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, mobile: true },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      return session.evaluate(`(() => {
        const probeCap = document.createElement('div');
        probeCap.setAttribute('data-reveal', 'visible');
        probeCap.style.setProperty('--reveal-delay', '600ms');

        const probeStack = document.createElement('div');
        probeStack.setAttribute('data-reveal', 'visible');
        probeStack.setAttribute('data-reveal-stack', '');
        probeStack.style.setProperty('--reveal-delay', '180ms');

        document.body.append(probeCap, probeStack);
        const capDelayOnMobile = getComputedStyle(probeCap).transitionDelay;
        const stackDelayOnMobile = getComputedStyle(probeStack).transitionDelay;
        probeCap.remove();
        probeStack.remove();
        return { capDelayOnMobile, stackDelayOnMobile };
      })()`);
    },
  );

  const passed =
    reducedMotionInitial.allVisibleImmediately &&
    !reducedMotionInitial.everEnteredPending &&
    reducedMotionInitial.errors.length === 0 &&
    reducedMotionToggledAfterHydration.pendingCountBefore === 3 &&
    reducedMotionToggledAfterHydration.allVisible &&
    reducedMotionToggledAfterHydration.errors.length === 0 &&
    motionOffPreHydration.motionAttr === "off" &&
    motionOffPreHydration.allVisible &&
    !motionOffPreHydration.everEnteredPending &&
    motionOffPreHydration.errors.length === 0 &&
    motionOffPostHydration.beforePending === 3 &&
    motionOffPostHydration.syncCssVisible &&
    motionOffPostHydration.settledAttrVisible &&
    motionOffPostHydration.errors.length === 0 &&
    printMediaCheck.pendingBeforePrint === 3 &&
    printMediaCheck.pendingUnitsChecked === 3 &&
    printMediaCheck.allPrintVisible &&
    printMediaCheck.errors.length === 0 &&
    missingIntersectionObserverCheck.ioType === "undefined" &&
    missingIntersectionObserverCheck.allVisible &&
    missingIntersectionObserverCheck.errors.length === 0 &&
    focusWithinPendingCheck.foundPendingTarget &&
    focusWithinPendingCheck.opacityBefore === "0" &&
    focusWithinPendingCheck.duringFocus.activeIsProbe &&
    focusWithinPendingCheck.duringFocus.state === "visible" &&
    focusWithinPendingCheck.duringFocus.opacity === "1" &&
    focusWithinPendingCheck.duringFocus.transform === "none" &&
    focusWithinPendingCheck.duringFocus.transitionDuration === "0s" &&
    focusWithinPendingCheck.afterBlurAndCleanup.state === "visible" &&
    focusWithinPendingCheck.afterBlurAndCleanup.opacity === "1" &&
    focusWithinPendingCheck.afterBlurAndCleanup.transform === "none" &&
    focusWithinPendingCheck.errors.length === 0 &&
    erratumE2Desktop.capDelay === "0.27s" &&
    erratumE2Desktop.stackDelayOnDesktop === "0.18s" &&
    erratumE2Mobile.capDelayOnMobile === "0.18s" &&
    erratumE2Mobile.stackDelayOnMobile === "0s";

  return {
    executed: true,
    passed,
    reducedMotionInitial,
    reducedMotionToggledAfterHydration,
    motionOffPreHydration,
    motionOffPostHydration,
    printMediaCheck,
    missingIntersectionObserverCheck,
    focusWithinPendingCheck,
    erratumE2StaggerAndStack: {
      desktop: erratumE2Desktop,
      mobile: erratumE2Mobile,
    },
  };
}

async function runLifecycleAndActivitySuite(browserClient) {
  // Case 1: Revealed on / -> navigate to /destinations -> history.back() -> stays visible, 0 active observers/listeners
  const activityPostRevealCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const beforeScrollStats = await session.evaluate(`(() => {
        const observers = Array.from(window.__adoraMotionProbe.activeRevealObservers);
        return {
          philosophyActiveObservers: observers.filter((o) => o.__sectionId === 'philosophy').length,
          activeObservers: observers.length,
          scrollListeners: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
        };
      })()`);

      await session.evaluate(`(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        document.documentElement.style.scrollBehavior = 'auto';
        const pageHeight = document.documentElement.scrollHeight;
        for (let y = 0; y <= pageHeight; y += Math.max(window.innerHeight * 0.75, 420)) {
          window.scrollTo(0, y);
          await delay(80);
        }
        window.scrollTo(0, pageHeight);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((anim) => anim.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((anim) => anim.finished.catch(() => {})),
        );
        window.scrollTo(0, 0);
        await delay(80);
      })()`);

      const afterRevealStats = await session.evaluate(`({
        activeObservers: window.__adoraMotionProbe.activeRevealObservers.size,
        scrollListeners: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
        resizeListeners: window.__adoraMotionProbe.activeWindowListeners.get('resize')?.size ?? 0,
      })`);

      // Client-side navigation to /destinations and Back under Next.js 16 <Activity>
      await session.evaluate(`(async () => {
        const destLink = Array.from(document.querySelectorAll('header a[href="/destinations"]')).find((el) => el.checkVisibility());
        destLink?.click();
        for (let i = 0; i < 40; i += 1) {
          if (window.location.pathname === '/destinations' && document.querySelector('[data-testid="destination-results"]')) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        window.history.back();
        for (let i = 0; i < 40; i += 1) {
          const section = document.querySelector('#philosophy');
          if (window.location.pathname === '/' && section && section.checkVisibility()) break;
          await new Promise((r) => setTimeout(r, 100));
        }
      })()`);

      const afterActivityBack = await session.evaluate(`(() => {
        const visibleUnits = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]')).filter((el) => el.checkVisibility());
        const visibleHomepageUnits = Array.from(document.querySelectorAll('[data-reveal-variant]')).filter((el) => el.checkVisibility());
        return {
          pathname: window.location.pathname,
          visibleUnitCount: visibleUnits.length,
          visibleHomepageUnitCount: visibleHomepageUnits.length,
          allRemainVisible: visibleHomepageUnits.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
          activeObservers: window.__adoraMotionProbe.activeRevealObservers.size,
          scrollListeners: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
        };
      })()`);

      return {
        beforeScrollStats,
        afterRevealStats,
        afterActivityBack,
        errors: session.errors,
      };
    },
  );

  // Case 2: Pending on / (unscrolled) -> navigate to /destinations (Activity hides / & cleans up all / observers) -> Back -> scroll reveals cleanly
  const activityPendingRestoreCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const initialCounts = await session.evaluate(`({
        philosophyPending: document.querySelectorAll('#philosophy [data-reveal="pending"]').length,
        homepagePending: document.querySelectorAll('[data-reveal="pending"]').length,
      })`);

      const whileHiddenOnDestinations = await session.evaluate(`(async () => {
        const destLink = Array.from(document.querySelectorAll('header a[href="/destinations"]')).find((el) => el.checkVisibility());
        destLink?.click();
        for (let i = 0; i < 40; i += 1) {
          if (window.location.pathname === '/destinations' && document.querySelector('[data-testid="destination-results"]')) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        const activeList = Array.from(window.__adoraMotionProbe.activeRevealObservers);
        const hiddenTreeObservers = activeList.filter((o) => !o.__revealTarget?.checkVisibility()).length;
        const visibleDestinationsFooterObservers = activeList.filter((o) => o.__revealTarget?.checkVisibility()).length;
        return {
          pathname: window.location.pathname,
          hiddenHomepageObserversWhileHidden: hiddenTreeObservers,
          visibleDestinationsFooterObservers,
          scrollListenersWhileOnDestinations: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
        };
      })()`);

      const afterBackAndScroll = await session.evaluate(`(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        window.history.back();
        for (let i = 0; i < 40; i += 1) {
          const section = document.querySelector('#philosophy');
          if (window.location.pathname === '/' && section && section.checkVisibility()) break;
          await delay(100);
        }
        await delay(120);
        document.documentElement.style.scrollBehavior = 'auto';
        const pageHeight = document.documentElement.scrollHeight;
        for (let y = 0; y <= pageHeight; y += Math.max(window.innerHeight * 0.75, 420)) {
          window.scrollTo(0, y);
          await delay(80);
        }
        window.scrollTo(0, pageHeight);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((anim) => anim.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((anim) => anim.finished.catch(() => {})),
        );
        const section = Array.from(document.querySelectorAll('#philosophy')).find((el) => el.checkVisibility());
        const visibleUnits = Array.from(section.querySelectorAll('[data-reveal-variant]'));
        const visibleHomepageUnits = Array.from(document.querySelectorAll('[data-reveal-variant]')).filter((el) => el.checkVisibility());
        return {
          pathname: window.location.pathname,
          unitCount: visibleUnits.length,
          homepageUnitCount: visibleHomepageUnits.length,
          allRevealedAfterRestore: visibleHomepageUnits.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
          activeObserversAfterReveal: window.__adoraMotionProbe.activeRevealObservers.size,
          scrollListenersAfterReveal: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
        };
      })()`);

      return {
        initialPendingCount: initialCounts.philosophyPending,
        initialHomepagePendingCount: initialCounts.homepagePending,
        whileHiddenOnDestinations,
        afterBackAndScroll,
        errors: session.errors,
      };
    },
  );

  // Case 3: Optional React 19 Development Strict Mode double-effect check
  let strictModeDevCheck = {
    executed: false,
    passed: null,
    reason:
      "ADORA_STRICT_DEV_URL not supplied; pass ADORA_STRICT_DEV_URL=http://127.0.0.1:<dev-port> to execute against next dev React Strict Mode.",
  };

  if (strictDevUrl) {
    strictModeDevCheck = await withIsolatedSession(
      browserClient,
      { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
      async (session) => {
        await navigateAndWaitReady(session, strictDevUrl, true);
        await wait(600);
        const beforeScroll = await session.evaluate(`({
          ioConstructed: window.__adoraMotionProbe.revealIoConstructed,
          activeObserversWhilePending: window.__adoraMotionProbe.activeRevealObservers.size,
          philosophyPendingCount: document.querySelectorAll('#philosophy [data-reveal="pending"]').length,
          homepagePendingCount: document.querySelectorAll('[data-reveal="pending"]').length,
        })`);

        await session.evaluate(`(async () => {
          const delay = (ms) => new Promise((r) => setTimeout(r, ms));
          document.documentElement.style.scrollBehavior = 'auto';
          const pageHeight = document.documentElement.scrollHeight;
          for (let y = 0; y <= pageHeight; y += Math.max(window.innerHeight * 0.75, 420)) {
            window.scrollTo(0, y);
            await delay(80);
          }
          window.scrollTo(0, pageHeight);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await Promise.all(
            document.getAnimations()
              .filter((anim) => anim.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((anim) => anim.finished.catch(() => {})),
          );
        })()`);

        const afterScroll = await session.evaluate(`(() => {
          const units = Array.from(document.querySelectorAll('[data-reveal-variant]'));
          return {
            pendingRemaining: document.querySelectorAll('[data-reveal="pending"]').length,
            allSettledVisible: units.every(
              (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
            ),
            activeObserversAfterReveal: window.__adoraMotionProbe.activeRevealObservers.size,
            scrollListenersAfterReveal: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
          };
        })()`);

        const devPassed =
          beforeScroll.ioConstructed >= 40 &&
          beforeScroll.activeObserversWhilePending === 20 &&
          beforeScroll.philosophyPendingCount === 3 &&
          beforeScroll.homepagePendingCount === 20 &&
          afterScroll.pendingRemaining === 0 &&
          afterScroll.allSettledVisible &&
          afterScroll.activeObserversAfterReveal === 0 &&
          afterScroll.scrollListenersAfterReveal === 0 &&
          session.hydrationWarnings.length === 0 &&
          session.errors.length === 0;

        return {
          executed: true,
          passed: devPassed,
          strictDevUrl,
          beforeScroll,
          afterScroll,
          hydrationWarnings: session.hydrationWarnings,
          errors: session.errors,
        };
      },
    );
  }

  const prodLifecyclePassed =
    activityPostRevealCheck.beforeScrollStats.philosophyActiveObservers === 3 &&
    activityPostRevealCheck.beforeScrollStats.activeObservers === 20 &&
    activityPostRevealCheck.beforeScrollStats.scrollListeners === 20 &&
    activityPostRevealCheck.afterRevealStats.activeObservers === 0 &&
    activityPostRevealCheck.afterRevealStats.scrollListeners === 0 &&
    activityPostRevealCheck.afterRevealStats.resizeListeners === 0 &&
    activityPostRevealCheck.afterActivityBack.pathname === "/" &&
    activityPostRevealCheck.afterActivityBack.visibleUnitCount === 3 &&
    activityPostRevealCheck.afterActivityBack.visibleHomepageUnitCount === 20 &&
    activityPostRevealCheck.afterActivityBack.allRemainVisible &&
    activityPostRevealCheck.afterActivityBack.activeObservers === 0 &&
    activityPostRevealCheck.afterActivityBack.scrollListeners === 0 &&
    activityPostRevealCheck.errors.length === 0 &&
    activityPendingRestoreCheck.initialPendingCount === 3 &&
    activityPendingRestoreCheck.initialHomepagePendingCount === 20 &&
    activityPendingRestoreCheck.whileHiddenOnDestinations.pathname === "/destinations" &&
    activityPendingRestoreCheck.whileHiddenOnDestinations.hiddenHomepageObserversWhileHidden === 0 &&
    activityPendingRestoreCheck.whileHiddenOnDestinations.visibleDestinationsFooterObservers === 1 &&
    activityPendingRestoreCheck.whileHiddenOnDestinations.scrollListenersWhileOnDestinations === 1 &&
    activityPendingRestoreCheck.afterBackAndScroll.pathname === "/" &&
    activityPendingRestoreCheck.afterBackAndScroll.unitCount === 3 &&
    activityPendingRestoreCheck.afterBackAndScroll.homepageUnitCount === 20 &&
    activityPendingRestoreCheck.afterBackAndScroll.allRevealedAfterRestore &&
    activityPendingRestoreCheck.afterBackAndScroll.activeObserversAfterReveal === 0 &&
    activityPendingRestoreCheck.afterBackAndScroll.scrollListenersAfterReveal === 0 &&
    activityPendingRestoreCheck.errors.length === 0 &&
    (!strictModeDevCheck.executed || strictModeDevCheck.passed === true);

  return {
    executed: true,
    passed: prodLifecyclePassed,
    activityPostRevealCheck,
    activityPendingRestoreCheck,
    strictModeDevCheck,
  };
}

async function runResponsiveAndCssSuite(browserClient) {
  const viewportResults = [];

  for (const vp of configuredViewports) {
    const vpResult = await withIsolatedSession(
      browserClient,
      {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.width < 768 ? 2 : 1,
        mobile: vp.width < 768,
        touch: vp.width < 768,
        initScript: `
          window.__adoraCls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__adoraCls += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        `,
      },
      async (session) => {
        await navigateAndWaitReady(session, siteUrl, true);
        await session.evaluate("document.fonts.ready.then(() => true)");

        const initialHeroAndOverflow = await session.evaluate(`(() => {
          const heroImg = document.querySelector('main img');
          const h1 = document.querySelector('h1');
          return {
            width: window.innerWidth,
            scrollWidthBeforeScroll: document.documentElement.scrollWidth,
            heroImgOpacity: heroImg ? getComputedStyle(heroImg).opacity : null,
            h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
          };
        })()`);

        const postScroll = await session.evaluate(`(async () => {
          const delay = (ms) => new Promise((r) => setTimeout(r, ms));
          document.documentElement.style.scrollBehavior = 'auto';
          const pageHeight = document.documentElement.scrollHeight;
          for (let y = 0; y < pageHeight; y += Math.max(window.innerHeight * 0.75, 420)) {
            window.scrollTo(0, y);
            await delay(140);
          }
          await Promise.all(
            document.getAnimations()
              .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          );
          window.scrollTo(0, 0);
          await delay(120);

          const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
          const allHomepageUnits = Array.from(document.querySelectorAll('[data-reveal-variant]'));
          const sampleBubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
          const nonAutoWillChange = Array.from(document.querySelectorAll('*'))
            .filter((el) => getComputedStyle(el).willChange !== 'auto').length;
          const editorialLink = document.querySelector('.editorial-link');
          const editorialTransition = editorialLink ? getComputedStyle(editorialLink).transitionDuration : null;

          return {
            scrollWidthAfterScroll: document.documentElement.scrollWidth,
            pendingRemaining: document.querySelectorAll('[data-reveal="pending"]').length,
            philosophySettled: units.length === 3 && units.every(
              (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
            ),
            allHomepageSettled:
              allHomepageUnits.length === 20 &&
              allHomepageUnits.every(
                (el) =>
                  el.getAttribute('data-reveal') === 'visible' &&
                  getComputedStyle(el).opacity === '1' &&
                  getComputedStyle(el).transform === 'none',
              ) &&
              sampleBubbles.length === 2 &&
              sampleBubbles.every(
                (el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
              ),
            cls: Math.round(window.__adoraCls * 100000) / 100000,
            nonAutoWillChange,
            editorialTransition,
          };
        })()`);

        return {
          viewport: `${vp.width}x${vp.height}`,
          ...initialHeroAndOverflow,
          ...postScroll,
          errors: session.errors,
        };
      },
    );
    viewportResults.push(vpResult);
  }

  // Fine-pointer desktop hover zoom check (1440x900)
  const desktopHoverZoomCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, mobile: false, touch: false },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const box = await session.evaluate(`(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        const container = document.querySelector('#destinations .image-reveal');
        container.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((anim) => container.contains(anim.effect?.target))
            .map((anim) => anim.finished.catch(() => {})),
        );
        const img = container.querySelector('img');
        const rect = container.getBoundingClientRect();
        return {
          finePointerMatches: matchMedia('(hover: hover) and (pointer: fine)').matches,
          beforeTransform: getComputedStyle(img).transform,
          transitionDuration: getComputedStyle(img).transitionDuration,
          cx: Math.round(rect.left + rect.width / 2),
          cy: Math.round(rect.top + rect.height / 2),
        };
      })()`);

      await session.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: box.cx,
        y: box.cy,
      });
      await wait(300);

      const duringHover = await session.evaluate(`(() => {
        const container = document.querySelector('#destinations .image-reveal');
        const img = container.querySelector('img');
        const transform = getComputedStyle(img).transform;
        const match = transform.match(/^matrix\\(([^,]+),/);
        const scaleX = match ? Number(match[1]) : 1;
        return {
          hoverMatched: container.matches(':hover'),
          transform,
          scaleX: Math.round(scaleX * 10000) / 10000,
        };
      })()`);

      return { ...box, duringHover, errors: session.errors };
    },
  );

  // Touch-emulation coarse-pointer hover guard check (390x844, INV-15 P0 & E-3c)
  const mobileTouchHoverGuardCheck = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const box = await session.evaluate(`(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        const container = document.querySelector('#destinations .image-reveal');
        container.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((anim) => container.contains(anim.effect?.target))
            .map((anim) => anim.finished.catch(() => {})),
        );
        const img = container.querySelector('img');
        const rect = container.getBoundingClientRect();
        return {
          finePointerMatches: matchMedia('(hover: hover) and (pointer: fine)').matches,
          hoverNoneMatches: matchMedia('(hover: none)').matches,
          transitionDurationRetained: getComputedStyle(img).transitionDuration,
          cx: Math.round(rect.left + rect.width / 2),
          cy: Math.round(rect.top + rect.height / 2),
        };
      })()`);

      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box.cx, y: box.cy, radiusX: 4, radiusY: 4, force: 1 }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.cx, y: box.cy });
      await wait(250);

      const afterTap = await session.evaluate(`(() => {
        const img = document.querySelector('#destinations .image-reveal img');
        return {
          transformAfterTap: getComputedStyle(img).transform,
        };
      })()`);

      return { ...box, ...afterTap, errors: session.errors };
    },
  );

  // Focus outline instant check & unrelated routes zero-reveal hygiene check
  const focusAndUnrelatedRoutesCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, `${siteUrl}/ai-planner`, false);
      const plannerCheck = await session.evaluate(`(() => {
        const textarea = document.querySelector('#planner-prompt');
        textarea?.focus();
        const outlineTransition = textarea
          ? getComputedStyle(textarea).transitionProperty
          : null;
        return {
          revealCountOnPlanner: document.querySelectorAll('[data-reveal], [data-reveal-variant]').length,
          activeAnimationsOnPlanner: document.getAnimations().length,
          nonAutoWillChange: Array.from(document.querySelectorAll('*')).filter(
            (el) => getComputedStyle(el).willChange !== 'auto',
          ).length,
          outlineNotAnimated: !outlineTransition || !outlineTransition.includes('outline'),
        };
      })()`);

      await navigateAndWaitReady(session, `${siteUrl}/trips/da-lat-3-ngay`, false);
      const tripDetailCheck = await session.evaluate(`(() => ({
        revealCountOnTripDetail: document.querySelectorAll('[data-reveal], [data-reveal-variant]').length,
        activeAnimationsOnTripDetail: document.getAnimations().length,
      }))()`);

      return { plannerCheck, tripDetailCheck, errors: session.errors };
    },
  );

  const allViewportsPassed = viewportResults.every(
    (v) =>
      v.scrollWidthBeforeScroll === v.width &&
      v.scrollWidthAfterScroll === v.width &&
      v.heroImgOpacity === "1" &&
      v.h1Opacity === "1" &&
      v.pendingRemaining === 0 &&
      v.philosophySettled &&
      v.allHomepageSettled &&
      v.cls <= 0.01 &&
      v.nonAutoWillChange === 0 &&
      v.editorialTransition?.includes("0.42s") &&
      v.errors.length === 0,
  );

  const passed =
    allViewportsPassed &&
    desktopHoverZoomCheck.finePointerMatches &&
    desktopHoverZoomCheck.beforeTransform === "none" &&
    desktopHoverZoomCheck.transitionDuration === "1.2s" &&
    desktopHoverZoomCheck.duringHover.hoverMatched &&
    desktopHoverZoomCheck.duringHover.scaleX > 1.005 &&
    desktopHoverZoomCheck.errors.length === 0 &&
    !mobileTouchHoverGuardCheck.finePointerMatches &&
    mobileTouchHoverGuardCheck.hoverNoneMatches &&
    mobileTouchHoverGuardCheck.transitionDurationRetained === "1.2s" &&
    mobileTouchHoverGuardCheck.transformAfterTap === "none" &&
    mobileTouchHoverGuardCheck.errors.length === 0 &&
    focusAndUnrelatedRoutesCheck.plannerCheck.revealCountOnPlanner === 0 &&
    focusAndUnrelatedRoutesCheck.plannerCheck.activeAnimationsOnPlanner === 0 &&
    focusAndUnrelatedRoutesCheck.plannerCheck.nonAutoWillChange === 0 &&
    focusAndUnrelatedRoutesCheck.plannerCheck.outlineNotAnimated &&
    focusAndUnrelatedRoutesCheck.tripDetailCheck.revealCountOnTripDetail === 0 &&
    focusAndUnrelatedRoutesCheck.tripDetailCheck.activeAnimationsOnTripDetail === 0 &&
    focusAndUnrelatedRoutesCheck.errors.length === 0;

  return {
    executed: true,
    passed,
    viewportResults,
    desktopHoverZoomCheck,
    mobileTouchHoverGuardCheck,
    focusAndUnrelatedRoutesCheck,
  };
}

const HERO_TIMELINE_INIT_SCRIPT = `
(() => {
  const parseMatrix = (transform) => {
    if (!transform || transform === "none") return { scaleX: 1, scaleY: 1, tx: 0, ty: 0 };
    const m2d = transform.match(/^matrix\\(([^)]+)\\)$/);
    if (m2d) {
      const [a, , , d, tx, ty] = m2d[1].split(",").map((v) => Number(v.trim()));
      return {
        scaleX: Math.round(a * 10000) / 10000,
        scaleY: Math.round(d * 10000) / 10000,
        tx: Math.round(tx * 100) / 100,
        ty: Math.round(ty * 100) / 100,
      };
    }
    return { scaleX: 1, scaleY: 1, tx: 0, ty: 0 };
  };

  const state = {
    startedAt: null,
    firstPaint: null,
    frames: [],
    done: false,
  };
  window.__adoraHeroTimeline = state;

  const sample = (now) => {
    const heroImg = document.querySelector('img[data-image-settle]');
    const h1 = document.querySelector('h1');
    if (!heroImg || !h1 || !h1.checkVisibility()) {
      requestAnimationFrame(sample);
      return;
    }

    if (state.startedAt === null) {
      state.startedAt = now;
      const eyebrow = h1.previousElementSibling;
      const leadCopy = h1.nextElementSibling;
      const primaryCta = document.querySelector('.hero-primary-cta');
      const secondaryCta = primaryCta?.nextElementSibling ?? null;
      const scrollLine = document.querySelector('.hero-scroll-line');
      const heroSection = heroImg.closest('section');

      const imgStyle = getComputedStyle(heroImg);
      const eyebrowStyle = eyebrow ? getComputedStyle(eyebrow) : null;
      const h1Style = getComputedStyle(h1);
      const leadStyle = leadCopy ? getComputedStyle(leadCopy) : null;
      const primaryStyle = primaryCta ? getComputedStyle(primaryCta) : null;
      const secondaryStyle = secondaryCta ? getComputedStyle(secondaryCta) : null;
      const scrollStyle = scrollLine ? getComputedStyle(scrollLine) : null;

      state.firstPaint = {
        tMs: 0,
        sectionOverflowX: heroSection ? getComputedStyle(heroSection).overflowX : null,
        heroImg: {
          opacity: imgStyle.opacity,
          animationName: imgStyle.animationName,
          animationDuration: imgStyle.animationDuration,
          animationTimingFunction: imgStyle.animationTimingFunction,
          animationFillMode: imgStyle.animationFillMode,
          ...parseMatrix(imgStyle.transform),
        },
        eyebrow: eyebrowStyle
          ? {
              opacity: eyebrowStyle.opacity,
              animationName: eyebrowStyle.animationName,
              animationDuration: eyebrowStyle.animationDuration,
              animationDelay: eyebrowStyle.animationDelay,
              animationFillMode: eyebrowStyle.animationFillMode,
              ...parseMatrix(eyebrowStyle.transform),
            }
          : null,
        h1: {
          opacity: h1Style.opacity,
          animationName: h1Style.animationName,
          animationDuration: h1Style.animationDuration,
          animationDelay: h1Style.animationDelay,
          animationFillMode: h1Style.animationFillMode,
          childElementTags: Array.from(h1.children).map((c) => c.tagName),
          ...parseMatrix(h1Style.transform),
        },
        leadCopy: leadStyle
          ? {
              opacity: Number(leadStyle.opacity),
              animationName: leadStyle.animationName,
              animationDuration: leadStyle.animationDuration,
              animationDelay: leadStyle.animationDelay,
              animationFillMode: leadStyle.animationFillMode,
            }
          : null,
        primaryCta: primaryStyle
          ? {
              opacity: Number(primaryStyle.opacity),
              animationName: primaryStyle.animationName,
              animationDuration: primaryStyle.animationDuration,
              animationDelay: primaryStyle.animationDelay,
              animationFillMode: primaryStyle.animationFillMode,
            }
          : null,
        secondaryCta: secondaryStyle
          ? {
              opacity: Number(secondaryStyle.opacity),
              animationName: secondaryStyle.animationName,
              animationDuration: secondaryStyle.animationDuration,
              animationDelay: secondaryStyle.animationDelay,
              animationFillMode: secondaryStyle.animationFillMode,
            }
          : null,
        scrollLine: scrollStyle
          ? {
              animationName: scrollStyle.animationName,
              animationDuration: scrollStyle.animationDuration,
              animationIterationCount: scrollStyle.animationIterationCount,
              animationFillMode: scrollStyle.animationFillMode,
            }
          : null,
      };
    }

    const elapsed = Math.round((now - state.startedAt) * 100) / 100;
    const prevElapsed = state.frames.length > 0 ? state.frames[state.frames.length - 1].tMs : elapsed;
    const dtMs = Math.round((elapsed - prevElapsed) * 100) / 100;

    const eyebrow = h1.previousElementSibling;
    const leadCopy = h1.nextElementSibling;
    const primaryCta = document.querySelector('.hero-primary-cta');
    const secondaryCta = primaryCta?.nextElementSibling ?? null;
    const scrollLine = document.querySelector('.hero-scroll-line');

    const imgStyle = getComputedStyle(heroImg);
    const h1Style = getComputedStyle(h1);
    const leadStyle = leadCopy ? getComputedStyle(leadCopy) : null;
    const primaryStyle = primaryCta ? getComputedStyle(primaryCta) : null;
    const secondaryStyle = secondaryCta ? getComputedStyle(secondaryCta) : null;
    const scrollStyle = scrollLine ? getComputedStyle(scrollLine) : null;
    const scrollRect = scrollLine ? scrollLine.getBoundingClientRect() : null;

    state.frames.push({
      tMs: elapsed,
      dtMs,
      imgScale: parseMatrix(imgStyle.transform).scaleX,
      imgOpacity: Number(imgStyle.opacity),
      eyebrowOpacity: eyebrow ? Number(getComputedStyle(eyebrow).opacity) : null,
      h1Opacity: Number(h1Style.opacity),
      h1Ty: parseMatrix(h1Style.transform).ty,
      leadOpacity: leadStyle ? Math.round(Number(leadStyle.opacity) * 1000) / 1000 : null,
      primaryOpacity: primaryStyle ? Math.round(Number(primaryStyle.opacity) * 1000) / 1000 : null,
      secondaryOpacity: secondaryStyle ? Math.round(Number(secondaryStyle.opacity) * 1000) / 1000 : null,
      scrollOpacity: scrollStyle ? Math.round(Number(scrollStyle.opacity) * 1000) / 1000 : null,
      scrollScaleY: scrollStyle ? parseMatrix(scrollStyle.transform).scaleY : null,
      scrollHeightPx: scrollRect ? Math.round(scrollRect.height * 100) / 100 : null,
      scrollActiveAnims: scrollLine ? scrollLine.getAnimations().length : 0,
      heroActiveAnims: document.getAnimations().length,
    });

    if (elapsed < 3650) {
      requestAnimationFrame(sample);
    } else {
      state.done = true;
    }
  };

  requestAnimationFrame(sample);
})();
`;

async function runPackageBHomepageSuite(browserClient) {
  // 1. Hero opening & scroll-line timeline at Desktop (1440x900) and Mobile (390x844)
  async function measureHeroOpening(width, height, mobile) {
    return withIsolatedSession(
      browserClient,
      {
        width,
        height,
        deviceScaleFactor: mobile ? 2 : 1,
        mobile,
        touch: mobile,
        initScript: HERO_TIMELINE_INIT_SCRIPT,
      },
      async (session) => {
        await navigateAndWaitReady(session, siteUrl, false);
        await session.evaluate(`(async () => {
          for (let i = 0; i < 60; i += 1) {
            if (window.__adoraHeroTimeline?.done) break;
            await new Promise((r) => setTimeout(r, 100));
          }
        })()`);

        const report = await session.evaluate(`(() => {
          const tl = window.__adoraHeroTimeline;
          const frames = tl.frames;
          const heroSettleFrames = frames.filter((f) => f.tMs > 0 && f.tMs <= 1000);
          const sortedDts = heroSettleFrames.map((f) => f.dtMs).sort((a, b) => a - b);
          const medianDtMs = sortedDts.length > 0 ? sortedDts[Math.floor(sortedDts.length / 2)] : 0;
          const p95DtMs = sortedDts.length > 0 ? sortedDts[Math.min(sortedDts.length - 1, Math.floor(sortedDts.length * 0.95))] : 0;
          const severeDropsOver50ms = heroSettleFrames.filter((f) => f.dtMs > 50).length;

          const midScrollSample = frames.find((f) => f.tMs >= 1500 && f.tMs <= 2100) ?? null;
          const nearEndSample = [...frames].reverse().find((f) => f.tMs <= 3290 && f.scrollActiveAnims > 0) ?? null;
          const settledSample = frames[frames.length - 1] ?? null;

          const heroImg = document.querySelector('img[data-image-settle]');
          const h1 = document.querySelector('h1');
          const primaryCta = document.querySelector('.hero-primary-cta');
          const secondaryCta = primaryCta?.nextElementSibling ?? null;
          const scrollLine = document.querySelector('.hero-scroll-line');

          const settledDom = {
            heroImgOpacity: heroImg ? getComputedStyle(heroImg).opacity : null,
            heroImgTransform: heroImg ? getComputedStyle(heroImg).transform : null,
            heroImgWillChange: heroImg ? getComputedStyle(heroImg).willChange : null,
            heroImgFetchPriority: heroImg?.getAttribute('fetchpriority') ?? null,
            h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
            h1Transform: h1 ? getComputedStyle(h1).transform : null,
            primaryCtaOpacity: primaryCta ? getComputedStyle(primaryCta).opacity : null,
            primaryCtaTransform: primaryCta ? getComputedStyle(primaryCta).transform : null,
            secondaryCtaOpacity: secondaryCta ? getComputedStyle(secondaryCta).opacity : null,
            secondaryCtaTransform: secondaryCta ? getComputedStyle(secondaryCta).transform : null,
            scrollLineOpacity: scrollLine ? getComputedStyle(scrollLine).opacity : null,
            scrollLineTransform: scrollLine ? getComputedStyle(scrollLine).transform : null,
            scrollLineActiveAnims: scrollLine ? scrollLine.getAnimations().length : -1,
            totalActiveAnimsAfterSettle: document.getAnimations().length,
          };

          return {
            firstPaint: tl.firstPaint,
            frameStats: {
              totalFrames: frames.length,
              heroSettleFrameCount: heroSettleFrames.length,
              medianDtMs,
              p95DtMs,
              severeDropsOver50ms,
            },
            midScrollSample,
            nearEndSample,
            settledSample,
            settledDom,
            sampledTimeline: frames.filter((_, idx) => idx === 0 || idx === frames.length - 1 || idx % 8 === 0),
          };
        })()`);

        return { ...report, errors: session.errors, hydrationWarnings: session.hydrationWarnings };
      },
    );
  }

  const heroDesktop = await measureHeroOpening(1440, 900, false);
  const heroMobile = await measureHeroOpening(390, 844, true);

  // 2. Hero CTA clickability during entrance, keyboard :focus-visible settle, and E-6 Server Component Activity restore
  const heroInteractionAndE6 = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await session.send("Page.navigate", { url: siteUrl });
      for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
          const ready = await session.evaluate(
            "Boolean(document.querySelector('.hero-primary-cta')?.checkVisibility())",
          );
          if (ready) break;
        } catch {
          // Document still committing.
        }
        await wait(30);
      }

      // Verify keyboard focus on primary CTA during entrance settles animation and shows focus outline
      await session.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
      await session.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });

      const focusCheck = await session.evaluate(`(() => {
        const primaryCta = document.querySelector('.hero-primary-cta');
        primaryCta?.focus();
        const s = primaryCta ? getComputedStyle(primaryCta) : null;
        const rect = primaryCta?.getBoundingClientRect();
        const heroSection = primaryCta?.closest('section');
        const hasClientLatchAttr = heroSection
          ? Array.from(heroSection.querySelectorAll('*')).some((el) =>
              Array.from(el.attributes).some((a) => a.name.includes('latch') || a.name.includes('replayed')),
            )
          : false;
        return {
          activeIsCta: document.activeElement === primaryCta,
          opacityOnFocus: s?.opacity ?? null,
          transformOnFocus: s?.transform ?? null,
          outlineStyle: s?.outlineStyle ?? null,
          hasClientLatchAttr,
          cx: rect ? Math.round(rect.left + rect.width / 2) : 200,
          cy: rect ? Math.round(rect.top + rect.height / 2) : 600,
        };
      })()`);

      // Click primary CTA during entrance via trusted CDP mouse input (safe across both MPA and SPA navigation)
      await session.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: focusCheck.cx,
        y: focusCheck.cy,
        button: "left",
        clickCount: 1,
      });
      await session.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: focusCheck.cx,
        y: focusCheck.cy,
        button: "left",
        clickCount: 1,
      });

      let earlyClickArrived = false;
      for (let i = 0; i < 50; i += 1) {
        try {
          const onPlanner = await session.evaluate(
            "window.location.pathname === '/ai-planner' && Boolean(document.querySelector('#planner-prompt'))",
          );
          if (onPlanner) {
            earlyClickArrived = true;
            break;
          }
        } catch {
          // Transient context swap if click fired before React hydration (native MPA anchor navigation).
        }
        await wait(80);
      }

      // Deterministic E-6 hydrated Next.js <Activity> SPA forward + Back restore check
      await navigateAndWaitReady(session, siteUrl, true);
      await session.evaluate("document.querySelector('.hero-primary-cta')?.click(); true");
      let spaArrived = false;
      for (let i = 0; i < 50; i += 1) {
        try {
          const onPlanner = await session.evaluate(
            "window.location.pathname === '/ai-planner' && Boolean(document.querySelector('#planner-prompt'))",
          );
          if (onPlanner) {
            spaArrived = true;
            break;
          }
        } catch {
          // Ignore transient frame swap.
        }
        await wait(80);
      }

      await session.evaluate("window.history.back(); true");
      for (let i = 0; i < 50; i += 1) {
        try {
          const restored = await session.evaluate(
            "window.location.pathname === '/' && Array.from(document.querySelectorAll('h1')).some((el) => el.checkVisibility())",
          );
          if (restored) break;
        } catch {
          // Ignore transient frame swap.
        }
        await wait(80);
      }

      const restoredCheck = await session.evaluate(`(async () => {
        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        const h1 = Array.from(document.querySelectorAll('h1')).find((el) => el.checkVisibility());
        const heroImg = Array.from(document.querySelectorAll('img[data-image-settle]')).find((el) => el.checkVisibility());
        return {
          restoredPathname: window.location.pathname,
          restoredH1Visible: h1 ? getComputedStyle(h1).opacity === '1' && getComputedStyle(h1).transform === 'none' : false,
          restoredImgVisible: heroImg ? getComputedStyle(heroImg).opacity === '1' && getComputedStyle(heroImg).transform === 'none' : false,
        };
      })()`);

      return {
        focusCheck,
        clickNavigation: {
          arrivedAtPlanner: earlyClickArrived && spaArrived,
          ...restoredCheck,
        },
        errors: session.errors,
      };
    },
  );

  // 3. Editorial chapters, E-7 static list dividers, stationary image frames, E-8a badge, E-8b bubbles, E-8c disclosures (Desktop + Mobile)
  const editorialDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      await session.evaluate("document.fonts.ready.then(() => true)");

      const beforeScrollGeometry = await session.evaluate(`(() => {
        const nestedReveals = document.querySelectorAll('[data-reveal-variant] [data-reveal-variant]').length;
        const sections = Array.from(document.querySelectorAll('main > section, footer'));
        const allBandsStatic = sections.every((el) => {
          const s = getComputedStyle(el);
          return !el.hasAttribute('data-reveal-variant') && s.opacity === '1' && s.transform === 'none';
        });
        const footerNav = document.querySelector('footer nav[aria-label="Điều hướng chân trang"]');
        const footerNavStatic = Boolean(
          footerNav && !footerNav.closest('[data-reveal-variant]') && getComputedStyle(footerNav).opacity === '1',
        );

        const destFrame = document.querySelector('#destinations .image-reveal');
        const destImg = destFrame?.querySelector('img');
        const destFrameRect = destFrame?.getBoundingClientRect();
        const destBadge = document.querySelector('#destinations [data-reveal-variant="card"]');
        const destBadgeStyle = destBadge ? getComputedStyle(destBadge) : null;
        const destBadgeParentStyle = destBadge?.parentElement ? getComputedStyle(destBadge.parentElement) : null;

        const expSection = document.querySelector('#experiences');
        const expOl = expSection?.querySelector('ol');
        const expLis = expOl ? Array.from(expOl.children) : [];
        const expOlRect = expOl?.getBoundingClientRect();
        const expLiMetricsBefore = expLis.map((li) => {
          const r = li.getBoundingClientRect();
          const s = getComputedStyle(li);
          return {
            tag: li.tagName,
            relTop: Math.round((r.top - (expOlRect?.top ?? 0)) * 100) / 100,
            height: Math.round(r.height * 100) / 100,
            opacity: s.opacity,
            transform: s.transform,
            borderBottomWidth: s.borderBottomWidth,
          };
        });

        const howOl = document.querySelector('#how-it-works ol');
        const howLis = howOl ? Array.from(howOl.children) : [];
        const howOlRect = howOl?.getBoundingClientRect();
        const howLiMetricsBefore = howLis.map((li) => {
          const r = li.getBoundingClientRect();
          const s = getComputedStyle(li);
          return {
            tag: li.tagName,
            relTop: Math.round((r.top - (howOlRect?.top ?? 0)) * 100) / 100,
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
            opacity: s.opacity,
            transform: s.transform,
            paddingLeft: s.paddingLeft,
            paddingRight: s.paddingRight,
            borderRightWidth: s.borderRightWidth,
          };
        });

        // Disclosures (E-8c & Section 8/9)
        const allParagraphs = Array.from(document.querySelectorAll('main p'));
        const provenanceNote = allParagraphs.find(
          (p) =>
            p.textContent?.includes('danh mục trực tiếp chưa khả dụng') ||
            p.textContent?.includes('Tên trải nghiệm từ danh mục công khai'),
        );
        const leadDisclaimer = allParagraphs.find((p) =>
          p.textContent?.includes('không phải cam kết về giá, tồn kho hay khả năng đặt chỗ'),
        );
        const aiHonestyNotice = allParagraphs.find((p) =>
          p.textContent?.includes('Bản xem trước giao diện · chưa kết nối mô hình AI'),
        );

        // AI Planner preview checks before reveal
        const sampleBubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        const aiSection = aiHonestyNotice?.closest('section');
        const goldDot = aiSection?.querySelector('span.rounded-full');

        return {
          nestedReveals,
          allBandsStatic,
          footerNavStatic,
          destBefore: {
            frameState: destFrame?.getAttribute('data-reveal') ?? null,
            frameOpacity: destFrame ? getComputedStyle(destFrame).opacity : null,
            frameTransform: destFrame ? getComputedStyle(destFrame).transform : null,
            frameWidth: destFrameRect ? Math.round(destFrameRect.width * 100) / 100 : null,
            frameHeight: destFrameRect ? Math.round(destFrameRect.height * 100) / 100 : null,
            imgPendingTransform: destImg ? getComputedStyle(destImg).transform : null,
            imgPendingTransitionDuration: destImg ? getComputedStyle(destImg).transitionDuration : null,
            badgePosition: destBadgeStyle?.position ?? null,
            badgeParentPosition: destBadgeParentStyle?.position ?? null,
            badgeParentTransform: destBadgeParentStyle?.transform ?? null,
          },
          expLiMetricsBefore,
          howLiMetricsBefore,
          disclosuresBefore: {
            provenanceOutsideReveal: Boolean(provenanceNote && !provenanceNote.closest('[data-reveal-variant]')),
            provenanceOpacityWhilePending: provenanceNote ? getComputedStyle(provenanceNote).opacity : null,
            leadDisclaimerDelay: leadDisclaimer?.closest('[data-reveal-variant]')?.style.getPropertyValue('--reveal-delay') || '0ms',
            aiHonestyDelay: aiHonestyNotice?.closest('[data-reveal-variant]')?.style.getPropertyValue('--reveal-delay') || '0ms',
          },
          aiPreviewBefore: {
            bubbleCount: sampleBubbles.length,
            nestedRevealsInPreview: aiSection
              ? aiSection.querySelectorAll('[data-reveal-variant] [data-reveal-variant]').length
              : -1,
            bubblesPendingOpacity: sampleBubbles.map((b) => getComputedStyle(b).opacity),
            bubbleTextsBefore: sampleBubbles.map((b) => b.textContent?.trim() ?? ''),
            goldDotAnimations: goldDot ? goldDot.getAnimations().length : -1,
            goldDotAnimationName: goldDot ? getComputedStyle(goldDot).animationName : null,
          },
        };
      })()`);

      const afterScrollGeometry = await session.evaluate(`(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        document.documentElement.style.scrollBehavior = 'auto';
        const pageHeight = document.documentElement.scrollHeight;
        for (let y = 0; y <= pageHeight; y += Math.max(window.innerHeight * 0.7, 400)) {
          window.scrollTo(0, y);
          await delay(90);
        }
        window.scrollTo(0, pageHeight);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );

        const destFrame = document.querySelector('#destinations .image-reveal');
        const destImg = destFrame?.querySelector('img');
        const destFrameRect = destFrame?.getBoundingClientRect();
        const destBadge = document.querySelector('#destinations [data-reveal-variant="card"]');
        const destBadgeRect = destBadge?.getBoundingClientRect();

        const expSection = document.querySelector('#experiences');
        const expColumns = expSection ? Array.from(expSection.querySelector('.grid')?.children ?? []) : [];
        const expTextRect = expColumns[0]?.getBoundingClientRect();
        const expImageCol = expColumns[1];
        const expImageRect = expImageCol?.getBoundingClientRect();
        const expImageColTranslate = expImageCol ? getComputedStyle(expImageCol).translate : null;

        const expOl = expSection?.querySelector('ol');
        const expLis = expOl ? Array.from(expOl.children) : [];
        const expOlRect = expOl?.getBoundingClientRect();
        const expLiMetricsAfter = expLis.map((li) => {
          const r = li.getBoundingClientRect();
          return {
            relTop: Math.round((r.top - (expOlRect?.top ?? 0)) * 100) / 100,
            height: Math.round(r.height * 100) / 100,
          };
        });

        const howOl = document.querySelector('#how-it-works ol');
        const howLis = howOl ? Array.from(howOl.children) : [];
        const howOlRect = howOl?.getBoundingClientRect();
        const howLiMetricsAfter = howLis.map((li) => {
          const r = li.getBoundingClientRect();
          return {
            relTop: Math.round((r.top - (howOlRect?.top ?? 0)) * 100) / 100,
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
          };
        });

        const sampleBubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        const sectionBreakdown = {
          philosophy: document.querySelectorAll('#philosophy [data-reveal="visible"]').length,
          destinations: document.querySelectorAll('#destinations [data-reveal="visible"]').length,
          experiences: document.querySelectorAll('#experiences [data-reveal="visible"]').length,
          howItWorks: document.querySelectorAll('#how-it-works [data-reveal="visible"]').length,
          footer: document.querySelectorAll('footer [data-reveal="visible"]').length,
          totalHomepage: document.querySelectorAll('[data-reveal="visible"]').length,
        };

        return {
          sectionBreakdown,
          destAfter: {
            frameWidth: destFrameRect ? Math.round(destFrameRect.width * 100) / 100 : null,
            frameHeight: destFrameRect ? Math.round(destFrameRect.height * 100) / 100 : null,
            imgSettledTransform: destImg ? getComputedStyle(destImg).transform : null,
            imgTransitionDuration: destImg ? getComputedStyle(destImg).transitionDuration : null,
            badgeOverlapsBottomPx:
              destBadgeRect && destFrameRect ? Math.round(destBadgeRect.bottom - destFrameRect.bottom) : null,
          },
          expDesktopLayout: {
            textLeftOfImage: Boolean(expTextRect && expImageRect && expTextRect.left < expImageRect.left),
            imageColumnTranslatePreserved: expImageColTranslate,
          },
          expLiMetricsAfter,
          howLiMetricsAfter,
          aiPreviewAfter: {
            bubbleDelays: sampleBubbles.map((b) => getComputedStyle(b).transitionDelay),
            bubbleProperties: sampleBubbles.map((b) => getComputedStyle(b).transitionProperty),
            bubbleTransforms: sampleBubbles.map((b) => getComputedStyle(b).transform),
            bubbleOpacities: sampleBubbles.map((b) => getComputedStyle(b).opacity),
            bubbleTextsAfter: sampleBubbles.map((b) => b.textContent?.trim() ?? ''),
          },
          activeAnimationsRemaining: document.getAnimations().length,
        };
      })()`);

      return { beforeScrollGeometry, afterScrollGeometry, errors: session.errors };
    },
  );

  // 4. Mobile reading order, 0ms stack delays, sample bubble mobile delays, and reduced/off/print bubble overrides
  const editorialMobileAndOverrides = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, true);
      const mobileChecks = await session.evaluate(`(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        document.documentElement.style.scrollBehavior = 'auto';
        const pageHeight = document.documentElement.scrollHeight;
        for (let y = 0; y <= pageHeight; y += 420) {
          window.scrollTo(0, y);
          await delay(80);
        }
        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );

        const expSection = document.querySelector('#experiences');
        const expColumns = expSection ? Array.from(expSection.querySelector('.grid')?.children ?? []) : [];
        const expTextRect = expColumns[0]?.getBoundingClientRect();
        const expImageRect = expColumns[1]?.getBoundingClientRect();

        const stackedUnits = Array.from(document.querySelectorAll('[data-reveal-stack]'));
        const allStackedZeroDelayOnMobile = stackedUnits.every((el) => getComputedStyle(el).transitionDelay === '0s');

        const sampleBubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        return {
          imageAboveTextOnMobile: Boolean(expImageRect && expTextRect && expImageRect.bottom <= expTextRect.top),
          stackedUnitCount: stackedUnits.length,
          allStackedZeroDelayOnMobile,
          mobileBubbleDelays: sampleBubbles.map((b) => getComputedStyle(b).transitionDelay),
          mobileBubbleOpacities: sampleBubbles.map((b) => getComputedStyle(b).opacity),
        };
      })()`);

      return { ...mobileChecks, errors: session.errors };
    },
  );

  const sampleBubbleFailVisible = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, reducedMotion: true },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const reducedState = await session.evaluate(`(() => {
        const scrollLine = document.querySelector('.hero-scroll-line');
        const heroImg = document.querySelector('img[data-image-settle]');
        const h1 = document.querySelector('h1');
        const bubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        return {
          heroImgTransform: heroImg ? getComputedStyle(heroImg).transform : null,
          h1Transform: h1 ? getComputedStyle(h1).transform : null,
          scrollLineTransform: scrollLine ? getComputedStyle(scrollLine).transform : null,
          scrollLineOpacity: scrollLine ? getComputedStyle(scrollLine).opacity : null,
          bubblesVisibleUnderReducedMotion:
            bubbles.length === 2 && bubbles.every((b) => getComputedStyle(b).opacity === '1'),
        };
      })()`);

      await session.send("Emulation.setEmulatedMedia", {
        media: "print",
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      const printState = await session.evaluate(`(() => {
        const bubbles = Array.from(document.querySelectorAll('[data-sample-bubble]'));
        return {
          bubblesVisibleInPrint:
            bubbles.length === 2 && bubbles.every((b) => getComputedStyle(b).opacity === '1'),
        };
      })()`);

      return { reducedState, printState, errors: session.errors };
    },
  );

  const expDividersUnchanged =
    editorialDesktop.beforeScrollGeometry.expLiMetricsBefore.length === 3 &&
    editorialDesktop.beforeScrollGeometry.expLiMetricsBefore.every((m, idx) => {
      const after = editorialDesktop.afterScrollGeometry.expLiMetricsAfter[idx];
      return (
        m.tag === "LI" &&
        m.opacity === "1" &&
        m.transform === "none" &&
        m.borderBottomWidth === "1px" &&
        Math.abs(m.relTop - after.relTop) <= 0.5 &&
        Math.abs(m.height - after.height) <= 0.5
      );
    });

  const howDividersUnchanged =
    editorialDesktop.beforeScrollGeometry.howLiMetricsBefore.length === 3 &&
    editorialDesktop.beforeScrollGeometry.howLiMetricsBefore[0].paddingLeft === "0px" &&
    editorialDesktop.beforeScrollGeometry.howLiMetricsBefore[2].paddingRight === "0px" &&
    editorialDesktop.beforeScrollGeometry.howLiMetricsBefore[2].borderRightWidth === "0px" &&
    editorialDesktop.beforeScrollGeometry.howLiMetricsBefore.every((m, idx) => {
      const after = editorialDesktop.afterScrollGeometry.howLiMetricsAfter[idx];
      return (
        m.tag === "LI" &&
        m.opacity === "1" &&
        m.transform === "none" &&
        Math.abs(m.relTop - after.relTop) <= 0.5 &&
        Math.abs(m.width - after.width) <= 0.5 &&
        Math.abs(m.height - after.height) <= 0.5
      );
    });

  const passed =
    // Hero Desktop
    heroDesktop.firstPaint?.heroImg.opacity === "1" &&
    heroDesktop.firstPaint?.heroImg.animationName === "adora-image-settle" &&
    heroDesktop.firstPaint?.heroImg.animationDuration === "0.92s" &&
    heroDesktop.firstPaint?.heroImg.animationFillMode === "backwards" &&
    heroDesktop.firstPaint?.heroImg.scaleX > 1.015 &&
    heroDesktop.firstPaint?.sectionOverflowX === "hidden" &&
    heroDesktop.firstPaint?.eyebrow?.opacity === "1" &&
    heroDesktop.firstPaint?.eyebrow?.animationDelay === "0s" &&
    heroDesktop.firstPaint?.h1.opacity === "1" &&
    heroDesktop.firstPaint?.h1.animationDelay === "0s" &&
    heroDesktop.firstPaint?.h1.animationDuration === "0.68s" &&
    heroDesktop.firstPaint?.h1.ty > 1 &&
    heroDesktop.firstPaint?.h1.childElementTags.length === 1 &&
    heroDesktop.firstPaint?.h1.childElementTags[0] === "EM" &&
    heroDesktop.firstPaint?.leadCopy?.animationDelay === "0.06s" &&
    heroDesktop.firstPaint?.primaryCta?.animationDelay === "0.12s" &&
    heroDesktop.firstPaint?.secondaryCta?.animationDelay === "0.18s" &&
    heroDesktop.firstPaint?.secondaryCta?.opacity === 0 &&
    heroDesktop.firstPaint?.scrollLine?.animationDuration === "2.2s" &&
    heroDesktop.firstPaint?.scrollLine?.animationIterationCount === "1.5" &&
    heroDesktop.firstPaint?.scrollLine?.animationFillMode === "none" &&
    heroDesktop.midScrollSample?.scrollActiveAnims === 1 &&
    heroDesktop.settledDom.heroImgOpacity === "1" &&
    heroDesktop.settledDom.heroImgTransform === "none" &&
    heroDesktop.settledDom.heroImgWillChange === "auto" &&
    heroDesktop.settledDom.h1Opacity === "1" &&
    heroDesktop.settledDom.h1Transform === "none" &&
    heroDesktop.settledDom.scrollLineOpacity === "1" &&
    heroDesktop.settledDom.scrollLineTransform === "none" &&
    heroDesktop.settledDom.scrollLineActiveAnims === 0 &&
    heroDesktop.settledDom.totalActiveAnimsAfterSettle === 0 &&
    Math.abs((heroDesktop.nearEndSample?.scrollHeightPx ?? 36) - (heroDesktop.settledSample?.scrollHeightPx ?? 36)) <= 2 &&
    heroDesktop.errors.length === 0 &&
    heroDesktop.hydrationWarnings.length === 0 &&
    // Hero Mobile
    heroMobile.firstPaint?.heroImg.opacity === "1" &&
    heroMobile.firstPaint?.heroImg.scaleX > 1.008 &&
    heroMobile.firstPaint?.h1.opacity === "1" &&
    heroMobile.firstPaint?.h1.animationDelay === "0s" &&
    heroMobile.firstPaint?.leadCopy?.animationDelay === "0.04s" &&
    heroMobile.firstPaint?.primaryCta?.animationDelay === "0.08s" &&
    heroMobile.firstPaint?.secondaryCta?.animationDelay === "0.12s" &&
    heroMobile.settledDom.scrollLineActiveAnims === 0 &&
    heroMobile.settledDom.totalActiveAnimsAfterSettle === 0 &&
    heroMobile.errors.length === 0 &&
    // Hero Interaction & E-6
    heroInteractionAndE6.focusCheck.activeIsCta &&
    heroInteractionAndE6.focusCheck.opacityOnFocus === "1" &&
    heroInteractionAndE6.focusCheck.outlineStyle !== "none" &&
    !heroInteractionAndE6.focusCheck.hasClientLatchAttr &&
    heroInteractionAndE6.clickNavigation.arrivedAtPlanner &&
    heroInteractionAndE6.clickNavigation.restoredPathname === "/" &&
    heroInteractionAndE6.clickNavigation.restoredH1Visible &&
    heroInteractionAndE6.clickNavigation.restoredImgVisible &&
    heroInteractionAndE6.errors.length === 0 &&
    // Editorial Chapters & E-7 / E-8
    editorialDesktop.beforeScrollGeometry.nestedReveals === 0 &&
    editorialDesktop.beforeScrollGeometry.allBandsStatic &&
    editorialDesktop.beforeScrollGeometry.footerNavStatic &&
    editorialDesktop.beforeScrollGeometry.destBefore.frameState === "pending" &&
    editorialDesktop.beforeScrollGeometry.destBefore.frameOpacity === "0" &&
    editorialDesktop.beforeScrollGeometry.destBefore.frameTransform === "none" &&
    editorialDesktop.beforeScrollGeometry.destBefore.imgPendingTransitionDuration === "0s" &&
    editorialDesktop.beforeScrollGeometry.destBefore.badgePosition === "absolute" &&
    editorialDesktop.beforeScrollGeometry.destBefore.badgeParentPosition === "relative" &&
    editorialDesktop.beforeScrollGeometry.destBefore.badgeParentTransform === "none" &&
    editorialDesktop.afterScrollGeometry.destAfter.frameWidth === editorialDesktop.beforeScrollGeometry.destBefore.frameWidth &&
    editorialDesktop.afterScrollGeometry.destAfter.frameHeight === editorialDesktop.beforeScrollGeometry.destBefore.frameHeight &&
    editorialDesktop.afterScrollGeometry.destAfter.imgSettledTransform === "none" &&
    editorialDesktop.afterScrollGeometry.destAfter.imgTransitionDuration === "1.2s" &&
    editorialDesktop.afterScrollGeometry.destAfter.badgeOverlapsBottomPx === 24 &&
    editorialDesktop.afterScrollGeometry.sectionBreakdown.philosophy === 3 &&
    editorialDesktop.afterScrollGeometry.sectionBreakdown.destinations === 4 &&
    editorialDesktop.afterScrollGeometry.sectionBreakdown.experiences === 6 &&
    editorialDesktop.afterScrollGeometry.sectionBreakdown.howItWorks === 4 &&
    editorialDesktop.afterScrollGeometry.sectionBreakdown.footer === 1 &&
    editorialDesktop.afterScrollGeometry.sectionBreakdown.totalHomepage === 20 &&
    editorialDesktop.afterScrollGeometry.expDesktopLayout.textLeftOfImage &&
    editorialDesktop.afterScrollGeometry.expDesktopLayout.imageColumnTranslatePreserved === "0px 40px" &&
    expDividersUnchanged &&
    howDividersUnchanged &&
    editorialDesktop.beforeScrollGeometry.disclosuresBefore.provenanceOutsideReveal &&
    editorialDesktop.beforeScrollGeometry.disclosuresBefore.provenanceOpacityWhilePending === "1" &&
    editorialDesktop.beforeScrollGeometry.disclosuresBefore.leadDisclaimerDelay === "0ms" &&
    editorialDesktop.beforeScrollGeometry.disclosuresBefore.aiHonestyDelay === "0ms" &&
    editorialDesktop.beforeScrollGeometry.aiPreviewBefore.bubbleCount === 2 &&
    editorialDesktop.beforeScrollGeometry.aiPreviewBefore.nestedRevealsInPreview === 0 &&
    editorialDesktop.beforeScrollGeometry.aiPreviewBefore.bubblesPendingOpacity.every((o) => o === "0") &&
    editorialDesktop.beforeScrollGeometry.aiPreviewBefore.goldDotAnimations === 0 &&
    editorialDesktop.beforeScrollGeometry.aiPreviewBefore.goldDotAnimationName === "none" &&
    editorialDesktop.afterScrollGeometry.aiPreviewAfter.bubbleDelays[0] === "0.18s" &&
    editorialDesktop.afterScrollGeometry.aiPreviewAfter.bubbleDelays[1] === "0.26s" &&
    editorialDesktop.afterScrollGeometry.aiPreviewAfter.bubbleProperties.every((p) => p === "opacity") &&
    editorialDesktop.afterScrollGeometry.aiPreviewAfter.bubbleTransforms.every((t) => t === "none") &&
    editorialDesktop.afterScrollGeometry.aiPreviewAfter.bubbleOpacities.every((o) => o === "1") &&
    JSON.stringify(editorialDesktop.beforeScrollGeometry.aiPreviewBefore.bubbleTextsBefore) ===
      JSON.stringify(editorialDesktop.afterScrollGeometry.aiPreviewAfter.bubbleTextsAfter) &&
    editorialDesktop.afterScrollGeometry.activeAnimationsRemaining === 0 &&
    editorialDesktop.errors.length === 0 &&
    // Mobile & overrides
    editorialMobileAndOverrides.imageAboveTextOnMobile &&
    editorialMobileAndOverrides.stackedUnitCount === 10 &&
    editorialMobileAndOverrides.allStackedZeroDelayOnMobile &&
    editorialMobileAndOverrides.mobileBubbleDelays[0] === "0.08s" &&
    editorialMobileAndOverrides.mobileBubbleDelays[1] === "0.16s" &&
    editorialMobileAndOverrides.mobileBubbleOpacities.every((o) => o === "1") &&
    editorialMobileAndOverrides.errors.length === 0 &&
    sampleBubbleFailVisible.reducedState.heroImgTransform === "none" &&
    sampleBubbleFailVisible.reducedState.h1Transform === "none" &&
    sampleBubbleFailVisible.reducedState.scrollLineOpacity === "1" &&
    sampleBubbleFailVisible.reducedState.bubblesVisibleUnderReducedMotion &&
    sampleBubbleFailVisible.printState.bubblesVisibleInPrint &&
    sampleBubbleFailVisible.errors.length === 0;

  return {
    executed: true,
    passed,
    heroDesktop: {
      firstPaint: heroDesktop.firstPaint,
      frameStats: heroDesktop.frameStats,
      midScrollSample: heroDesktop.midScrollSample,
      nearEndSample: heroDesktop.nearEndSample,
      settledDom: heroDesktop.settledDom,
      errors: heroDesktop.errors,
    },
    heroMobile: {
      firstPaint: heroMobile.firstPaint,
      frameStats: heroMobile.frameStats,
      midScrollSample: heroMobile.midScrollSample,
      nearEndSample: heroMobile.nearEndSample,
      settledDom: heroMobile.settledDom,
      errors: heroMobile.errors,
    },
    heroInteractionAndE6,
    editorialDesktop,
    editorialMobileAndOverrides,
    sampleBubbleFailVisible,
    timelines: {
      desktop: heroDesktop.sampledTimeline,
      mobile: heroMobile.sampledTimeline,
    },
  };
}

async function captureScreenshotFile(session, targetDir, filename, fullPage = false) {
  const parameters = { format: "png", fromSurface: true, captureBeyondViewport: fullPage };
  if (fullPage) {
    const metrics = await session.send("Page.getLayoutMetrics");
    parameters.clip = {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: metrics.cssContentSize.height,
      scale: 1,
    };
  }
  const screenshot = await session.send("Page.captureScreenshot", parameters);
  const fullPath = join(targetDir, filename);
  await writeFile(fullPath, Buffer.from(screenshot.data, "base64"));
  return fullPath;
}

async function capturePackageBEvidence(browserClient, timelines) {
  await mkdir(packageBEvidenceDirectory, { recursive: true });
  const files = [];

  for (const profile of [
    { prefix: "desktop", width: 1440, height: 900, mobile: false },
    { prefix: "mobile", width: 390, height: 844, mobile: true },
  ]) {
    await withIsolatedSession(
      browserClient,
      {
        width: profile.width,
        height: profile.height,
        deviceScaleFactor: 1,
        mobile: profile.mobile,
        touch: profile.mobile,
      },
      async (session) => {
        await navigateAndWaitReady(session, siteUrl, true);
        await session.evaluate(`(async () => {
          window.__adoraWaitImages = async (root, label, timeoutMs = 6000) => {
            const imgs = Array.from((root ?? document).querySelectorAll('img'));
            await Promise.race([
              Promise.all(
                imgs.map((img) =>
                  img.complete
                    ? Promise.resolve()
                    : new Promise((r) => {
                        img.addEventListener('load', r, { once: true });
                        img.addEventListener('error', r, { once: true });
                      }),
                ),
              ),
              new Promise((_, reject) =>
                setTimeout(() => {
                  const pendingSrcs = imgs
                    .filter((i) => !i.complete)
                    .map((i) => ({ alt: i.alt, loading: i.loading, top: Math.round(i.getBoundingClientRect().top) }));
                  reject(new Error('Timed out waiting for images in ' + label + ': ' + JSON.stringify(pendingSrcs)));
                }, timeoutMs),
              ),
            ]);
          };

          window.__adoraWaitAnims = async (root, label, timeoutMs = 6000) => {
            const anims = (root === document ? document.getAnimations() : root.getAnimations({ subtree: true })).filter(
              (a) => a.effect?.getComputedTiming?.().iterations !== Infinity,
            );
            if (anims.length === 0) return;
            await Promise.race([
              Promise.all(anims.map((a) => a.finished.catch(() => {}))),
              new Promise((_, reject) =>
                setTimeout(() => {
                  const stuck = anims
                    .filter((a) => a.playState !== 'finished')
                    .map((a) => ({
                      name: a.animationName ?? a.transitionProperty ?? 'unknown',
                      playState: a.playState,
                      currentTime: a.currentTime,
                    }));
                  reject(new Error('Timed out waiting for animations in ' + label + ': ' + JSON.stringify(stuck)));
                }, timeoutMs),
              ),
            ]);
          };

          await Promise.race([
            document.fonts.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for document.fonts.ready')), 5000)),
          ]);
          const hero = document.querySelector('main > section');
          // Wait ONLY for eager above-fold hero image at scrollY=0 (below-fold next/image elements use loading="lazy"
          // and must not be awaited before scrolling into their section, or they defer forever at scrollY=0).
          await window.__adoraWaitImages(hero, '${profile.prefix}-hero-initial', 6000);
        })()`);

        // Re-trigger hero CSS load animations cleanly with fonts + hero image already decoded, paused at t=0ms
        await session.evaluate(`(async () => {
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, 0);
          const hero = document.querySelector('main > section');
          const animated = [
            hero.querySelector('img[data-image-settle]'),
            ...hero.querySelectorAll('.adora-hero-heading-rise, .adora-load-rise, .hero-scroll-line'),
          ].filter(Boolean);
          for (const el of animated) {
            el.style.animation = 'none';
          }
          hero.getBoundingClientRect();
          for (const el of animated) {
            el.style.removeProperty('animation');
          }
          for (const anim of hero.getAnimations({ subtree: true })) {
            anim.pause();
            anim.currentTime = 0;
          }
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-01-hero-initial.png`, false));

        // Advance hero animations deterministically to t = 220ms (mid-animation)
        await session.evaluate(`(async () => {
          const hero = document.querySelector('main > section');
          for (const anim of hero.getAnimations({ subtree: true })) {
            anim.pause();
            anim.currentTime = 220;
          }
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-02-hero-mid.png`, false));

        // Play all hero animations to natural completion (including 3.3s scroll-line) -> settled hero
        await session.evaluate(`(async () => {
          const hero = document.querySelector('main > section');
          for (const anim of hero.getAnimations({ subtree: true })) anim.play();
          await window.__adoraWaitAnims(hero, '${profile.prefix}-hero-settled', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-03-hero-settled.png`, false));

        // 04. BrandPhilosophy settled
        await session.evaluate(`(async () => {
          const section = document.querySelector('#philosophy');
          section.scrollIntoView({ block: ${profile.mobile ? "'start'" : "'center'"}, behavior: 'instant' });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await window.__adoraWaitAnims(section, '${profile.prefix}-philosophy', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-04-brand-philosophy-settled.png`, false),
        );

        // 05a & 05b. DestinationStory mid-reveal (240ms) and settled
        await session.evaluate(`(async () => {
          const section = document.querySelector('#destinations');
          section.scrollIntoView({ block: ${profile.mobile ? "'start'" : "'center'"}, behavior: 'instant' });
          ${profile.mobile ? "" : "window.scrollBy(0, 96);"}
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          for (const anim of section.getAnimations({ subtree: true })) {
            anim.pause();
            anim.currentTime = 240;
          }
          await window.__adoraWaitImages(section, '${profile.prefix}-destinations-mid', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-05a-destination-mid-reveal.png`, false),
        );

        await session.evaluate(`(async () => {
          const section = document.querySelector('#destinations');
          for (const anim of section.getAnimations({ subtree: true })) anim.play();
          await window.__adoraWaitAnims(section, '${profile.prefix}-destinations-settled', 6000);
          await window.__adoraWaitImages(section, '${profile.prefix}-destinations-settled', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-05b-destination-settled.png`, false),
        );

        // 06. ExperienceStory settled
        await session.evaluate(`(async () => {
          const section = document.querySelector('#experiences');
          section.scrollIntoView({ block: ${profile.mobile ? "'start'" : "'center'"}, behavior: 'instant' });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await window.__adoraWaitImages(section, '${profile.prefix}-experiences', 6000);
          await window.__adoraWaitAnims(section, '${profile.prefix}-experiences', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-06-experience-settled.png`, false),
        );

        // 07. AiPlannerSection settled
        await session.evaluate(`(async () => {
          const section = document.querySelector('[data-sample-bubble]')?.closest('section');
          section.scrollIntoView({ block: ${profile.mobile ? "'start'" : "'center'"}, behavior: 'instant' });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await window.__adoraWaitAnims(section, '${profile.prefix}-ai-planner-section', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-07-ai-planner-section-settled.png`, false),
        );

        // 08. HowItWorks settled
        await session.evaluate(`(async () => {
          const section = document.querySelector('#how-it-works');
          section.scrollIntoView({ block: ${profile.mobile ? "'start'" : "'center'"}, behavior: 'instant' });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await window.__adoraWaitAnims(section, '${profile.prefix}-how-it-works', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-08-how-it-works-settled.png`, false),
        );

        // 09. Footer CTA settled
        await session.evaluate(`(async () => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const footer = document.querySelector('footer');
          await window.__adoraWaitAnims(footer, '${profile.prefix}-footer', 6000);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-09-footer-cta-settled.png`, false),
        );

        // 10. Full-page settled composition
        await session.evaluate(`(async () => {
          const pageHeight = document.documentElement.scrollHeight;
          for (let y = 0; y <= pageHeight; y += 360) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          await window.__adoraWaitImages(document, '${profile.prefix}-full-page', 6000);
          await window.__adoraWaitAnims(document, '${profile.prefix}-full-page', 6000);
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 200));
        })()`);
        files.push(
          await captureScreenshotFile(session, packageBEvidenceDirectory, `${profile.prefix}-10-full-page-settled.png`, true),
        );
      },
    );
  }

  if (timelines) {
    const timelinePath = join(packageBEvidenceDirectory, "hero-motion-frame-sequence.json");
    await writeFile(
      timelinePath,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          siteUrl,
          description:
            "Sampled real-time requestAnimationFrame telemetry for EditorialHero opening (INV-03, INV-04, INV-05/E-5) across Desktop 1440x900 and Mobile 390x844.",
          timelines,
        },
        null,
        2,
      ) + "\n",
    );
    files.push(timelinePath);
  }

  return {
    captured: true,
    directory: packageBEvidenceDirectory,
    fileCount: files.length,
    files,
  };
}

async function runPackageDApplicationSuite(browserClient) {
  // 1. Desktop (1440x900) AI Planner: initial visibility, keyboard welcome suggestion focus (P-6),
  //    message entrance timing (INV-17), atomic DOM insert, scroll stability, desktop Trip Preview
  //    entrance & preview.slug key switch (INV-18), unsupported reply (E-9), reset, and <Activity>
  //    Back-navigation replay prevention.
  const plannerDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, mobile: false, touch: false },
    async (session) => {
      const externalRequests = [];
      await session.send("Network.enable");
      browserClient.on("Network.requestWillBeSent", (params) => {
        const url = params?.request?.url ?? "";
        if (url && !url.startsWith(siteUrl) && !url.startsWith("data:") && !url.startsWith("blob:")) {
          externalRequests.push(url);
        }
      }, session.sessionId);

      await navigateAndWaitReady(session, `${siteUrl}/ai-planner`, true);
      await session.evaluate("document.fonts.ready.then(() => true)");

      const initialCheck = await session.evaluate(`(() => {
        const log = document.querySelector('[role="log"]');
        const logRect = log.getBoundingClientRect();
        const suggestions = Array.from(document.querySelectorAll('ul[aria-label="Gợi ý câu hỏi"] button'));
        const openingArticle = document.querySelector('[role="log"] article[aria-label="ADORA Planner"]');
        const openingRect = openingArticle.getBoundingClientRect();
        const emptyPreview = document.querySelector('[data-testid="trip-preview-empty"]');
        const liveRegions = document.querySelectorAll('[aria-live]');
        return {
          initialScrollTop: log.scrollTop,
          suggestionCount: suggestions.length,
          allSuggestionsVisibleInLog: suggestions.every((btn) => {
            const r = btn.getBoundingClientRect();
            return r.top >= logRect.top && r.bottom <= logRect.bottom;
          }),
          openingVisibleInLog: openingRect.top >= logRect.top && openingRect.bottom <= logRect.bottom,
          emptyPreviewPresent: Boolean(emptyPreview && emptyPreview.checkVisibility()),
          liveRegionCount: liveRegions.length,
          ariaBusyCount: document.querySelectorAll('[aria-busy]').length,
          activeAnimationsAtLoad: document.getAnimations().length,
        };
      })()`);

      // Focus first welcome suggestion and activate via keyboard Enter (P-6)
      await session.send("Page.bringToFront");
      await session.evaluate(`(() => {
        const firstBtn = document.querySelector('ul[aria-label="Gợi ý câu hỏi"] button');
        firstBtn.focus();
      })()`);
      await session.send("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
      await session.send("Input.dispatchKeyEvent", {
        type: "char",
        key: "Enter",
        code: "Enter",
        text: "\r",
        unmodifiedText: "\r",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
      await session.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });

      const turnAtT0 = await session.evaluate(`(() => {
        const log = document.querySelector('[role="log"]');
        const userBubble = log.querySelector('article[aria-label="Bạn"]');
        const scriptedReply = log.querySelector('[data-testid="scripted-reply"]');
        const preview = document.querySelector('[data-testid="trip-preview"]');
        const userStyle = getComputedStyle(userBubble);
        const replyStyle = getComputedStyle(scriptedReply);
        const previewStyle = getComputedStyle(preview);
        const demoLabels = Array.from(scriptedReply.querySelectorAll('span')).map((s) => s.textContent?.trim() ?? '');
        return {
          activeElementIdAtT0: document.activeElement?.id ?? null,
          scrollTopAtT0: log.scrollTop,
          ariaBusyCountAtT0: document.querySelectorAll('[aria-busy]').length,
          replyTextLengthAtT0: scriptedReply.textContent?.length ?? 0,
          hasDemoLabelAtT0: demoLabels.some((t) => t.includes('Phản hồi dựng sẵn · không phải AI')),
          userAnim: {
            name: userStyle.animationName,
            duration: userStyle.animationDuration,
            delay: userStyle.animationDelay,
            fillMode: userStyle.animationFillMode,
            transform: userStyle.transform,
            tabIndex: userBubble.tabIndex,
          },
          replyAnim: {
            name: replyStyle.animationName,
            duration: replyStyle.animationDuration,
            delay: replyStyle.animationDelay,
            fillMode: replyStyle.animationFillMode,
            transform: replyStyle.transform,
          },
          previewAnim: {
            name: previewStyle.animationName,
            duration: previewStyle.animationDuration,
            delay: previewStyle.animationDelay,
            fillMode: previewStyle.animationFillMode,
          },
        };
      })()`);

      const turnSettled = await session.evaluate(`(async () => {
        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const log = document.querySelector('[role="log"]');
        const logRect = log.getBoundingClientRect();
        const userBubble = log.querySelector('article[aria-label="Bạn"]');
        const userRect = userBubble.getBoundingClientRect();
        const scriptedReply = log.querySelector('[data-testid="scripted-reply"]');
        const preview = document.querySelector('[data-testid="trip-preview"]');
        return {
          scrollTopAfterSettle: log.scrollTop,
          userAnchorOffsetPx: Math.round((userRect.top - logRect.top) * 100) / 100,
          replyTextLengthAfterSettle: scriptedReply.textContent?.length ?? 0,
          userEnteredLatch: userBubble.dataset.entered === 'true',
          replyEnteredLatch: scriptedReply.dataset.entered === 'true',
          previewEnteredLatch: preview.dataset.entered === 'true',
          userOpacity: getComputedStyle(userBubble).opacity,
          userTransform: getComputedStyle(userBubble).transform,
          replyOpacity: getComputedStyle(scriptedReply).opacity,
          replyTransform: getComputedStyle(scriptedReply).transform,
          previewOpacity: getComputedStyle(preview).opacity,
          previewTransform: getComputedStyle(preview).transform,
          previewHeading: preview.querySelector('h2')?.textContent?.trim() ?? '',
          previewDaysCount: preview.querySelectorAll('ol li').length,
          activeAnimationsAfterSettle: document.getAnimations().length,
        };
      })()`);

      // Switch to 2-day scenario via sidebar button -> verify desktop Trip Preview remounts via key={preview.slug}
      const secondScenarioSwitch = await session.evaluate(`(async () => {
        const beforePreviewNode = document.querySelector('[data-testid="trip-preview"]');
        const sidebarButtons = Array.from(document.querySelectorAll('aside[aria-label="Thanh bên AI Planner"] section button'));
        const twoDayBtn = sidebarButtons.find((b) => b.textContent?.includes('2 ngày'));
        twoDayBtn.click();
        await new Promise((r) => setTimeout(r, 0));
        const afterPreviewNode = document.querySelector('[data-testid="trip-preview"]');
        const previewRemountedByKey = Boolean(beforePreviewNode && afterPreviewNode && beforePreviewNode !== afterPreviewNode);
        const newPreviewAnimName = getComputedStyle(afterPreviewNode).animationName;
        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return {
          previewRemountedByKey,
          newPreviewAnimName,
          previewDaysCount: afterPreviewNode.querySelectorAll('ol li').length,
          previewEnteredLatch: afterPreviewNode.dataset.entered === 'true',
          previewSettledOpacity: getComputedStyle(afterPreviewNode).opacity,
          previewSettledTransform: getComputedStyle(afterPreviewNode).transform,
        };
      })()`);

      // Submit unsupported prompt -> verify E-9 outer <article data-planner-enter="reply"> animation & atomic DemoLabel
      const unsupportedTurn = await session.evaluate(`(async () => {
        const textarea = document.querySelector('#planner-prompt');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, 'Cho mình lịch trình đi sao Hoả');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 0));
        const form = textarea.closest('form');
        form.requestSubmit();
        await new Promise((r) => setTimeout(r, 0));

        const unsupportedP = document.querySelector('[data-testid="unsupported-reply"]');
        const unsupportedArticle = unsupportedP?.closest('article');
        const styleAtT0 = unsupportedArticle ? getComputedStyle(unsupportedArticle) : null;
        const hasDemoLabelAtT0 = Boolean(
          unsupportedArticle &&
            Array.from(unsupportedArticle.querySelectorAll('span')).some((s) =>
              s.textContent?.includes('Thông báo hệ thống'),
            ),
        );
        const animAtT0 = styleAtT0
          ? {
              dataPlannerEnter: unsupportedArticle.getAttribute('data-planner-enter'),
              name: styleAtT0.animationName,
              duration: styleAtT0.animationDuration,
              delay: styleAtT0.animationDelay,
              transform: styleAtT0.transform,
            }
          : null;

        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return {
          hasDemoLabelAtT0,
          animAtT0,
          settledOpacity: unsupportedArticle ? getComputedStyle(unsupportedArticle).opacity : null,
          settledTransform: unsupportedArticle ? getComputedStyle(unsupportedArticle).transform : null,
          enteredLatch: unsupportedArticle?.dataset.entered === 'true',
        };
      })()`);

      // Next.js <Activity> Back-navigation replay check from /ai-planner -> /trips/... -> history.back()
      const scrollTopBeforeNav = await session.evaluate(
        "document.querySelector('[role=\"log\"]').scrollTop",
      );
      await session.evaluate(`(() => {
        const link = document.querySelector('[data-testid="trip-preview"] a[href^="/trips/"]');
        link.click();
      })()`);
      for (let i = 0; i < 50; i += 1) {
        const onTrip = await session.evaluate(
          "window.location.pathname.startsWith('/trips/') && Boolean(document.querySelector('[data-testid=\"day-panel\"]'))",
        );
        if (onTrip) break;
        await wait(60);
      }

      await session.evaluate("window.history.back(); true");
      for (let i = 0; i < 50; i += 1) {
        const backOnPlanner = await session.evaluate(
          "window.location.pathname === '/ai-planner' && Boolean(document.querySelector('[role=\"log\"]'))",
        );
        if (backOnPlanner) break;
        await wait(60);
      }

      const activityBackCheck = await session.evaluate(`(() => {
        const log = document.querySelector('[role="log"]');
        const enterNodes = Array.from(document.querySelectorAll('[data-planner-enter]'));
        const runningPlannerAnims = enterNodes.flatMap((el) => el.getAnimations());
        return {
          restoredPathname: window.location.pathname,
          enterNodeCount: enterNodes.length,
          allLatched: enterNodes.every((el) => el.dataset.entered === 'true'),
          runningPlannerAnimsCount: runningPlannerAnims.length,
          restoredScrollTop: log.scrollTop,
        };
      })()`);

      // Conversation reset check ("Cuộc trò chuyện demo mới") + fine-pointer mouse click on welcome suggestion
      const resetAndMouseSuggestion = await session.evaluate(`(async () => {
        const resetBtn = Array.from(document.querySelectorAll('aside[aria-label="Thanh bên AI Planner"] button')).find(
          (b) => b.textContent?.includes('Cuộc trò chuyện demo mới'),
        );
        resetBtn.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const log = document.querySelector('[role="log"]');
        const afterReset = {
          scrollTopAfterReset: log.scrollTop,
          emptyPreviewRestored: Boolean(document.querySelector('[data-testid="trip-preview-empty"]')),
          activeElementAfterReset: document.activeElement?.id ?? null,
        };

        const welcomeBtn = document.querySelector('ul[aria-label="Gợi ý câu hỏi"] button');
        welcomeBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
        welcomeBtn.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        return {
          afterReset,
          activeElementAfterMouseWelcomeClick: document.activeElement?.id ?? null,
        };
      })()`);

      return {
        initialCheck,
        turnAtT0,
        turnSettled,
        secondScenarioSwitch,
        unsupportedTurn,
        activityBackCheck: {
          ...activityBackCheck,
          scrollDeltaAfterBack: Math.abs(activityBackCheck.restoredScrollTop - scrollTopBeforeNav),
        },
        resetAndMouseSuggestion,
        externalRequests,
        errors: session.errors,
        hydrationWarnings: session.hydrationWarnings,
      };
    },
  );

  // 2. Mobile (390x844) AI Planner: touch welcome suggestion focus (N-4), mobile jumpbar & mobile preview
  //    opacity-only entrances (INV-18 / E-9), jumpbar smooth vs reduced-motion auto scrolling.
  const plannerMobile = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
    async (session) => {
      await navigateAndWaitReady(session, `${siteUrl}/ai-planner`, true);
      await session.evaluate("document.fonts.ready.then(() => true)");

      const touchWelcomeAndMobileTurn = await session.evaluate(`(async () => {
        const log = document.querySelector('[role="log"]');
        const welcomeBtn = document.querySelector('ul[aria-label="Gợi ý câu hỏi"] button');
        welcomeBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
        welcomeBtn.click();
        await new Promise((r) => setTimeout(r, 0));

        const userBubble = log.querySelector('article[aria-label="Bạn"]');
        const jumpbar = document.querySelector('[data-testid="mobile-planner-jumpbar"]');
        const mobilePreview = document.querySelector('[data-testid="trip-preview-mobile"]');
        const jumpbarStyle = getComputedStyle(jumpbar);
        const mobilePreviewStyle = getComputedStyle(mobilePreview);

        const activeAtT0 = {
          activeIsUserTurn: document.activeElement === userBubble,
          activeIsNotPrompt: document.activeElement?.id !== 'planner-prompt',
          activeIsNotBody: document.activeElement !== document.body,
          scrollTopAtT0: log.scrollTop,
          jumpbarAnim: {
            name: jumpbarStyle.animationName,
            duration: jumpbarStyle.animationDuration,
            delay: jumpbarStyle.animationDelay,
            transform: jumpbarStyle.transform,
          },
          mobilePreviewAnim: {
            name: mobilePreviewStyle.animationName,
            duration: mobilePreviewStyle.animationDuration,
            delay: mobilePreviewStyle.animationDelay,
            transform: mobilePreviewStyle.transform,
          },
        };

        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const logRect = log.getBoundingClientRect();
        const userRect = userBubble.getBoundingClientRect();
        return {
          ...activeAtT0,
          scrollTopAfterSettle: log.scrollTop,
          userAnchorOffsetPx: Math.round((userRect.top - logRect.top) * 100) / 100,
          jumpbarEnteredLatch: jumpbar.dataset.entered === 'true',
          mobilePreviewEnteredLatch: mobilePreview.dataset.entered === 'true',
          mobilePreviewOpacity: getComputedStyle(mobilePreview).opacity,
          mobilePreviewTransform: getComputedStyle(mobilePreview).transform,
        };
      })()`);

      // Test Jumpbar under html[data-motion="off"] -> immediate auto scroll at t=0ms
      const jumpbarScrollCheck = await session.evaluate(`(async () => {
        const log = document.querySelector('[role="log"]');
        const jumpbarButtons = Array.from(
          document.querySelectorAll('[data-testid="mobile-planner-jumpbar"] button'),
        );
        const previewBtn = jumpbarButtons.find((b) => b.textContent?.includes('Xem trước'));
        const replyBtn = jumpbarButtons.find((b) => b.textContent?.includes('Phản hồi kịch bản'));

        document.documentElement.dataset.motion = 'off';
        previewBtn.click();
        const scrollTopAtT0Preview = log.scrollTop;
        const logRect = log.getBoundingClientRect();
        const previewRect = document.querySelector('[data-testid="trip-preview-mobile"]').getBoundingClientRect();
        const previewOffsetPx = Math.round((previewRect.top - logRect.top) * 100) / 100;
        const previewVisibleInLog =
          scrollTopAtT0Preview > 300 &&
          previewRect.top >= logRect.top &&
          previewRect.bottom <= logRect.bottom + 2;

        replyBtn.click();
        const scrollTopAtT0Reply = log.scrollTop;
        const userRect = log.querySelector('article[aria-label="Bạn"]').getBoundingClientRect();
        const replyOffsetPx = Math.round((userRect.top - logRect.top) * 100) / 100;
        delete document.documentElement.dataset.motion;

        return {
          scrollTopAtT0Preview,
          previewOffsetPx,
          previewVisibleInLog,
          scrollTopAtT0Reply,
          replyOffsetPx,
        };
      })()`);

      return {
        touchWelcomeAndMobileTurn,
        jumpbarScrollCheck,
        errors: session.errors,
        hydrationWarnings: session.hydrationWarnings,
      };
    },
  );

  // 3. Trip Itinerary (/trips & /trips/da-lat-3-ngay): initial-load suppression (E-10), day-tab click &
  //    keyboard navigation, 220ms panel entrance with initial opacity >= 0.2 (N-7) and <= 6px rise (INV-19),
  //    <Activity> Back-navigation replay prevention, and 3-layer CSS Grid accordion (INV-20 / B-5).
  const itineraryDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, mobile: false, touch: false },
    async (session) => {
      // Check /trips index TripCard transition tokenization
      await navigateAndWaitReady(session, `${siteUrl}/trips`, true);
      const tripsIndexCheck = await session.evaluate(`(() => {
        const card = document.querySelector('main article');
        const style = card ? getComputedStyle(card) : null;
        const imgReveal = card?.querySelector('.image-reveal img');
        return {
          cardCount: document.querySelectorAll('main article').length,
          cardTransitionDuration: style?.transitionDuration ?? null,
          imgRevealTransitionDuration: imgReveal ? getComputedStyle(imgReveal).transitionDuration : null,
        };
      })()`);

      await navigateAndWaitReady(session, `${siteUrl}/trips/da-lat-3-ngay`, true);
      await session.evaluate("document.fonts.ready.then(() => true)");

      const initialLoadCheck = await session.evaluate(`(() => {
        const panel = document.querySelector('[data-testid="day-panel"]');
        const enterNode = panel.querySelector('[data-day-panel-enter]');
        const panelAnims = panel.getAnimations({ subtree: true });
        const dayBudget = document.querySelector('[data-testid="day-budget"]')?.textContent?.trim() ?? '';
        const buttons = Array.from(panel.querySelectorAll('button[aria-expanded]'));
        const regions = Array.from(panel.querySelectorAll('[role="region"]'));
        const allAriaControlsResolve = buttons.every((btn) => {
          const targetId = btn.getAttribute('aria-controls');
          return Boolean(targetId && document.getElementById(targetId));
        });
        const collapsedRegions = regions.filter((_, idx) => buttons[idx]?.getAttribute('aria-expanded') === 'false');
        const collapsedCheck = collapsedRegions.every((reg) => {
          const gridWrapper = reg.parentElement;
          const rect = gridWrapper.getBoundingClientRect();
          return reg.inert === true && reg.hasAttribute('inert') && rect.height <= 1;
        });

        window.__adoraInitialDayPanel = panel;
        window.__adoraFirstRegionNode = regions[0];

        return {
          hasDayPanelEnterOnInitialLoad: Boolean(enterNode),
          panelAnimsOnInitialLoad: panelAnims.length,
          day1Budget: dayBudget,
          activityButtonCount: buttons.length,
          regionCount: regions.length,
          allAriaControlsResolve,
          collapsedCheck,
        };
      })()`);

      // Genuine user day switch to Day 2 via click -> verify E-10, INV-19, N-7
      const day2SwitchCheck = await session.evaluate(`(async () => {
        const tab2 = document.getElementById('day-tab-2');
        tab2.click();
        await new Promise((r) => setTimeout(r, 0));

        const panel = document.querySelector('[data-testid="day-panel"]');
        const stablePanelNode = panel === window.__adoraInitialDayPanel;
        const innerEnter = panel.querySelector('[data-day-panel-enter]');
        const anims = innerEnter ? innerEnter.getAnimations() : [];
        if (anims[0]) {
          anims[0].pause();
          anims[0].currentTime = 0;
        }
        const styleAtT0 = innerEnter ? getComputedStyle(innerEnter) : null;
        const matrixMatch = styleAtT0?.transform?.match(/^matrix\\(([^)]+)\\)$/);
        const tyAtT0 = matrixMatch ? Number(matrixMatch[1].split(',')[5].trim()) : 0;
        const opacityAtT0 = styleAtT0 ? Number(styleAtT0.opacity) : 0;
        const animMeta = styleAtT0
          ? {
              name: styleAtT0.animationName,
              duration: styleAtT0.animationDuration,
              fillMode: styleAtT0.animationFillMode,
              opacityAtT0: Math.round(opacityAtT0 * 1000) / 1000,
              tyAtT0: Math.round(tyAtT0 * 100) / 100,
            }
          : null;

        const tab2SelectedAtT0 = tab2.getAttribute('aria-selected') === 'true';
        const day2BudgetAtT0 = document.querySelector('[data-testid="day-budget"]')?.textContent?.trim() ?? '';

        for (const a of anims) a.play();
        await Promise.all(anims.map((a) => a.finished.catch(() => {})));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        return {
          stablePanelNode,
          hasInnerEnterAttr: Boolean(innerEnter),
          tab2SelectedAtT0,
          day2BudgetAtT0,
          animMeta,
          settledOpacity: innerEnter ? getComputedStyle(innerEnter).opacity : null,
          settledTransform: innerEnter ? getComputedStyle(innerEnter).transform : null,
          enteredLatch: innerEnter?.dataset.entered === 'true',
          activeAnimsAfterSettle: panel.getAnimations({ subtree: true }).length,
        };
      })()`);

      // Keyboard navigation across tabs: ArrowRight (Day 2 -> Day 3), Home (Day 1), End (Day 3), ArrowLeft (Day 2)
      const keyboardTabsCheck = await session.evaluate(`(async () => {
        const tab2 = document.getElementById('day-tab-2');
        tab2.focus();
        const dispatchKey = async (el, key) => {
          el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
          await new Promise((r) => setTimeout(r, 0));
        };

        await dispatchKey(tab2, 'ArrowRight');
        const afterRight = {
          activeId: document.activeElement?.id ?? null,
          selected: document.getElementById('day-tab-3')?.getAttribute('aria-selected'),
          budget: document.querySelector('[data-testid="day-budget"]')?.textContent?.trim() ?? '',
        };

        await dispatchKey(document.activeElement, 'Home');
        const afterHome = {
          activeId: document.activeElement?.id ?? null,
          selected: document.getElementById('day-tab-1')?.getAttribute('aria-selected'),
          budget: document.querySelector('[data-testid="day-budget"]')?.textContent?.trim() ?? '',
        };

        await dispatchKey(document.activeElement, 'End');
        const afterEnd = {
          activeId: document.activeElement?.id ?? null,
          selected: document.getElementById('day-tab-3')?.getAttribute('aria-selected'),
        };

        await dispatchKey(document.activeElement, 'ArrowLeft');
        const afterLeft = {
          activeId: document.activeElement?.id ?? null,
          selected: document.getElementById('day-tab-2')?.getAttribute('aria-selected'),
        };

        // Return to Day 1 and wait for settle so we can test the accordion on Day 1
        await dispatchKey(document.activeElement, 'Home');
        await Promise.all(
          document.getAnimations()
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        return {
          stablePanelNodeAfterKeyboard: document.querySelector('[data-testid="day-panel"]') === window.__adoraInitialDayPanel,
          afterRight,
          afterHome,
          afterEnd,
          afterLeft,
        };
      })()`);

      // Three-layer activity accordion verification (INV-20 / B-5)
      const accordionCheck = await session.evaluate(`(async () => {
        const panel = document.querySelector('[data-testid="day-panel"]');
        const buttons = Array.from(panel.querySelectorAll('button[aria-expanded]'));
        const firstBtn = buttons[0];
        const secondBtn = buttons[1];
        const firstRegion = document.getElementById(firstBtn.getAttribute('aria-controls'));
        const secondRegion = document.getElementById(secondBtn.getAttribute('aria-controls'));
        const firstGrid = firstRegion.parentElement;
        const secondGrid = secondRegion.parentElement;

        // Collapse first activity and expand second activity
        firstBtn.click();
        secondBtn.click();
        await new Promise((r) => setTimeout(r, 0));

        const syncState = {
          firstExpandedAtT0: firstBtn.getAttribute('aria-expanded'),
          secondExpandedAtT0: secondBtn.getAttribute('aria-expanded'),
          firstInertAtT0: firstRegion.inert,
          secondInertAtT0: secondRegion.inert,
          sameFirstRegionNode: firstRegion === window.__adoraFirstRegionNode || firstRegion.id === 'activity-d1-a1',
        };

        const beforeReopenNode = firstRegion;
        await Promise.all(
          panel
            .getAnimations({ subtree: true })
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        await new Promise((r) => setTimeout(r, 280));

        const firstCollapsedHeight = Math.round(firstGrid.getBoundingClientRect().height * 100) / 100;
        const secondExpandedHeight = Math.round(secondGrid.getBoundingClientRect().height * 100) / 100;
        const firstGridStyle = getComputedStyle(firstGrid);

        // Verify reopening first activity preserves the exact same DOM node (no remount)
        firstBtn.click();
        await new Promise((r) => setTimeout(r, 0));
        const sameRegionNodeAcrossToggle =
          document.getElementById(firstBtn.getAttribute('aria-controls')) === beforeReopenNode;
        // Collapse first activity again so we can test keyboard Tab order skipping collapsed links
        firstBtn.click();
        await new Promise((r) => setTimeout(r, 0));
        await Promise.all(
          panel
            .getAnimations({ subtree: true })
            .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
        await new Promise((r) => setTimeout(r, 280));

        return {
          ...syncState,
          sameRegionNodeAcrossToggle,
          firstCollapsedHeight,
          secondExpandedHeight,
          firstCollapsedOpacity: firstGridStyle.opacity,
          firstCollapsedGridRows: firstGridStyle.gridTemplateRows,
          secondHasLinkInDom: Boolean(secondRegion.querySelector('a[href^="/experiences/"]')),
        };
      })()`);

      // Real CDP Tab key test: collapse secondBtn (which contains an <a href="/experiences/..."> link),
      // focus secondBtn, and press Tab -> focus must land on buttons[2], skipping the link inside collapsed secondRegion!
      await session.evaluate(`(async () => {
        const panel = document.querySelector('[data-testid="day-panel"]');
        const buttons = Array.from(panel.querySelectorAll('button[aria-expanded]'));
        // Collapse buttons[1] (which is currently expanded) and expand buttons[2] (so we have an open link for Activity nav test)
        buttons[1].click();
        buttons[2].click();
        await new Promise((r) => setTimeout(r, 0));
        buttons[1].focus();
      })()`);
      await session.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
      await session.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });

      const tabSkipCollapsedLinkCheck = await session.evaluate(`(() => {
        const panel = document.querySelector('[data-testid="day-panel"]');
        const buttons = Array.from(panel.querySelectorAll('button[aria-expanded]'));
        const secondRegion = document.getElementById(buttons[1].getAttribute('aria-controls'));
        return {
          secondRegionHasLink: Boolean(secondRegion.querySelector('a[href^="/experiences/"]')),
          secondRegionInert: secondRegion.inert === true,
          activeIsThirdButton: document.activeElement === buttons[2],
          activeInsideCollapsedSecondRegion: secondRegion.contains(document.activeElement),
        };
      })()`);

      // Next.js <Activity> Back-navigation replay check from /trips/da-lat-3-ngay -> /experiences/... -> history.back()
      await session.evaluate(`(() => {
        const openRegion = Array.from(document.querySelectorAll('[data-testid="day-panel"] [role="region"]')).find(
          (r) => !r.inert,
        );
        const expLink = openRegion.querySelector('a[href^="/experiences/"]');
        expLink.click();
      })()`);
      for (let i = 0; i < 50; i += 1) {
        const onExp = await session.evaluate("window.location.pathname.startsWith('/experiences/')");
        if (onExp) break;
        await wait(60);
      }

      await session.evaluate("window.history.back(); true");
      for (let i = 0; i < 50; i += 1) {
        const backOnTrip = await session.evaluate(
          "window.location.pathname === '/trips/da-lat-3-ngay' && Boolean(document.querySelector('[data-testid=\"day-panel\"]'))",
        );
        if (backOnTrip) break;
        await wait(60);
      }

      const itineraryActivityBackCheck = await session.evaluate(`(() => {
        const panel = document.querySelector('[data-testid="day-panel"]');
        const innerEnter = panel.querySelector('[data-day-panel-enter]');
        return {
          restoredPathname: window.location.pathname,
          enteredLatch: innerEnter?.dataset.entered === 'true',
          runningPanelAnims: panel.getAnimations({ subtree: true }).length,
        };
      })()`);

      return {
        tripsIndexCheck,
        initialLoadCheck,
        day2SwitchCheck,
        keyboardTabsCheck,
        accordionCheck,
        tabSkipCollapsedLinkCheck,
        itineraryActivityBackCheck,
        errors: session.errors,
        hydrationWarnings: session.hydrationWarnings,
      };
    },
  );

  // 4. Reduced-motion & 6-viewport responsive matrix across /ai-planner, /trips, and /trips/da-lat-3-ngay
  const reducedMotionApplicationCheck = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true, reducedMotion: true },
    async (session) => {
      await navigateAndWaitReady(session, `${siteUrl}/ai-planner`, true);
      const plannerReduced = await session.evaluate(`(async () => {
        const welcomeBtn = document.querySelector('ul[aria-label="Gợi ý câu hỏi"] button');
        welcomeBtn.click();
        await new Promise((r) => setTimeout(r, 0));
        const log = document.querySelector('[role="log"]');
        const userBubble = log.querySelector('article[aria-label="Bạn"]');
        const reply = log.querySelector('[data-testid="scripted-reply"]');
        const jumpbar = document.querySelector('[data-testid="mobile-planner-jumpbar"]');
        const previewBtn = Array.from(jumpbar.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Xem trước'),
        );
        previewBtn.click();
        const logRect = log.getBoundingClientRect();
        const previewRect = document.querySelector('[data-testid="trip-preview-mobile"]').getBoundingClientRect();
        return {
          userAnimName: getComputedStyle(userBubble).animationName,
          userOpacity: getComputedStyle(userBubble).opacity,
          replyAnimName: getComputedStyle(reply).animationName,
          replyOpacity: getComputedStyle(reply).opacity,
          instantPreviewJumpOffsetPx: Math.round((previewRect.top - logRect.top) * 100) / 100,
          instantPreviewVisibleInLog:
            log.scrollTop > 300 &&
            previewRect.top >= logRect.top &&
            previewRect.bottom <= logRect.bottom + 2,
        };
      })()`);

      await navigateAndWaitReady(session, `${siteUrl}/trips/da-lat-3-ngay`, true);
      const itineraryReduced = await session.evaluate(`(async () => {
        const tab2 = document.getElementById('day-tab-2');
        tab2.click();
        await new Promise((r) => setTimeout(r, 0));
        const panel = document.querySelector('[data-testid="day-panel"]');
        const innerEnter = panel.querySelector('[data-day-panel-enter]');
        const firstGrid = panel.querySelector('[role="region"]').parentElement;
        return {
          panelAnimName: innerEnter ? getComputedStyle(innerEnter).animationName : null,
          panelOpacity: innerEnter ? getComputedStyle(innerEnter).opacity : null,
          accordionTransitionDuration: getComputedStyle(firstGrid).transitionDuration,
        };
      })()`);

      return { plannerReduced, itineraryReduced, errors: session.errors };
    },
  );

  const viewportMatrix = [];
  for (const vp of configuredViewports) {
    const vpCheck = await withIsolatedSession(
      browserClient,
      {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.width <= 390 ? 2 : 1,
        mobile: vp.width < 768,
        touch: vp.width < 768,
      },
      async (session) => {
        const routes = ["/ai-planner", "/trips", "/trips/da-lat-3-ngay"];
        const routeResults = {};
        for (const route of routes) {
          await navigateAndWaitReady(session, `${siteUrl}${route}`, true);
          routeResults[route] = await session.evaluate(`(() => ({
            innerWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            nonAutoWillChange: Array.from(document.querySelectorAll('*')).filter(
              (el) => getComputedStyle(el).willChange !== 'auto',
            ).length,
          }))()`);
        }
        return {
          viewport: `${vp.width}x${vp.height}`,
          routeResults,
          errors: session.errors,
        };
      },
    );
    viewportMatrix.push(vpCheck);
  }

  const allViewportsClean = viewportMatrix.every(
    (v) =>
      v.errors.length === 0 &&
      Object.values(v.routeResults).every(
        (r) => r.scrollWidth <= r.innerWidth && r.nonAutoWillChange === 0,
      ),
  );

  const passed =
    // Desktop Planner
    plannerDesktop.initialCheck.initialScrollTop === 0 &&
    plannerDesktop.initialCheck.suggestionCount === 2 &&
    plannerDesktop.initialCheck.allSuggestionsVisibleInLog &&
    plannerDesktop.initialCheck.openingVisibleInLog &&
    plannerDesktop.initialCheck.emptyPreviewPresent &&
    plannerDesktop.initialCheck.liveRegionCount === 1 &&
    plannerDesktop.initialCheck.ariaBusyCount === 0 &&
    plannerDesktop.initialCheck.activeAnimationsAtLoad === 0 &&
    plannerDesktop.turnAtT0.activeElementIdAtT0 === "planner-prompt" &&
    plannerDesktop.turnAtT0.ariaBusyCountAtT0 === 0 &&
    plannerDesktop.turnAtT0.hasDemoLabelAtT0 &&
    plannerDesktop.turnAtT0.replyTextLengthAtT0 > 100 &&
    plannerDesktop.turnAtT0.replyTextLengthAtT0 === plannerDesktop.turnSettled.replyTextLengthAfterSettle &&
    plannerDesktop.turnAtT0.userAnim.name === "adora-planner-fade" &&
    plannerDesktop.turnAtT0.userAnim.duration === "0.16s" &&
    plannerDesktop.turnAtT0.userAnim.delay === "0s" &&
    plannerDesktop.turnAtT0.userAnim.transform === "none" &&
    plannerDesktop.turnAtT0.userAnim.tabIndex === -1 &&
    plannerDesktop.turnAtT0.replyAnim.name === "adora-planner-fade" &&
    plannerDesktop.turnAtT0.replyAnim.duration === "0.2s" &&
    plannerDesktop.turnAtT0.replyAnim.delay === "0.08s" &&
    plannerDesktop.turnAtT0.replyAnim.transform === "none" &&
    plannerDesktop.turnAtT0.previewAnim.name === "adora-preview-in" &&
    plannerDesktop.turnAtT0.previewAnim.duration === "0.2s" &&
    plannerDesktop.turnAtT0.previewAnim.delay === "0.08s" &&
    Math.abs(plannerDesktop.turnAtT0.scrollTopAtT0 - plannerDesktop.turnSettled.scrollTopAfterSettle) <= 1 &&
    plannerDesktop.turnSettled.userAnchorOffsetPx >= 8 &&
    plannerDesktop.turnSettled.userAnchorOffsetPx <= 16 &&
    plannerDesktop.turnSettled.userEnteredLatch &&
    plannerDesktop.turnSettled.replyEnteredLatch &&
    plannerDesktop.turnSettled.previewEnteredLatch &&
    plannerDesktop.turnSettled.userOpacity === "1" &&
    plannerDesktop.turnSettled.replyOpacity === "1" &&
    plannerDesktop.turnSettled.previewOpacity === "1" &&
    plannerDesktop.turnSettled.previewTransform === "none" &&
    plannerDesktop.turnSettled.previewDaysCount === 3 &&
    plannerDesktop.turnSettled.activeAnimationsAfterSettle === 0 &&
    plannerDesktop.secondScenarioSwitch.previewRemountedByKey &&
    plannerDesktop.secondScenarioSwitch.newPreviewAnimName === "adora-preview-in" &&
    plannerDesktop.secondScenarioSwitch.previewDaysCount === 2 &&
    plannerDesktop.secondScenarioSwitch.previewEnteredLatch &&
    plannerDesktop.secondScenarioSwitch.previewSettledOpacity === "1" &&
    plannerDesktop.secondScenarioSwitch.previewSettledTransform === "none" &&
    plannerDesktop.unsupportedTurn.hasDemoLabelAtT0 &&
    plannerDesktop.unsupportedTurn.animAtT0?.dataPlannerEnter === "reply" &&
    plannerDesktop.unsupportedTurn.animAtT0?.name === "adora-planner-fade" &&
    plannerDesktop.unsupportedTurn.animAtT0?.duration === "0.2s" &&
    plannerDesktop.unsupportedTurn.animAtT0?.delay === "0.08s" &&
    plannerDesktop.unsupportedTurn.animAtT0?.transform === "none" &&
    plannerDesktop.unsupportedTurn.settledOpacity === "1" &&
    plannerDesktop.unsupportedTurn.enteredLatch &&
    plannerDesktop.activityBackCheck.restoredPathname === "/ai-planner" &&
    plannerDesktop.activityBackCheck.allLatched &&
    plannerDesktop.activityBackCheck.runningPlannerAnimsCount === 0 &&
    plannerDesktop.activityBackCheck.scrollDeltaAfterBack <= 1 &&
    plannerDesktop.resetAndMouseSuggestion.afterReset.scrollTopAfterReset === 0 &&
    plannerDesktop.resetAndMouseSuggestion.afterReset.emptyPreviewRestored &&
    plannerDesktop.resetAndMouseSuggestion.afterReset.activeElementAfterReset === "planner-prompt" &&
    plannerDesktop.resetAndMouseSuggestion.activeElementAfterMouseWelcomeClick === "planner-prompt" &&
    plannerDesktop.externalRequests.length === 0 &&
    plannerDesktop.errors.length === 0 &&
    plannerDesktop.hydrationWarnings.length === 0 &&
    // Mobile Planner
    plannerMobile.touchWelcomeAndMobileTurn.activeIsUserTurn &&
    plannerMobile.touchWelcomeAndMobileTurn.activeIsNotPrompt &&
    plannerMobile.touchWelcomeAndMobileTurn.activeIsNotBody &&
    plannerMobile.touchWelcomeAndMobileTurn.jumpbarAnim.name === "adora-planner-fade" &&
    plannerMobile.touchWelcomeAndMobileTurn.jumpbarAnim.duration === "0.16s" &&
    plannerMobile.touchWelcomeAndMobileTurn.jumpbarAnim.transform === "none" &&
    plannerMobile.touchWelcomeAndMobileTurn.mobilePreviewAnim.name === "adora-planner-fade" &&
    plannerMobile.touchWelcomeAndMobileTurn.mobilePreviewAnim.duration === "0.2s" &&
    plannerMobile.touchWelcomeAndMobileTurn.mobilePreviewAnim.delay === "0.08s" &&
    plannerMobile.touchWelcomeAndMobileTurn.mobilePreviewAnim.transform === "none" &&
    Math.abs(
      plannerMobile.touchWelcomeAndMobileTurn.scrollTopAtT0 -
        plannerMobile.touchWelcomeAndMobileTurn.scrollTopAfterSettle,
    ) <= 1 &&
    plannerMobile.touchWelcomeAndMobileTurn.userAnchorOffsetPx >= 8 &&
    plannerMobile.touchWelcomeAndMobileTurn.userAnchorOffsetPx <= 16 &&
    plannerMobile.touchWelcomeAndMobileTurn.jumpbarEnteredLatch &&
    plannerMobile.touchWelcomeAndMobileTurn.mobilePreviewEnteredLatch &&
    plannerMobile.jumpbarScrollCheck.previewVisibleInLog &&
    plannerMobile.jumpbarScrollCheck.replyOffsetPx >= 8 &&
    plannerMobile.jumpbarScrollCheck.replyOffsetPx <= 16 &&
    plannerMobile.errors.length === 0 &&
    plannerMobile.hydrationWarnings.length === 0 &&
    // Itinerary Desktop
    itineraryDesktop.tripsIndexCheck.cardCount >= 2 &&
    itineraryDesktop.tripsIndexCheck.cardTransitionDuration === "0.18s" &&
    itineraryDesktop.tripsIndexCheck.imgRevealTransitionDuration === "1.2s" &&
    !itineraryDesktop.initialLoadCheck.hasDayPanelEnterOnInitialLoad &&
    itineraryDesktop.initialLoadCheck.panelAnimsOnInitialLoad === 0 &&
    itineraryDesktop.initialLoadCheck.allAriaControlsResolve &&
    itineraryDesktop.initialLoadCheck.collapsedCheck &&
    itineraryDesktop.day2SwitchCheck.stablePanelNode &&
    itineraryDesktop.day2SwitchCheck.hasInnerEnterAttr &&
    itineraryDesktop.day2SwitchCheck.tab2SelectedAtT0 &&
    itineraryDesktop.day2SwitchCheck.day2BudgetAtT0 !== itineraryDesktop.initialLoadCheck.day1Budget &&
    itineraryDesktop.day2SwitchCheck.animMeta?.name === "adora-panel-in" &&
    itineraryDesktop.day2SwitchCheck.animMeta?.duration === "0.22s" &&
    itineraryDesktop.day2SwitchCheck.animMeta?.opacityAtT0 >= 0.2 &&
    itineraryDesktop.day2SwitchCheck.animMeta?.tyAtT0 > 0 &&
    itineraryDesktop.day2SwitchCheck.animMeta?.tyAtT0 <= 6.5 &&
    itineraryDesktop.day2SwitchCheck.settledOpacity === "1" &&
    itineraryDesktop.day2SwitchCheck.settledTransform === "none" &&
    itineraryDesktop.day2SwitchCheck.enteredLatch &&
    itineraryDesktop.day2SwitchCheck.activeAnimsAfterSettle === 0 &&
    itineraryDesktop.keyboardTabsCheck.stablePanelNodeAfterKeyboard &&
    itineraryDesktop.keyboardTabsCheck.afterRight.activeId === "day-tab-3" &&
    itineraryDesktop.keyboardTabsCheck.afterRight.selected === "true" &&
    itineraryDesktop.keyboardTabsCheck.afterHome.activeId === "day-tab-1" &&
    itineraryDesktop.keyboardTabsCheck.afterHome.selected === "true" &&
    itineraryDesktop.keyboardTabsCheck.afterEnd.activeId === "day-tab-3" &&
    itineraryDesktop.keyboardTabsCheck.afterLeft.activeId === "day-tab-2" &&
    itineraryDesktop.accordionCheck.firstExpandedAtT0 === "false" &&
    itineraryDesktop.accordionCheck.secondExpandedAtT0 === "true" &&
    itineraryDesktop.accordionCheck.firstInertAtT0 === true &&
    itineraryDesktop.accordionCheck.secondInertAtT0 === false &&
    itineraryDesktop.accordionCheck.sameRegionNodeAcrossToggle &&
    itineraryDesktop.accordionCheck.firstCollapsedHeight <= 1 &&
    itineraryDesktop.accordionCheck.secondExpandedHeight > 80 &&
    itineraryDesktop.accordionCheck.firstCollapsedOpacity === "0" &&
    itineraryDesktop.accordionCheck.firstCollapsedGridRows === "0px" &&
    itineraryDesktop.accordionCheck.secondHasLinkInDom &&
    itineraryDesktop.tabSkipCollapsedLinkCheck.secondRegionHasLink &&
    itineraryDesktop.tabSkipCollapsedLinkCheck.secondRegionInert &&
    itineraryDesktop.tabSkipCollapsedLinkCheck.activeIsThirdButton &&
    !itineraryDesktop.tabSkipCollapsedLinkCheck.activeInsideCollapsedSecondRegion &&
    itineraryDesktop.itineraryActivityBackCheck.restoredPathname === "/trips/da-lat-3-ngay" &&
    itineraryDesktop.itineraryActivityBackCheck.enteredLatch &&
    itineraryDesktop.itineraryActivityBackCheck.runningPanelAnims === 0 &&
    itineraryDesktop.errors.length === 0 &&
    itineraryDesktop.hydrationWarnings.length === 0 &&
    // Reduced Motion & 6-Viewport Matrix
    reducedMotionApplicationCheck.plannerReduced.userAnimName === "none" &&
    reducedMotionApplicationCheck.plannerReduced.userOpacity === "1" &&
    reducedMotionApplicationCheck.plannerReduced.replyAnimName === "none" &&
    reducedMotionApplicationCheck.plannerReduced.replyOpacity === "1" &&
    reducedMotionApplicationCheck.plannerReduced.instantPreviewVisibleInLog &&
    reducedMotionApplicationCheck.itineraryReduced.panelAnimName === "none" &&
    reducedMotionApplicationCheck.itineraryReduced.panelOpacity === "1" &&
    reducedMotionApplicationCheck.errors.length === 0 &&
    allViewportsClean;

  return {
    executed: true,
    passed,
    plannerDesktop,
    plannerMobile,
    itineraryDesktop,
    reducedMotionApplicationCheck,
    viewportMatrix,
  };
}

async function capturePackageDEvidence(browserClient, packageDSuites) {
  await mkdir(packageDEvidenceDirectory, { recursive: true });
  const files = [];

  for (const profile of [
    { prefix: "desktop", width: 1440, height: 900, mobile: false },
    { prefix: "mobile", width: 390, height: 844, mobile: true },
  ]) {
    await withIsolatedSession(
      browserClient,
      {
        width: profile.width,
        height: profile.height,
        deviceScaleFactor: 1,
        mobile: profile.mobile,
        touch: profile.mobile,
      },
      async (session) => {
        // 01. Initial /ai-planner state
        await navigateAndWaitReady(session, `${siteUrl}/ai-planner`, true);
        await session.evaluate("document.fonts.ready.then(() => true)");
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-01-planner-initial.png`,
            false,
          ),
        );

        // 02. Mid-entrance of first scripted scenario turn (t = 100ms: user bubble fading in, reply & preview in backwards fill)
        await session.evaluate(`(async () => {
          const welcomeBtn = document.querySelector('ul[aria-label="Gợi ý câu hỏi"] button');
          welcomeBtn.click();
          await new Promise((r) => setTimeout(r, 0));
          for (const anim of document.getAnimations()) {
            anim.pause();
            anim.currentTime = 100;
          }
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-02-planner-turn-mid.png`,
            false,
          ),
        );

        // 03. Settled 3-day Đà Lạt scripted reply + Desktop Trip Preview / Mobile Jumpbar
        await session.evaluate(`(async () => {
          for (const anim of document.getAnimations()) anim.play();
          await Promise.all(
            document.getAnimations()
              .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          );
          const imgs = Array.from(document.querySelectorAll('img')).filter((img) => img.checkVisibility());
          for (const img of imgs) img.loading = 'eager';
          await Promise.all(
            imgs.map((img) =>
              img.complete
                ? Promise.resolve()
                : new Promise((r) => {
                    img.addEventListener('load', r, { once: true });
                    img.addEventListener('error', r, { once: true });
                  }),
            ),
          );
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-03-planner-scripted-settled.png`,
            false,
          ),
        );

        if (profile.mobile) {
          // 04 (Mobile). Jumpbar scrolled to inline mobile Trip Preview
          await session.evaluate(`(async () => {
            document.documentElement.dataset.motion = 'off';
            const previewBtn = Array.from(
              document.querySelectorAll('[data-testid="mobile-planner-jumpbar"] button'),
            ).find((b) => b.textContent?.includes('Xem trước'));
            previewBtn.click();
            delete document.documentElement.dataset.motion;
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          })()`);
          files.push(
            await captureScreenshotFile(
              session,
              packageDEvidenceDirectory,
              "mobile-04-planner-preview-jumped.png",
              false,
            ),
          );
        } else {
          // 04 (Desktop). Second scenario (2-day Đà Lạt) preview switch settled
          await session.evaluate(`(async () => {
            const sidebarButtons = Array.from(
              document.querySelectorAll('aside[aria-label="Thanh bên AI Planner"] section button'),
            );
            const twoDayBtn = sidebarButtons.find((b) => b.textContent?.includes('2 ngày'));
            twoDayBtn.click();
            await new Promise((r) => setTimeout(r, 0));
            await Promise.all(
              document.getAnimations()
                .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
                .map((a) => a.finished.catch(() => {})),
            );
            const imgs = Array.from(document.querySelectorAll('img')).filter((img) => img.checkVisibility());
            for (const img of imgs) img.loading = 'eager';
            await Promise.all(
              imgs.map((img) =>
                img.complete
                  ? Promise.resolve()
                  : new Promise((r) => {
                      img.addEventListener('load', r, { once: true });
                      img.addEventListener('error', r, { once: true });
                    }),
              ),
            );
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          })()`);
          files.push(
            await captureScreenshotFile(
              session,
              packageDEvidenceDirectory,
              "desktop-04-planner-2day-preview-settled.png",
              false,
            ),
          );
        }

        // 05. Unsupported prompt fallback settled
        await session.evaluate(`(async () => {
          const textarea = document.querySelector('#planner-prompt');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(textarea, 'Cho mình lịch trình đi sao Hoả');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise((r) => setTimeout(r, 0));
          textarea.closest('form').requestSubmit();
          await new Promise((r) => setTimeout(r, 0));
          await Promise.all(
            document.getAnimations()
              .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          );
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-05-planner-unsupported-settled.png`,
            false,
          ),
        );

        // 06. /trips index settled
        await navigateAndWaitReady(session, `${siteUrl}/trips`, true);
        await session.evaluate(`(async () => {
          await document.fonts.ready;
          const imgs = Array.from(document.querySelectorAll('img')).filter((img) => img.checkVisibility());
          for (const img of imgs) img.loading = 'eager';
          await Promise.all(
            imgs.map((img) =>
              img.complete
                ? Promise.resolve()
                : new Promise((r) => {
                    img.addEventListener('load', r, { once: true });
                    img.addEventListener('error', r, { once: true });
                  }),
            ),
          );
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-06-trips-index-settled.png`,
            false,
          ),
        );

        // 07. /trips/da-lat-3-ngay Day 1 initial state (scrolled to ItineraryExplorer)
        await navigateAndWaitReady(session, `${siteUrl}/trips/da-lat-3-ngay`, true);
        await session.evaluate(`(async () => {
          await document.fonts.ready;
          const tablist = document.querySelector('[role="tablist"]');
          tablist.scrollIntoView({ block: 'start', behavior: 'instant' });
          window.scrollBy(0, -24);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-07-itinerary-day1-initial.png`,
            false,
          ),
        );

        // 08. /trips/da-lat-3-ngay Day 2 switch mid-entrance (t = 70ms)
        await session.evaluate(`(async () => {
          const tab2 = document.getElementById('day-tab-2');
          tab2.click();
          await new Promise((r) => setTimeout(r, 0));
          const panel = document.querySelector('[data-testid="day-panel"]');
          for (const anim of panel.getAnimations({ subtree: true })) {
            anim.pause();
            anim.currentTime = 70;
          }
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-08-itinerary-day2-mid.png`,
            false,
          ),
        );

        // 09. /trips/da-lat-3-ngay Day 2 settled
        await session.evaluate(`(async () => {
          const panel = document.querySelector('[data-testid="day-panel"]');
          for (const anim of panel.getAnimations({ subtree: true })) anim.play();
          await Promise.all(
            panel
              .getAnimations({ subtree: true })
              .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          );
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-09-itinerary-day2-settled.png`,
            false,
          ),
        );

        // 10. /trips/da-lat-3-ngay Day 2 with first activity collapsed (0px) and second activity expanded
        await session.evaluate(`(async () => {
          const panel = document.querySelector('[data-testid="day-panel"]');
          const buttons = Array.from(panel.querySelectorAll('button[aria-expanded]'));
          buttons[0].click();
          buttons[1].click();
          await Promise.all(
            panel
              .getAnimations({ subtree: true })
              .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          );
          await new Promise((r) => setTimeout(r, 280));
        })()`);
        files.push(
          await captureScreenshotFile(
            session,
            packageDEvidenceDirectory,
            `${profile.prefix}-10-itinerary-accordion-expanded.png`,
            false,
          ),
        );
      },
    );
  }

  if (packageDSuites) {
    const telemetryPath = join(packageDEvidenceDirectory, "package-d-motion-telemetry.json");
    await writeFile(
      telemetryPath,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          siteUrl,
          description:
            "Package D Application Interactions telemetry (INV-17..INV-20, Errata E-9..E-10, P-6, N-4, N-7, B-5) across Desktop 1440x900, Mobile 390x844, and 6-viewport responsive matrix.",
          plannerDesktop: packageDSuites.plannerDesktop,
          plannerMobile: packageDSuites.plannerMobile,
          itineraryDesktop: packageDSuites.itineraryDesktop,
          reducedMotionApplicationCheck: packageDSuites.reducedMotionApplicationCheck,
          viewportMatrix: packageDSuites.viewportMatrix,
        },
        null,
        2,
      ) + "\n",
    );
    files.push(telemetryPath);
  }

  return {
    captured: true,
    directory: packageDEvidenceDirectory,
    fileCount: files.length,
    files,
  };
}

async function runPackageCDiscoverySuite(browserClient) {
  const destinationsUrl = `${siteUrl}/destinations`;
  const experiencesUrl = `${siteUrl}/experiences`;
  const destinationDetailUrl = `${siteUrl}/destinations/da-lat`;
  const experienceDetailUrl = `${siteUrl}/experiences/ca-phe-nho-giot-cao-nguyen`;

  // 1. /destinations: INV-12 (PageIntro + E-12 + E-6 Back), INV-13 (Featured Da Lat), INV-14 (chip vs typing + empty)
  const destinationsDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await session.send("Page.navigate", { url: destinationsUrl });
      await wait(120);

      const loadProbe = await session.evaluate(`(() => {
        const h1 = document.querySelector("h1.adora-intro-heading-rise");
        const eyebrow = document.querySelector("p.adora-intro-rise");
        const rightCol = document.querySelector(".adora-intro-rise:not(p)");
        const badge = rightCol?.querySelector(".demo-badge, [class*='border']");
        const featuredImg = document.querySelector('[data-image-settle="featured"]');
        const featuredFrame = featuredImg?.closest(".image-reveal");
        const featuredCard = document.querySelector('[aria-labelledby="featured-heading"] [class*="lg:col-start-8"]');
        const h1Cs = h1 ? getComputedStyle(h1) : null;
        const rightCs = rightCol ? getComputedStyle(rightCol) : null;
        const imgCs = featuredImg ? getComputedStyle(featuredImg) : null;
        const frameCs = featuredFrame ? getComputedStyle(featuredFrame) : null;
        const cardCs = featuredCard ? getComputedStyle(featuredCard) : null;
        return {
          h1AnimationName: h1Cs?.animationName ?? null,
          h1Duration: h1Cs?.animationDuration ?? null,
          h1Delay: h1Cs?.animationDelay ?? null,
          h1Opacity: h1Cs?.opacity ?? null,
          eyebrowDelay: eyebrow ? getComputedStyle(eyebrow).animationDelay : null,
          rightColAnimationName: rightCs?.animationName ?? null,
          rightColDelay: rightCs?.animationDelay ?? null,
          hasBadgeInRightCol: Boolean(rightCol && rightCol.textContent?.includes("bản") || rightCol?.querySelector("span")),
          featuredImgAnimationName: imgCs?.animationName ?? null,
          featuredImgDuration: imgCs?.animationDuration ?? null,
          featuredImgOpacity: imgCs?.opacity ?? null,
          featuredFrameTransform: frameCs?.transform ?? null,
          featuredCardTransform: cardCs?.transform ?? null,
        };
      })()`);

      await wait(900);

      const settledProbe = await session.evaluate(`(() => {
        const h1 = document.querySelector("h1");
        const rightCol = document.querySelector(".adora-intro-rise:not(p)");
        const featuredImg = document.querySelector('[data-image-settle="featured"]');
        const featuredCard = document.querySelector('[aria-labelledby="featured-heading"] [class*="lg:col-start-8"]');
        return {
          h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
          rightColOpacity: rightCol ? getComputedStyle(rightCol).opacity : null,
          featuredImgOpacity: featuredImg ? getComputedStyle(featuredImg).opacity : null,
          featuredCardTransform: featuredCard ? getComputedStyle(featuredCard).transform : null,
        };
      })()`);

      // INV-14 + N-5: chip vs typing & empty state
      const filterProbe = await session.evaluate(`(async () => {
        const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));
        const waitRaf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const listBefore = document.querySelector('[data-testid="destination-results"]');
        const chips = Array.from(document.querySelectorAll("button.filter-chip"));
        const targetChip = chips.find((btn) => btn.getAttribute("aria-pressed") === "false");
        targetChip.click();
        await waitRaf();
        const listAfterChip = document.querySelector('[data-testid="destination-results"]');
        const chipHasAttr = listAfterChip?.hasAttribute("data-filter-settle") ?? false;
        const chipCs = listAfterChip ? getComputedStyle(listAfterChip) : null;
        const chipAnimName = chipCs?.animationName ?? null;
        const chipAnimDuration = chipCs?.animationDuration ?? null;
        const chipTransform = chipCs?.transform ?? null;
        const chipAnim = document.getAnimations().find(
          (a) => a.effect?.target === listAfterChip && a.animationName === "adora-filter-settle",
        );

        await waitMs(300);
        // Reset first chip to get full list, then test typing stability without remount
        const allChip = document.querySelector('button.filter-chip');
        allChip.click();
        await waitRaf();
        await waitMs(300);

        const listBeforeType = document.querySelector('[data-testid="destination-results"]');
        const search = document.querySelector('input[type="search"]');
        search.focus();
        const activeBefore = document.activeElement === search;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(search, "Da");
        search.dispatchEvent(new Event("input", { bubbles: true }));
        await waitRaf();
        const listAfterType = document.querySelector('[data-testid="destination-results"]');
        const typingRemounted = listBeforeType !== listAfterType;
        const typingRestartedSettle = document.getAnimations().some(
          (a) => a.effect?.target === listAfterType && a.animationName === "adora-filter-settle" && a.playState === "running",
        );

        // N-5: Empty state settle
        setter.call(search, "zzzz-khong-co");
        search.dispatchEvent(new Event("input", { bubbles: true }));
        await waitRaf();
        const emptyNode = document.querySelector('[data-testid="destination-empty"]');
        const emptyHasAttr = emptyNode?.hasAttribute("data-filter-settle") ?? false;
        const emptyCs = emptyNode ? getComputedStyle(emptyNode) : null;
        const emptyAnimName = emptyCs?.animationName ?? null;
        await waitMs(280);
        const emptySettledOpacity = emptyNode ? getComputedStyle(emptyNode).opacity : null;
        const activePreserved = document.activeElement === search;

        // Clear back cleanly
        const resetBtn = emptyNode?.querySelector("button");
        resetBtn?.click();
        await waitMs(260);

        return {
          chipChangedNode: listBefore !== listAfterChip,
          chipHasAttr,
          chipAnimName,
          chipAnimDuration,
          chipAnimSeen: Boolean(chipAnim),
          chipTransform,
          activeBefore,
          activePreserved,
          typingRemounted,
          typingRestartedSettle,
          emptyHasAttr,
          emptyAnimName,
          emptySettledOpacity,
        };
      })()`);

      // INV-12 / E-6: Server Component PageIntro survives Next.js <Activity> navigation & Back
      await session.evaluate(`(() => {
        const link = document.querySelector('a[href="/destinations/da-lat"]');
        link?.click();
      })()`);
      await wait(900);
      const onDetail = await session.evaluate(`location.pathname`);
      await session.evaluate(`history.back()`);
      await wait(700);
      const backProbe = await session.evaluate(`(() => {
        const h1 = document.querySelector("h1.adora-intro-heading-rise");
        const rightCol = document.querySelector(".adora-intro-rise:not(p)");
        const featuredImg = document.querySelector('[data-image-settle="featured"]');
        return {
          pathname: location.pathname,
          h1Visible: Boolean(h1?.checkVisibility?.()) && getComputedStyle(h1).opacity === "1",
          rightColVisible: Boolean(rightCol?.checkVisibility?.()) && getComputedStyle(rightCol).opacity === "1",
          featuredImgVisible: Boolean(featuredImg?.checkVisibility?.()) && getComputedStyle(featuredImg).opacity === "1",
        };
      })()`);

      const passed =
        loadProbe.h1AnimationName === "adora-intro-heading-rise" &&
        loadProbe.h1Duration === "0.48s" &&
        loadProbe.h1Delay === "0s" &&
        loadProbe.h1Opacity === "1" &&
        loadProbe.rightColAnimationName === "adora-intro-rise" &&
        loadProbe.rightColDelay === "0s" &&
        loadProbe.featuredImgAnimationName === "adora-featured-settle" &&
        loadProbe.featuredImgDuration === "0.76s" &&
        loadProbe.featuredImgOpacity === "1" &&
        loadProbe.featuredFrameTransform === "none" &&
        loadProbe.featuredCardTransform === "none" &&
        settledProbe.h1Opacity === "1" &&
        settledProbe.rightColOpacity === "1" &&
        settledProbe.featuredImgOpacity === "1" &&
        settledProbe.featuredCardTransform === "none" &&
        filterProbe.chipChangedNode &&
        filterProbe.chipHasAttr &&
        filterProbe.chipAnimName === "adora-filter-settle" &&
        filterProbe.chipAnimDuration === "0.22s" &&
        filterProbe.chipTransform === "none" &&
        filterProbe.activeBefore &&
        filterProbe.activePreserved &&
        !filterProbe.typingRemounted &&
        !filterProbe.typingRestartedSettle &&
        filterProbe.emptyHasAttr &&
        filterProbe.emptyAnimName === "adora-filter-settle" &&
        filterProbe.emptySettledOpacity === "1" &&
        onDetail === "/destinations/da-lat" &&
        backProbe.pathname === "/destinations" &&
        backProbe.h1Visible &&
        backProbe.rightColVisible &&
        backProbe.featuredImgVisible &&
        session.errors.length === 0 &&
        session.hydrationWarnings.length === 0;

      return {
        passed,
        loadProbe,
        settledProbe,
        filterProbe,
        onDetail,
        backProbe,
        errors: session.errors,
        hydrationWarnings: session.hydrationWarnings,
      };
    },
  );

  // 2. /experiences: INV-12, INV-14 (filterSettleKey + empty), INV-15 / E-11 (ArrowUpRight keyboard focus parity + index reveal=false)
  const experiencesDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900 },
    async (session) => {
      await navigateAndWaitReady(session, experiencesUrl, false);
      await wait(600);

      // Focus first experience card link using real keyboard Tab so :focus-visible engages
      await session.evaluate(`(() => {
        const firstLink = document.querySelector('[data-testid="experience-results"] a[href^="/experiences/"]');
        const prev = firstLink?.closest("div")?.parentElement;
        const focusable = Array.from(document.querySelectorAll('a[href], button:not([disabled]), input'));
        const idx = focusable.indexOf(firstLink);
        if (idx > 0) focusable[idx - 1].focus();
      })()`);
      await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await wait(340);

      const focusAndStaticCheck = await session.evaluate(`(() => {
        const active = document.activeElement;
        const isExperienceLink = Boolean(active?.matches('[data-testid="experience-results"] a[href^="/experiences/"]'));
        const matchesFocusVisible = Boolean(active?.matches(":focus-visible"));
        const svg = active?.querySelector("svg");
        const svgCs = svg ? getComputedStyle(svg) : null;
        const listItems = Array.from(document.querySelectorAll('[data-testid="experience-results"] > li'));
        const indexRevealNodes = listItems.filter((li) => li.hasAttribute("data-reveal")).length;
        return {
          isExperienceLink,
          matchesFocusVisible,
          svgTransform: svgCs?.transform ?? null,
          svgTranslate: svgCs?.translate ?? null,
          svgColor: svgCs?.color ?? null,
          svgTransitionDuration: svgCs?.transitionDuration ?? null,
          indexCardCount: listItems.length,
          indexRevealNodes,
        };
      })()`);

      const filterCheck = await session.evaluate(`(async () => {
        const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));
        const waitRaf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const listBefore = document.querySelector('[data-testid="experience-results"]');
        const chips = Array.from(document.querySelectorAll("button.filter-chip"));
        const targetChip = chips.find((b) => b.getAttribute("aria-pressed") === "false");
        targetChip.click();
        await waitRaf();
        const listAfterChip = document.querySelector('[data-testid="experience-results"]');
        const chipHasAttr = listAfterChip?.hasAttribute("data-filter-settle") ?? false;
        const chipCs = listAfterChip ? getComputedStyle(listAfterChip) : null;
        const chipAnimName = chipCs?.animationName ?? null;
        const chipAnimDuration = chipCs?.animationDuration ?? null;
        const chipTransform = chipCs?.transform ?? null;
        await waitMs(280);

        chips[0].click();
        await waitRaf();
        await waitMs(280);

        const listBeforeType = document.querySelector('[data-testid="experience-results"]');
        const search = document.querySelector('input[type="search"]');
        search.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(search, "cà phê");
        search.dispatchEvent(new Event("input", { bubbles: true }));
        await waitRaf();
        const listAfterType = document.querySelector('[data-testid="experience-results"]');
        const typingRemounted = listBeforeType !== listAfterType;

        setter.call(search, "zzzz-khong-co");
        search.dispatchEvent(new Event("input", { bubbles: true }));
        await waitRaf();
        const emptyNode = document.querySelector('[data-testid="experience-empty"]');
        const emptyHasAttr = emptyNode?.hasAttribute("data-filter-settle") ?? false;
        const emptyCs = emptyNode ? getComputedStyle(emptyNode) : null;
        const emptyAnimName = emptyCs?.animationName ?? null;
        await waitMs(280);
        const emptySettledOpacity = emptyNode ? getComputedStyle(emptyNode).opacity : null;

        return {
          chipChangedNode: listBefore !== listAfterChip,
          chipHasAttr,
          chipAnimName,
          chipAnimDuration,
          chipTransform,
          typingRemounted,
          emptyHasAttr,
          emptyAnimName,
          emptySettledOpacity,
        };
      })()`);

      const passed =
        focusAndStaticCheck.isExperienceLink &&
        focusAndStaticCheck.matchesFocusVisible &&
        (focusAndStaticCheck.svgTranslate !== "none" || focusAndStaticCheck.svgTransform !== "none") &&
        focusAndStaticCheck.indexCardCount > 0 &&
        focusAndStaticCheck.indexRevealNodes === 0 &&
        filterCheck.chipChangedNode &&
        filterCheck.chipHasAttr &&
        filterCheck.chipAnimName === "adora-filter-settle" &&
        filterCheck.chipAnimDuration === "0.22s" &&
        filterCheck.chipTransform === "none" &&
        !filterCheck.typingRemounted &&
        filterCheck.emptyHasAttr &&
        filterCheck.emptyAnimName === "adora-filter-settle" &&
        filterCheck.emptySettledOpacity === "1" &&
        session.errors.length === 0 &&
        session.hydrationWarnings.length === 0;

      return {
        passed,
        focusAndStaticCheck,
        filterCheck,
        errors: session.errors,
        hydrationWarnings: session.hydrationWarnings,
      };
    },
  );

  // 3. /destinations/da-lat: INV-16, E-7, N-6
  const destinationDetailDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, destinationDetailUrl, false);

      const loadProbe = await session.evaluate(`(() => {
        const heroImg = document.querySelector('main section:first-of-type img[data-image-settle]');
        const h1 = document.querySelector('h1.adora-hero-heading-rise');
        const badgeParent = document.querySelector('main section:first-of-type .adora-load-rise:has(.border)');
        const proseReveals = document.querySelectorAll('[aria-labelledby="intro-heading"] div.max-w-3xl [data-reveal]').length;
        const proseParentReveal = Boolean(document.querySelector('[aria-labelledby="intro-heading"] div.max-w-3xl[data-reveal]'));
        const highlightLiWithReveal = document.querySelectorAll('[aria-labelledby="highlights-heading"] ol > li[data-reveal]').length;
        const highlightInnerReveals = document.querySelectorAll('[aria-labelledby="highlights-heading"] ol > li > [data-reveal]').length;
        const tripLiWithReveal = document.querySelectorAll('[aria-labelledby="trip-heading"] ol > li[data-reveal]').length;
        const tripInnerReveals = document.querySelectorAll('[aria-labelledby="trip-heading"] ol > li > [data-reveal]').length;
        const gridLiReveals = document.querySelectorAll('[aria-labelledby="experiences-heading"] [data-testid="experience-results"] > li[data-reveal]').length;
        const ctaSection = document.querySelector('[aria-labelledby="planner-cta-heading"]');
        const ctaInner = ctaSection?.querySelector('.adora-container[data-reveal]');
        return {
          heroImgSettle: Boolean(heroImg),
          heroImgOpacity: heroImg ? getComputedStyle(heroImg).opacity : null,
          h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
          h1Delay: h1 ? getComputedStyle(h1).animationDelay : null,
          badgeDelay: badgeParent ? getComputedStyle(badgeParent).animationDelay : null,
          proseReveals,
          proseParentReveal,
          highlightLiWithReveal,
          highlightInnerReveals,
          tripLiWithReveal,
          tripInnerReveals,
          gridLiReveals,
          ctaSectionHasReveal: ctaSection?.hasAttribute("data-reveal") ?? false,
          ctaInnerHasReveal: Boolean(ctaInner),
        };
      })()`);

      await session.evaluate(`(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        document.documentElement.style.scrollBehavior = "auto";
        const pageHeight = document.documentElement.scrollHeight;
        for (let y = 0; y <= pageHeight; y += Math.max(window.innerHeight * 0.6, 360)) {
          window.scrollTo(0, y);
          await delay(120);
        }
        window.scrollTo(0, pageHeight);
        await delay(950);
      })()`);

      const afterScroll = await session.evaluate(`(() => ({
        pendingCount: document.querySelectorAll('[data-reveal="pending"]').length,
        visibleCount: document.querySelectorAll('[data-reveal="visible"]').length,
        hiddenVisibleCheck: Array.from(document.querySelectorAll('[data-reveal]')).filter((el) => getComputedStyle(el).opacity !== "1").length,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      }))()`);

      const passed =
        loadProbe.heroImgSettle &&
        loadProbe.heroImgOpacity === "1" &&
        loadProbe.h1Opacity === "1" &&
        loadProbe.h1Delay === "0s" &&
        loadProbe.badgeDelay === "0s" &&
        loadProbe.proseReveals === 0 &&
        !loadProbe.proseParentReveal &&
        loadProbe.highlightLiWithReveal === 0 &&
        loadProbe.highlightInnerReveals >= 4 &&
        loadProbe.tripLiWithReveal === 0 &&
        loadProbe.tripInnerReveals === 3 &&
        loadProbe.gridLiReveals >= 1 &&
        !loadProbe.ctaSectionHasReveal &&
        loadProbe.ctaInnerHasReveal &&
        afterScroll.pendingCount === 0 &&
        afterScroll.visibleCount >= 8 &&
        afterScroll.hiddenVisibleCheck === 0 &&
        afterScroll.horizontalOverflowPx === 0 &&
        session.errors.length === 0 &&
        session.hydrationWarnings.length === 0;

      return {
        passed,
        loadProbe,
        afterScroll,
        errors: session.errors,
        hydrationWarnings: session.hydrationWarnings,
      };
    },
  );

  // 4. /experiences/ca-phe-nho-giot-cao-nguyen: INV-16, N-6, B-7
  const experienceDetailDesktop = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, experienceDetailUrl, false);

      const loadProbe = await session.evaluate(`(() => {
        const heroImg = document.querySelector('img[data-image-settle]');
        const h1 = document.querySelector('h1.adora-hero-heading-rise');
        const rightHero = document.querySelector('.adora-load-rise:has([class*="italic"])');
        const proseReveals = document.querySelectorAll('[aria-labelledby="story-heading"] p[data-reveal], [aria-labelledby="story-heading"] div.space-y-6[data-reveal]').length;
        const aside = document.querySelector('aside[aria-label="Thông tin gợi ý"]');
        const asideReveals = aside ? aside.querySelectorAll('[data-reveal]').length : -1;
        const asideHasReveal = aside?.hasAttribute("data-reveal") ?? false;
        const noteOpacity = aside?.querySelector('[role="note"]') ? getComputedStyle(aside.querySelector('[role="note"]')).opacity : null;
        const relatedReveals = document.querySelectorAll('[aria-labelledby="related-heading"] ul > li[data-reveal]').length;
        return {
          heroImgSettle: Boolean(heroImg),
          heroImgOpacity: heroImg ? getComputedStyle(heroImg).opacity : null,
          h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
          h1Delay: h1 ? getComputedStyle(h1).animationDelay : null,
          rightHeroDelay: rightHero ? getComputedStyle(rightHero).animationDelay : null,
          proseReveals,
          asideReveals,
          asideHasReveal,
          noteOpacity,
          relatedReveals,
        };
      })()`);

      await session.evaluate(`(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        document.documentElement.style.scrollBehavior = "auto";
        const pageHeight = document.documentElement.scrollHeight;
        for (let y = 0; y <= pageHeight; y += Math.max(window.innerHeight * 0.6, 360)) {
          window.scrollTo(0, y);
          await delay(120);
        }
        window.scrollTo(0, pageHeight);
        await delay(950);
      })()`);

      const afterScroll = await session.evaluate(`(() => ({
        pendingCount: document.querySelectorAll('[data-reveal="pending"]').length,
        visibleCount: document.querySelectorAll('[data-reveal="visible"]').length,
        hiddenVisibleCheck: Array.from(document.querySelectorAll('[data-reveal]')).filter((el) => getComputedStyle(el).opacity !== "1").length,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      }))()`);

      const passed =
        loadProbe.heroImgSettle &&
        loadProbe.heroImgOpacity === "1" &&
        loadProbe.h1Opacity === "1" &&
        loadProbe.h1Delay === "0s" &&
        loadProbe.rightHeroDelay === "0s" &&
        loadProbe.proseReveals === 0 &&
        loadProbe.asideReveals === 0 &&
        !loadProbe.asideHasReveal &&
        loadProbe.noteOpacity === "1" &&
        loadProbe.relatedReveals >= 1 &&
        afterScroll.pendingCount === 0 &&
        afterScroll.visibleCount >= 4 &&
        afterScroll.hiddenVisibleCheck === 0 &&
        afterScroll.horizontalOverflowPx === 0 &&
        session.errors.length === 0 &&
        session.hydrationWarnings.length === 0;

      return {
        passed,
        loadProbe,
        afterScroll,
        errors: session.errors,
        hydrationWarnings: session.hydrationWarnings,
      };
    },
  );

  // 5. Reduced Motion + data-motion="off" fail-visible + Touch hover guard on Discovery
  const overridesAndTouch = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, mobile: true, touch: true, reducedMotion: true },
    async (session) => {
      await navigateAndWaitReady(session, destinationsUrl, false);
      const reducedMetrics = await session.evaluate(`(() => {
        const h1 = document.querySelector("h1");
        const img = document.querySelector('[data-image-settle="featured"]');
        return {
          h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
          h1AnimName: h1 ? getComputedStyle(h1).animationName : null,
          h1AnimDuration: h1 ? getComputedStyle(h1).animationDuration : null,
          imgOpacity: img ? getComputedStyle(img).opacity : null,
          imgTransform: img ? getComputedStyle(img).transform : null,
        };
      })()`);

      await navigateAndWaitReady(session, experiencesUrl, false);
      const touchMetrics = await session.evaluate(`(() => {
        const img = document.querySelector('.image-reveal img');
        return {
          matchesHoverHover: matchMedia("(hover: hover) and (pointer: fine)").matches,
          imgTransitionDuration: img ? getComputedStyle(img).transitionDuration : null,
        };
      })()`);

      const passed =
        reducedMetrics.h1Opacity === "1" &&
        reducedMetrics.h1AnimName === "none" &&
        (reducedMetrics.h1AnimDuration === "0s" || reducedMetrics.h1AnimDuration === "0.01ms") &&
        reducedMetrics.imgOpacity === "1" &&
        reducedMetrics.imgTransform === "none" &&
        !touchMetrics.matchesHoverHover &&
        session.errors.length === 0;

      return {
        passed,
        reducedMetrics,
        touchMetrics,
        errors: session.errors,
      };
    },
  );

  // 6. 6-Viewport Responsive Matrix across all 4 discovery routes
  const viewportRoutes = [
    { key: "destinations", url: destinationsUrl },
    { key: "destination-detail", url: destinationDetailUrl },
    { key: "experiences", url: experiencesUrl },
    { key: "experience-detail", url: experienceDetailUrl },
  ];
  const viewportMatrix = [];
  for (const vp of configuredViewports) {
    const mobile = vp.width < 768;
    const row = await withIsolatedSession(
      browserClient,
      { width: vp.width, height: vp.height, mobile, touch: mobile },
      async (session) => {
        const results = {};
        for (const route of viewportRoutes) {
          await navigateAndWaitReady(session, route.url, false);
          await session.evaluate(`(async () => {
            const delay = (ms) => new Promise((r) => setTimeout(r, ms));
            document.documentElement.style.scrollBehavior = "auto";
            const h = document.documentElement.scrollHeight;
            for (let y = 0; y <= h; y += Math.max(window.innerHeight * 0.75, 420)) {
              window.scrollTo(0, y);
              await delay(90);
            }
            window.scrollTo(0, h);
            await delay(700);
          })()`);
          results[route.key] = await session.evaluate(`({
            horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            pendingCount: document.querySelectorAll('[data-reveal="pending"]').length,
          })`);
        }
        const passed =
          Object.values(results).every((r) => r.horizontalOverflowPx === 0 && r.pendingCount === 0) &&
          session.errors.length === 0 &&
          session.hydrationWarnings.length === 0;
        return { viewport: vp.name, width: vp.width, passed, results, errors: session.errors };
      },
    );
    viewportMatrix.push(row);
  }

  const passed =
    destinationsDesktop.passed &&
    experiencesDesktop.passed &&
    destinationDetailDesktop.passed &&
    experienceDetailDesktop.passed &&
    overridesAndTouch.passed &&
    viewportMatrix.every((row) => row.passed);

  return {
    passed,
    destinationsDesktop,
    experiencesDesktop,
    destinationDetailDesktop,
    experienceDetailDesktop,
    overridesAndTouch,
    viewportMatrix,
  };
}

async function capturePackageCEvidence(browserClient, packageCSuites) {
  await mkdir(packageCEvidenceDirectory, { recursive: true });
  const files = [];

  for (const profile of [
    { prefix: "desktop", width: 1440, height: 900, mobile: false },
    { prefix: "mobile", width: 390, height: 844, mobile: true },
  ]) {
    await withIsolatedSession(
      browserClient,
      {
        width: profile.width,
        height: profile.height,
        deviceScaleFactor: 1,
        mobile: profile.mobile,
        touch: profile.mobile,
      },
      async (session) => {
        // 1. /destinations initial & settled + chip settle + empty
        await navigateAndWaitReady(session, `${siteUrl}/destinations`, false);
        await wait(850);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-destinations-top.png`, false));

        await session.evaluate(`(() => {
          document.querySelector('[aria-labelledby="featured-heading"]')?.scrollIntoView({ behavior: "auto", block: "start" });
        })()`);
        await wait(300);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-destinations-featured.png`, false));

        await session.evaluate(`(() => {
          const chips = Array.from(document.querySelectorAll("button.filter-chip"));
          const chip = chips.find((b) => b.getAttribute("aria-pressed") === "false");
          chip?.click();
          const fieldset = chip?.closest("fieldset");
          const topTarget = fieldset ?? document.querySelector('[data-testid="destination-count"]');
          if (topTarget) {
            const y = topTarget.getBoundingClientRect().top + window.scrollY - 24;
            window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
          }
        })()`);
        await wait(320);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-destinations-filtered.png`, false));

        // 2. /experiences initial + keyboard focus-visible + filtered browser + settled grid
        await navigateAndWaitReady(session, `${siteUrl}/experiences`, false);
        await wait(600);
        if (!profile.mobile) {
          await session.evaluate(`(() => {
            const firstLink = document.querySelector('[data-testid="experience-results"] a[href^="/experiences/"]');
            const focusable = Array.from(document.querySelectorAll('a[href], button:not([disabled]), input'));
            const idx = focusable.indexOf(firstLink);
            if (idx > 0) focusable[idx - 1].focus();
          })()`);
          await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
          await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
          await wait(340);
          files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-experiences-focus.png`, false));
        } else {
          files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-experiences-top.png`, false));
        }

        await session.evaluate(`(() => {
          const chips = Array.from(document.querySelectorAll("button.filter-chip"));
          const chip = chips.find((b) => b.textContent?.includes("Ẩm thực")) ?? chips.find((b) => b.getAttribute("aria-pressed") === "false");
          chip?.click();
          const fieldset = chip?.closest("fieldset");
          const topTarget = fieldset ?? document.querySelector('[data-testid="experience-count"]');
          if (topTarget) {
            const y = topTarget.getBoundingClientRect().top + window.scrollY - 24;
            window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
          }
        })()`);
        await wait(320);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-experiences-filtered.png`, false));

        // 3. /destinations/da-lat hero & highlights/trip reveal
        await navigateAndWaitReady(session, `${siteUrl}/destinations/da-lat`, false);
        await wait(900);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-da-lat-hero.png`, false));
        await session.evaluate(`(async () => {
          const h = document.documentElement.scrollHeight;
          for (let y = 0; y <= h; y += Math.max(window.innerHeight * 0.6, 360)) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          document.querySelector('[aria-labelledby="highlights-heading"]')?.scrollIntoView({ behavior: "auto", block: "start" });
          await new Promise((r) => setTimeout(r, 850));
        })()`);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-da-lat-highlights.png`, false));

        // 4. /experiences/ca-phe-nho-giot-cao-nguyen story+aside & related+cta
        await navigateAndWaitReady(session, `${siteUrl}/experiences/ca-phe-nho-giot-cao-nguyen`, false);
        await wait(900);
        await session.evaluate(`(() => {
          document.querySelector('[aria-labelledby="story-heading"]')?.scrollIntoView({ behavior: "auto", block: "start" });
        })()`);
        await wait(300);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-experience-detail-story.png`, false));

        await session.evaluate(`(async () => {
          const h = document.documentElement.scrollHeight;
          for (let y = 0; y <= h; y += Math.max(window.innerHeight * 0.6, 360)) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          document.querySelector('[aria-labelledby="related-heading"]')?.scrollIntoView({ behavior: "auto", block: "start" });
          await new Promise((r) => setTimeout(r, 850));
        })()`);
        files.push(await captureScreenshotFile(session, packageCEvidenceDirectory, `${profile.prefix}-experience-detail-related.png`, false));
      },
    );
  }

  if (packageCSuites) {
    const telemetryPath = join(packageCEvidenceDirectory, "package-c-telemetry.json");
    await writeFile(telemetryPath, `${JSON.stringify(packageCSuites, null, 2)}\n`, "utf8");
    files.push(telemetryPath);
  }

  return {
    captured: true,
    directory: packageCEvidenceDirectory,
    fileCount: files.length,
    files,
  };
}

async function runPackageEFinalSuite(browserClient) {
  const routesToTraverse = [
    "/",
    "/destinations",
    "/destinations/da-lat",
    "/experiences",
    "/experiences/ca-phe-nho-giot-cao-nguyen",
    "/ai-planner",
    "/trips",
    "/trips/da-lat-3-ngay",
  ];

  async function runCrossRouteJourney(width, height, mobile) {
    return withIsolatedSession(browserClient, { width, height, mobile }, async (session) => {
      await navigateAndWaitReady(session, `${siteUrl}/`, true);
      const forwardSteps = [];
      for (const route of routesToTraverse) {
        if (route !== "/") {
          await session.evaluate(`(() => {
            const target = ${JSON.stringify(route)};
            const existing = Array.from(document.querySelectorAll('a[href]')).find((a) => a.getAttribute('href') === target);
            if (existing) {
              existing.click();
              return 'link-click';
            }
            window.history.pushState({}, '', target);
            window.dispatchEvent(new PopStateEvent('popstate'));
            return 'fallback';
          })()`);
          const start = Date.now();
          while (Date.now() - start < 8000) {
            const matched = await session.evaluate(`window.location.pathname === ${JSON.stringify(route)}`);
            if (matched) break;
            await wait(80);
          }
          await wait(350);
          const onRoute = await session.evaluate(`window.location.pathname === ${JSON.stringify(route)}`);
          if (!onRoute) {
            await navigateAndWaitReady(session, `${siteUrl}${route}`, route === "/");
          } else {
            await session.evaluate(`(async () => {
              if (document.fonts?.ready) await document.fonts.ready;
              for (const img of document.querySelectorAll('img')) {
                if (img.complete) continue;
                await new Promise((r) => {
                  const t = setTimeout(r, 1200);
                  img.addEventListener('load', () => { clearTimeout(t); r(); }, { once: true });
                  img.addEventListener('error', () => { clearTimeout(t); r(); }, { once: true });
                });
              }
            })()`);
          }
        }
        const settled = await session.evaluate(`(async () => {
          const delay = (ms) => new Promise((r) => setTimeout(r, ms));
          document.documentElement.style.scrollBehavior = 'auto';
          const h = document.documentElement.scrollHeight;
          for (let y = 0; y <= h; y += Math.max(window.innerHeight * 0.75, 420)) {
            window.scrollTo(0, y);
            await delay(100);
          }
          window.scrollTo(0, h);
          await delay(250);
          await Promise.all(
            document.getAnimations()
              .filter((anim) => anim.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((anim) => anim.finished.catch(() => {})),
          );
          const pending = document.querySelectorAll('[data-reveal="pending"]').length;
          const main = document.querySelector('main');
          const h1 = document.querySelector('h1');
          return {
            path: window.location.pathname,
            pendingCount: pending,
            overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            mainVisible: main ? main.checkVisibility() && getComputedStyle(main).opacity === '1' : true,
            h1Visible: h1 ? h1.checkVisibility() && getComputedStyle(h1).opacity === '1' : true,
          };
        })()`);
        forwardSteps.push(settled);
      }

      // Dedicated real client-link Activity back/forward roundtrip: / -> /destinations -> /destinations/da-lat -> /experiences -> /ai-planner -> /trips/da-lat-3-ngay -> history.back() chain
      await navigateAndWaitReady(session, `${siteUrl}/`, true);
      await wait(400);
      const activityBackChain = [];
      for (const nextRoute of ["/destinations", "/destinations/da-lat", "/experiences", "/ai-planner", "/trips/da-lat-3-ngay"]) {
        const clicked = await session.evaluate(`(() => {
          const target = ${JSON.stringify(nextRoute)};
          const link = Array.from(document.querySelectorAll('a[href]')).find((a) => a.getAttribute('href') === target && a.checkVisibility());
          if (!link) return false;
          link.click();
          return true;
        })()`);
        if (clicked) {
          const start = Date.now();
          while (Date.now() - start < 5000) {
            if (await session.evaluate(`window.location.pathname === ${JSON.stringify(nextRoute)}`)) break;
            await wait(60);
          }
          await wait(350);
        } else {
          await navigateAndWaitReady(session, `${siteUrl}${nextRoute}`, false);
        }
        await session.evaluate(`window.scrollTo(0, Math.min(480, document.documentElement.scrollHeight))`);
        await wait(220);
      }
      for (let step = 0; step < 3; step += 1) {
        await session.evaluate(`window.history.back()`);
        await wait(300);
        const state = await session.evaluate(`(async () => {
          const delay = (ms) => new Promise((r) => setTimeout(r, ms));
          document.documentElement.style.scrollBehavior = 'auto';
          const h = document.documentElement.scrollHeight;
          for (let y = 0; y <= h; y += Math.max(window.innerHeight * 0.75, 420)) {
            window.scrollTo(0, y);
            await delay(60);
          }
          window.scrollTo(0, 0);
          await delay(120);
          await Promise.all(
            document.getAnimations()
              .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          );
          const h1 = Array.from(document.querySelectorAll('h1')).find((el) => el.checkVisibility());
          const visibleReveals = Array.from(document.querySelectorAll('[data-reveal-variant]')).filter((el) => el.checkVisibility());
          const stuckVisible = visibleReveals.filter((el) => el.getAttribute('data-reveal') === 'pending').length;
          return {
            path: window.location.pathname,
            h1Visible: h1 ? getComputedStyle(h1).opacity === '1' : true,
            visibleRevealCount: visibleReveals.length,
            stuckAboveFold: stuckVisible,
            runningFiniteAnimations: document.getAnimations().filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity && a.playState === 'running').length,
          };
        })()`);
        activityBackChain.push(state);
      }
      await session.evaluate(`window.history.forward()`);
      await wait(450);
      const forwardRestored = await session.evaluate(`(() => {
        const h1 = Array.from(document.querySelectorAll('h1')).find((el) => el.checkVisibility());
        const visibleReveals = Array.from(document.querySelectorAll('[data-reveal-variant]')).filter((el) => el.checkVisibility());
        return {
          path: window.location.pathname,
          h1Visible: h1 ? getComputedStyle(h1).opacity === '1' : true,
          visiblePendingRemaining: visibleReveals.filter((el) => el.getAttribute('data-reveal') === 'pending').length,
        };
      })()`);

      const passed =
        forwardSteps.every((s) => s.pendingCount === 0 && s.overflowPx === 0 && s.mainVisible && s.h1Visible) &&
        activityBackChain.every((s) => s.h1Visible && s.stuckAboveFold === 0 && s.runningFiniteAnimations === 0) &&
        forwardRestored.h1Visible &&
        forwardRestored.visiblePendingRemaining === 0 &&
        session.hydrationWarnings.length === 0 &&
        session.errors.length === 0;

      return {
        passed,
        forwardSteps,
        activityBackChain,
        forwardRestored,
        hydrationWarnings: session.hydrationWarnings,
        errors: session.errors,
      };
    });
  }

  const desktopJourney = await runCrossRouteJourney(1440, 900, false);
  const mobileJourney = await runCrossRouteJourney(390, 844, true);

  const reducedMotionAndKillSwitch = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, reducedMotion: true },
    async (session) => {
      const checks = [];
      for (const route of ["/", "/destinations", "/destinations/da-lat", "/ai-planner", "/trips/da-lat-3-ngay"]) {
        await navigateAndWaitReady(session, `${siteUrl}${route}`, route === "/");
        await wait(120);
        const rmState = await session.evaluate(`(() => {
          const reveals = Array.from(document.querySelectorAll('[data-reveal-variant]'));
          const h1 = document.querySelector('h1');
          return {
            route: window.location.pathname,
            h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
            h1Transform: h1 ? getComputedStyle(h1).transform : null,
            allRevealsVisible: reveals.every((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none'),
          };
        })()`);
        checks.push(rmState);
      }

      // Kill switch & @media print on /
      await navigateAndWaitReady(session, `${siteUrl}/`, true);
      await wait(120);
      await session.evaluate(`document.documentElement.dataset.motion = "off"`);
      await wait(50);
      const killSwitchState = await session.evaluate(`(() => {
        const reveals = Array.from(document.querySelectorAll('[data-reveal-variant]'));
        return {
          dataMotion: document.documentElement.dataset.motion,
          allRevealsOpacity1: reveals.every((el) => getComputedStyle(el).opacity === '1'),
        };
      })()`);
      await session.evaluate(`delete document.documentElement.dataset.motion`);
      await session.send("Emulation.setEmulatedMedia", { media: "print" });
      await wait(50);
      const printState = await session.evaluate(`(() => {
        const reveals = Array.from(document.querySelectorAll('[data-reveal-variant]'));
        return {
          allRevealsVisibleInPrint: reveals.every((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none'),
        };
      })()`);
      await session.send("Emulation.setEmulatedMedia", { media: "" });

      return {
        passed:
          checks.every((c) => c.h1Opacity === "1" && c.allRevealsVisible) &&
          killSwitchState.allRevealsOpacity1 &&
          printState.allRevealsVisibleInPrint &&
          session.errors.length === 0,
        checks,
        killSwitchState,
        printState,
        errors: session.errors,
      };
    },
  );

  const desktopAccessibilityAudit = await withIsolatedSession(browserClient, { width: 1440, height: 900 }, async (session) => {
    await navigateAndWaitReady(session, `${siteUrl}/`, true);
    await wait(300);
    await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await wait(80);
    const skipLinkCheck = await session.evaluate(`(() => {
      const el = document.activeElement;
      const rect = el?.getBoundingClientRect?.();
      const target = document.getElementById('main-content');
      const headerLinks = Array.from(document.querySelectorAll('header nav a'));
      const statusDot = document.querySelector('span[aria-label="Bản xem trước sẵn sàng"]');
      return {
        activeHref: el?.getAttribute?.('href') ?? null,
        visibleOnFocus: Boolean(rect && rect.width > 40 && rect.height > 20),
        mainContentExists: Boolean(target),
        inv01HeaderUntouched: headerLinks.every((a) => !a.hasAttribute('data-reveal') && !a.hasAttribute('data-header-underline')),
        backlogStatusDot: statusDot
          ? { present: true, tagName: statusDot.tagName, roleAttr: statusDot.getAttribute('role'), ariaLabel: statusDot.getAttribute('aria-label') }
          : { present: false },
      };
    })()`);

    await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await wait(60);
    const focusVisibleIndicatorCheck = await session.evaluate(`(() => {
      const el = document.activeElement;
      const style = el ? getComputedStyle(el) : null;
      return {
        tagName: el?.tagName ?? null,
        outlineStyle: style?.outlineStyle ?? null,
        outlineWidth: style?.outlineWidth ?? null,
        hasVisibleFocusRing: Boolean(style && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0),
      };
    })()`);

    // Check Backlog #1: /destinations reset button focus loss (non-failing backlog probe)
    await navigateAndWaitReady(session, `${siteUrl}/destinations`, false);
    await wait(250);
    await session.evaluate(`(() => {
      const input = document.querySelector('input[type="search"]');
      if (!input) throw new Error('Search input not found on /destinations');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'zzz-nonexistent-query');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await wait(220);
    const backlogResetFocus = await session.evaluate(`(() => {
      const empty = document.querySelector('[data-testid="destination-empty"]');
      const resetBtn = empty?.querySelector('button');
      if (!empty || !resetBtn) return { triggeredEmpty: false };
      resetBtn.focus();
      const beforeTag = document.activeElement?.tagName ?? null;
      resetBtn.click();
      return {
        triggeredEmpty: true,
        beforeClickActiveTag: beforeTag,
      };
    })()`);
    await wait(120);
    const afterResetFocusTag = await session.evaluate(`document.activeElement?.tagName ?? null`);

    // Check Backlog #2: /trips/da-lat-3-ngay inactive-tab aria-controls + keyboard day switching
    await navigateAndWaitReady(session, `${siteUrl}/trips/da-lat-3-ngay`, false);
    await wait(250);
    const backlogTabAria = await session.evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      return tabs.map((tab) => {
        const controls = tab.getAttribute('aria-controls');
        return {
          id: tab.id,
          ariaSelected: tab.getAttribute('aria-selected'),
          ariaControls: controls,
          controlledElementExistsInDom: Boolean(controls && document.getElementById(controls)),
        };
      });
    })()`);

    return {
      skipLinkCheck,
      focusVisibleIndicatorCheck,
      backlogResetFocus,
      afterResetFocusTag,
      backlogTabAria,
      errors: session.errors,
    };
  });

  // Mobile drawer check (INV-02 approved-deferred untouched functional contract)
  const mobileDrawerCheck = await withIsolatedSession(
    browserClient,
    { width: 390, height: 844, mobile: true },
    async (mobileSession) => {
      await navigateAndWaitReady(mobileSession, `${siteUrl}/`, true);
      await wait(250);
      await mobileSession.evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]')?.click()`);
      await wait(120);
      const openState = await mobileSession.evaluate(`(() => {
        const btn = document.querySelector('button[aria-controls="mobile-navigation"]');
        const nav = document.getElementById('mobile-navigation');
        const navStyle = nav ? getComputedStyle(nav) : null;
        return {
          expanded: btn?.getAttribute('aria-expanded'),
          navVisible: Boolean(nav?.checkVisibility()),
          inv02DrawerStaticDisplay: navStyle?.display === 'grid',
        };
      })()`);
      await mobileSession.evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]')?.click()`);
      await wait(120);
      const closedState = await mobileSession.evaluate(`(() => {
        const btn = document.querySelector('button[aria-controls="mobile-navigation"]');
        const nav = document.getElementById('mobile-navigation');
        return {
          expanded: btn?.getAttribute('aria-expanded'),
          navVisible: Boolean(nav?.checkVisibility()),
        };
      })()`);
      return {
        passed:
          openState.expanded === "true" &&
          openState.navVisible &&
          closedState.expanded === "false" &&
          !closedState.navVisible &&
          mobileSession.errors.length === 0,
        openState,
        closedState,
        errors: mobileSession.errors,
      };
    },
  );

  const accessibilityAndKeyboardAudit = {
    passed:
      desktopAccessibilityAudit.skipLinkCheck.activeHref === "#main-content" &&
      desktopAccessibilityAudit.skipLinkCheck.visibleOnFocus &&
      desktopAccessibilityAudit.skipLinkCheck.mainContentExists &&
      desktopAccessibilityAudit.skipLinkCheck.inv01HeaderUntouched &&
      desktopAccessibilityAudit.focusVisibleIndicatorCheck.hasVisibleFocusRing &&
      mobileDrawerCheck.passed &&
      desktopAccessibilityAudit.errors.length === 0,
    skipLinkCheck: desktopAccessibilityAudit.skipLinkCheck,
    focusVisibleIndicatorCheck: desktopAccessibilityAudit.focusVisibleIndicatorCheck,
    mobileDrawerCheck,
    deferredInventory: {
      INV_01: { status: "approved_deferred", headerUntouched: desktopAccessibilityAudit.skipLinkCheck.inv01HeaderUntouched },
      INV_02: { status: "approved_deferred", drawerFunctionalAndUntouched: mobileDrawerCheck.passed },
    },
    preExistingBacklog: {
      resetButtonFocusLoss: {
        ...desktopAccessibilityAudit.backlogResetFocus,
        afterClickActiveTag: desktopAccessibilityAudit.afterResetFocusTag,
        dropsToBody: desktopAccessibilityAudit.afterResetFocusTag === "BODY",
      },
      itineraryInactiveTabAriaControls: {
        tabs: desktopAccessibilityAudit.backlogTabAria,
        danglingInactiveControlsCount: desktopAccessibilityAudit.backlogTabAria.filter((t) => !t.controlledElementExistsInDom).length,
      },
      aiPlannerPreviewStatusDot: desktopAccessibilityAudit.skipLinkCheck.backlogStatusDot,
    },
    errors: [...desktopAccessibilityAudit.errors, ...mobileDrawerCheck.errors],
  };

  // 6-viewport disclosure & overflow confirmation on /, /ai-planner, /experiences/ca-phe-nho-giot-cao-nguyen
  const staticDisclosureAndSixViewportCheck = [];
  for (const vp of configuredViewports) {
    const row = await withIsolatedSession(
      browserClient,
      { width: vp.width, height: vp.height, mobile: vp.width < 768 },
      async (session) => {
        await navigateAndWaitReady(session, `${siteUrl}/ai-planner`, false);
        await wait(180);
        const plannerCheck = await session.evaluate(`(() => {
          const subtitle = Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.includes('Chế độ demo'));
          return {
            overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            demoVisible: subtitle ? subtitle.checkVisibility() && getComputedStyle(subtitle).opacity === '1' : false,
          };
        })()`);
        await navigateAndWaitReady(session, `${siteUrl}/experiences/ca-phe-nho-giot-cao-nguyen`, false);
        await wait(220);
        const expCheck = await session.evaluate(`(() => {
          const note = document.querySelector('[role="note"]');
          return {
            overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
            priceDisclaimerVisible: note ? note.checkVisibility() && getComputedStyle(note).opacity === '1' : false,
          };
        })()`);
        return {
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          passed:
            plannerCheck.overflowPx === 0 &&
            plannerCheck.demoVisible &&
            expCheck.overflowPx === 0 &&
            expCheck.priceDisclaimerVisible,
          plannerCheck,
          expCheck,
        };
      },
    );
    staticDisclosureAndSixViewportCheck.push(row);
  }

  const passed =
    desktopJourney.passed &&
    mobileJourney.passed &&
    reducedMotionAndKillSwitch.passed &&
    accessibilityAndKeyboardAudit.passed &&
    staticDisclosureAndSixViewportCheck.every((v) => v.passed);

  return {
    passed,
    desktopJourney,
    mobileJourney,
    reducedMotionAndKillSwitch,
    accessibilityAndKeyboardAudit,
    staticDisclosureAndSixViewportCheck,
  };
}

async function capturePackageEEvidence(browserClient, packageESuites, fullSummary) {
  await mkdir(packageEEvidenceDirectory, { recursive: true });
  const files = [];

  await withIsolatedSession(browserClient, { width: 1440, height: 900 }, async (session) => {
    await navigateAndWaitReady(session, `${siteUrl}/`, true);
    await wait(900);
    files.push(await captureScreenshotFile(session, packageEEvidenceDirectory, "desktop-final-home-settled.png", false));

    await navigateAndWaitReady(session, `${siteUrl}/ai-planner`, false);
    await wait(300);
    await session.evaluate(`document.querySelector('[data-testid="planner-welcome"] button')?.click()`);
    await wait(500);
    files.push(await captureScreenshotFile(session, packageEEvidenceDirectory, "desktop-final-planner-settled.png", false));
  });

  await withIsolatedSession(browserClient, { width: 390, height: 844, mobile: true }, async (session) => {
    await navigateAndWaitReady(session, `${siteUrl}/`, true);
    await wait(900);
    files.push(await captureScreenshotFile(session, packageEEvidenceDirectory, "mobile-final-home-settled.png", false));

    await navigateAndWaitReady(session, `${siteUrl}/trips/da-lat-3-ngay`, false);
    await wait(300);
    await session.evaluate(`document.getElementById('day-tab-2')?.click()`);
    await wait(350);
    files.push(await captureScreenshotFile(session, packageEEvidenceDirectory, "mobile-final-itinerary-settled.png", false));
  });

  const resultsPath = join(packageEEvidenceDirectory, "final-verification-results.json");
  await writeFile(
    resultsPath,
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        siteUrl,
        packageE: packageESuites,
        integratedSummary: fullSummary ?? null,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  files.push(resultsPath);

  return {
    captured: true,
    directory: packageEEvidenceDirectory,
    fileCount: files.length,
    files,
  };
}

const profileDirectory = await mkdtemp(join(tmpdir(), "adora-web-0-4-chrome-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

try {
  await mkdir(outputDirectory, { recursive: true });
  const versionInfo = await waitForBrowserEndpoint();
  const browserClient = createCdpConnection(versionInfo.webSocketDebuggerUrl);
  await browserClient.ready;

  let summary;
  if (strictDevOnly) {
    if (!strictDevUrl) {
      throw new Error("--strict-dev-only requires ADORA_STRICT_DEV_URL to be set");
    }
    console.error(`Verifying Package A+B React Strict Mode against ${strictDevUrl}...`);
    const lifecycleOnly = await withIsolatedSession(
      browserClient,
      { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
      async (session) => {
        await navigateAndWaitReady(session, strictDevUrl, true);
        await wait(700);
        const beforeScroll = await session.evaluate(`({
          ioConstructed: window.__adoraMotionProbe.revealIoConstructed,
          activeObserversWhilePending: window.__adoraMotionProbe.activeRevealObservers.size,
          philosophyPendingCount: document.querySelectorAll('#philosophy [data-reveal="pending"]').length,
          homepagePendingCount: document.querySelectorAll('[data-reveal="pending"]').length,
        })`);

        await session.evaluate(`(async () => {
          const delay = (ms) => new Promise((r) => setTimeout(r, ms));
          document.documentElement.style.scrollBehavior = 'auto';
          const pageHeight = document.documentElement.scrollHeight;
          for (let y = 0; y <= pageHeight; y += Math.max(window.innerHeight * 0.75, 420)) {
            window.scrollTo(0, y);
            await delay(80);
          }
          window.scrollTo(0, pageHeight);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await Promise.all(
            document.getAnimations()
              .filter((anim) => anim.effect?.getComputedTiming?.().iterations !== Infinity)
              .map((anim) => anim.finished.catch(() => {})),
          );
        })()`);

        const afterScroll = await session.evaluate(`(() => {
          const units = Array.from(document.querySelectorAll('[data-reveal-variant]'));
          return {
            pendingRemaining: document.querySelectorAll('[data-reveal="pending"]').length,
            allSettledVisible: units.every(
              (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
            ),
            activeObserversAfterReveal: window.__adoraMotionProbe.activeRevealObservers.size,
            scrollListenersAfterReveal: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
          };
        })()`);

        const passed =
          beforeScroll.ioConstructed >= 40 &&
          beforeScroll.activeObserversWhilePending === 20 &&
          beforeScroll.philosophyPendingCount === 3 &&
          beforeScroll.homepagePendingCount === 20 &&
          afterScroll.pendingRemaining === 0 &&
          afterScroll.allSettledVisible &&
          afterScroll.activeObserversAfterReveal === 0 &&
          afterScroll.scrollListenersAfterReveal === 0 &&
          session.hydrationWarnings.length === 0 &&
          session.errors.length === 0;

        return {
          executed: true,
          passed,
          strictDevUrl,
          beforeScroll,
          afterScroll,
          hydrationWarnings: session.hydrationWarnings,
          errors: session.errors,
        };
      },
    );
    summary = {
      browser: versionInfo.Browser,
      mode: "strict-dev-only",
      strictModeDevCheck: lifecycleOnly,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!lifecycleOnly.passed) process.exitCode = 1;
  } else if (capturePackageBEvidenceOnly) {
    console.error("Package B Focused Reproduction: Capturing desktop & mobile screenshot sequence only...");
    const evidenceCapture = await capturePackageBEvidence(browserClient, null);
    summary = {
      browser: versionInfo.Browser,
      mode: "capture-package-b-evidence-only",
      siteUrl,
      evidenceCapture,
    };
    console.log(JSON.stringify(summary, null, 2));
  } else if (capturePackageCEvidenceOnly) {
    console.error("Package C Focused Reproduction: Capturing desktop & mobile discovery motion screenshots only...");
    const packageCSuites = await runPackageCDiscoverySuite(browserClient);
    const evidenceCapture = await capturePackageCEvidence(browserClient, packageCSuites);
    summary = {
      browser: versionInfo.Browser,
      mode: "capture-package-c-evidence-only",
      siteUrl,
      packageC: {
        executed: true,
        passed: packageCSuites.passed,
      },
      evidenceCapture,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!packageCSuites.passed) process.exitCode = 1;
  } else if (capturePackageDEvidenceOnly) {
    console.error("Package D Focused Reproduction: Capturing desktop & mobile application interaction screenshots only...");
    const packageDSuites = await runPackageDApplicationSuite(browserClient);
    const evidenceCapture = await capturePackageDEvidence(browserClient, packageDSuites);
    summary = {
      browser: versionInfo.Browser,
      mode: "capture-package-d-evidence-only",
      siteUrl,
      packageD: {
        executed: true,
        passed: packageDSuites.passed,
      },
      evidenceCapture,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!packageDSuites.passed) process.exitCode = 1;
  } else if (capturePackageEEvidenceOnly) {
    console.error("Package E Focused Verification: Running Package E integration & accessibility acceptance suite...");
    const packageESuites = await runPackageEFinalSuite(browserClient);
    const evidenceCapture = await capturePackageEEvidence(browserClient, packageESuites, null);
    summary = {
      browser: versionInfo.Browser,
      mode: "capture-package-e-evidence-only",
      siteUrl,
      packageE: {
        implemented: true,
        executed: true,
        ...packageESuites,
      },
      evidenceCapture,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!packageESuites.passed) process.exitCode = 1;
  } else {
    console.error("Package A [1/4]: Verifying SSR & No-JS fail-visible contract...");
    const ssrAndNoJs = await runSsrAndNoJsSuite(browserClient);

    console.error("Package A [2/4]: Verifying IntersectionObserver & E-1/E-4 choreography...");
    const intersectionObserver = await runIntersectionObserverSuite(browserClient);

    console.error("Package A [3/4]: Verifying fail-visible overrides, focus, & E-2 stagger rules...");
    const failVisible = await runFailVisibleSuite(browserClient);

    console.error("Package A [4/4]: Verifying Next.js Activity lifecycle & 6-viewport CSS/hover matrix...");
    const lifecycleAndActivity = await runLifecycleAndActivitySuite(browserClient);
    const responsiveAndCss = await runResponsiveAndCssSuite(browserClient);

    console.error("Package B [1/1]: Verifying Homepage Cinematic Experience (INV-03..INV-11 & Errata E-5..E-8)...");
    const packageBSuites = await runPackageBHomepageSuite(browserClient);

    let evidenceCapture = { captured: false };
    if (capturePackageBEvidenceFlag) {
      console.error("Package B Evidence: Capturing desktop & mobile screenshot sequence + frame timeline...");
      evidenceCapture = await capturePackageBEvidence(browserClient, packageBSuites.timelines);
    }

    console.error("Package C [1/1]: Verifying Discovery Experience (INV-12..INV-16, E-6, E-7, E-11, E-12, N-5, N-6)...");
    const packageCSuites = await runPackageCDiscoverySuite(browserClient);

    let packageCEvidenceCapture = { captured: false };
    if (capturePackageCEvidenceFlag) {
      console.error("Package C Evidence: Capturing desktop & mobile screenshot sequence + motion telemetry...");
      packageCEvidenceCapture = await capturePackageCEvidence(browserClient, packageCSuites);
    }

    console.error("Package D [1/1]: Verifying Application Interactions (INV-17..INV-20, E-9..E-10, P-6, N-4, N-7, B-5)...");
    const packageDSuites = await runPackageDApplicationSuite(browserClient);

    let packageDEvidenceCapture = { captured: false };
    if (capturePackageDEvidenceFlag) {
      console.error("Package D Evidence: Capturing desktop & mobile screenshot sequence + motion telemetry...");
      packageDEvidenceCapture = await capturePackageDEvidence(browserClient, packageDSuites);
    }

    console.error("Package E [1/1]: Verifying End-to-End Integration, Activity Navigation, Accessibility & Backlog Probes...");
    const packageESuites = await runPackageEFinalSuite(browserClient);

    const packageAPassed =
      ssrAndNoJs.passed &&
      intersectionObserver.passed &&
      failVisible.passed &&
      lifecycleAndActivity.passed &&
      responsiveAndCss.passed;

    const packageBPassed = packageBSuites.passed;
    const packageCPassed = packageCSuites.passed;
    const packageDPassed = packageDSuites.passed;
    const packageEPassed = packageESuites.passed;

    summary = {
      browser: versionInfo.Browser,
      siteUrl,
      packageA: {
        executed: true,
        passed: packageAPassed,
        ssrAndNoJs,
        intersectionObserver,
        failVisible,
        lifecycleAndActivity,
        responsiveAndCss,
      },
      packageB: {
        implemented: true,
        executed: true,
        passed: packageBPassed,
        heroDesktop: packageBSuites.heroDesktop,
        heroMobile: packageBSuites.heroMobile,
        heroInteractionAndE6: packageBSuites.heroInteractionAndE6,
        editorialDesktop: packageBSuites.editorialDesktop,
        editorialMobileAndOverrides: packageBSuites.editorialMobileAndOverrides,
        sampleBubbleFailVisible: packageBSuites.sampleBubbleFailVisible,
        evidenceCapture,
      },
      packageC: {
        implemented: true,
        executed: true,
        passed: packageCPassed,
        destinationsDesktop: packageCSuites.destinationsDesktop,
        experiencesDesktop: packageCSuites.experiencesDesktop,
        destinationDetailDesktop: packageCSuites.destinationDetailDesktop,
        experienceDetailDesktop: packageCSuites.experienceDetailDesktop,
        overridesAndTouch: packageCSuites.overridesAndTouch,
        viewportMatrix: packageCSuites.viewportMatrix,
        evidenceCapture: packageCEvidenceCapture,
      },
      packageD: {
        implemented: true,
        executed: true,
        passed: packageDPassed,
        plannerDesktop: packageDSuites.plannerDesktop,
        plannerMobile: packageDSuites.plannerMobile,
        itineraryDesktop: packageDSuites.itineraryDesktop,
        reducedMotionApplicationCheck: packageDSuites.reducedMotionApplicationCheck,
        viewportMatrix: packageDSuites.viewportMatrix,
        evidenceCapture: packageDEvidenceCapture,
      },
      packageE: {
        implemented: true,
        executed: true,
        passed: packageEPassed,
        desktopJourney: packageESuites.desktopJourney,
        mobileJourney: packageESuites.mobileJourney,
        reducedMotionAndKillSwitch: packageESuites.reducedMotionAndKillSwitch,
        accessibilityAndKeyboardAudit: packageESuites.accessibilityAndKeyboardAudit,
        staticDisclosureAndSixViewportCheck: packageESuites.staticDisclosureAndSixViewportCheck,
        evidenceCapture: { captured: false },
      },
    };

    if (capturePackageEEvidenceFlag) {
      console.error("Package E Evidence: Capturing compact final-state screenshots & verification results JSON...");
      summary.packageE.evidenceCapture = await capturePackageEEvidence(browserClient, packageESuites, summary);
    }

    console.log(JSON.stringify(summary, null, 2));
    if (!packageAPassed || !packageBPassed || !packageCPassed || !packageDPassed || !packageEPassed) process.exitCode = 1;
  }

  browserClient.close();
} finally {
  chrome.kill();
  await Promise.race([
    new Promise((resolvePromise) => chrome.once("exit", resolvePromise)),
    wait(2000),
  ]);
  const resolvedProfile = resolve(profileDirectory);
  const safeTemporaryProfile =
    resolvedProfile.startsWith(resolve(tmpdir())) &&
    basename(resolvedProfile).startsWith("adora-web-0-4-chrome-");
  if (safeTemporaryProfile) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(resolvedProfile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 4) {
          console.warn(`Temporary Chrome profile cleanup deferred: ${error.message}`);
        } else {
          await wait(250);
        }
      }
    }
  }
}

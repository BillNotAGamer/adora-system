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
 * Later packages (D, C, E) extend this script additively without weakening Package A or B checks.
 */

const chromePath = process.env.ADORA_CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const siteUrl = process.env.ADORA_WEB_URL ?? "http://127.0.0.1:3100";
const strictDevUrl = process.env.ADORA_STRICT_DEV_URL ?? null;
const strictDevOnly = process.argv.includes("--strict-dev-only");
const capturePackageBEvidenceOnly = process.argv.includes("--capture-package-b-evidence-only");
const capturePackageBEvidenceFlag =
  capturePackageBEvidenceOnly || process.argv.includes("--capture-package-b-evidence");
const CDP_COMMAND_TIMEOUT_MS = Number(process.env.ADORA_CDP_TIMEOUT_MS ?? "25000");
const outputDirectory = resolve(process.env.ADORA_VERIFY_OUTPUT ?? "docs/reports/assets/web-design-0-4");
const packageBEvidenceDirectory = resolve(
  process.env.ADORA_PACKAGE_B_EVIDENCE_DIR ?? "docs/reports/assets/web-design-0-4/package-b",
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

    const packageAPassed =
      ssrAndNoJs.passed &&
      intersectionObserver.passed &&
      failVisible.passed &&
      lifecycleAndActivity.passed &&
      responsiveAndCss.passed;

    const packageBPassed = packageBSuites.passed;

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
      futurePackages: {
        packageD: { implemented: false, executed: false },
        packageC: { implemented: false, executed: false },
        packageE: { implemented: false, executed: false },
      },
    };

    console.log(JSON.stringify(summary, null, 2));
    if (!packageAPassed || !packageBPassed) process.exitCode = 1;
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

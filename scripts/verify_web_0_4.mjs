import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
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
 * Later packages (B, D, C, E) extend this script additively without weakening Package A checks.
 */

const chromePath = process.env.ADORA_CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const siteUrl = process.env.ADORA_WEB_URL ?? "http://127.0.0.1:3100";
const strictDevUrl = process.env.ADORA_STRICT_DEV_URL ?? null;
const strictDevOnly = process.argv.includes("--strict-dev-only");
const outputDirectory = resolve(process.env.ADORA_VERIFY_OUTPUT ?? "docs/reports/assets/web-design-0-4");
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
    send(method, params = {}, sessionId = undefined) {
      nextId += 1;
      const id = nextId;
      return new Promise((resolvePromise, rejectPromise) => {
        pending.set(id, { method, resolve: resolvePromise, reject: rejectPromise });
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
  const philosophyRevealVariantCount = (html.match(/data-reveal-variant="section"/g) ?? []).length;
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
        const streamHiddenAncestor = Boolean(section?.closest('[hidden]'));
        return {
          sectionPresent: Boolean(section),
          unitCount: units.length,
          anyDataRevealAttr: units.some((el) => el.hasAttribute('data-reveal')),
          allBaseStyleVisible: units.every((el) => {
            const s = getComputedStyle(el);
            return s.opacity === '1' && s.transform === 'none';
          }),
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
        return {
          sectionPresent: Boolean(section),
          unitCount: units.length,
          anyDataRevealAttr: units.some((el) => el.hasAttribute('data-reveal')),
          allLaidOutAndVisible: units.every((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.opacity === '1' && s.transform === 'none' && r.width > 0 && r.height > 0;
          }),
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
        return {
          unitCount: units.length,
          anyDataRevealAttr: units.some((el) => el.hasAttribute('data-reveal')),
          allLaidOutAndVisible: units.every((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.opacity === '1' && s.transform === 'none' && r.width > 0 && r.height > 0;
          }),
        };
      })()`);
      return { ...domCheck, errors: session.errors };
    },
  );

  const passed =
    response.status === 200 &&
    !hasAnyDataRevealStateAttr &&
    philosophyRevealVariantCount === 3 &&
    hasPhilosophyHeading &&
    noJsScriptDisabled.sectionPresent &&
    noJsScriptDisabled.unitCount === 3 &&
    !noJsScriptDisabled.anyDataRevealAttr &&
    noJsScriptDisabled.allBaseStyleVisible &&
    noJsScriptDisabled.sectionOpacity === "1" &&
    noJsScriptDisabled.errors.length === 0 &&
    clientBundlesBlockedDesktop.sectionPresent &&
    clientBundlesBlockedDesktop.unitCount === 3 &&
    !clientBundlesBlockedDesktop.anyDataRevealAttr &&
    clientBundlesBlockedDesktop.allLaidOutAndVisible &&
    clientBundlesBlockedDesktop.errors.length === 0 &&
    clientBundlesBlockedMobile.unitCount === 3 &&
    !clientBundlesBlockedMobile.anyDataRevealAttr &&
    clientBundlesBlockedMobile.allLaidOutAndVisible &&
    clientBundlesBlockedMobile.errors.length === 0;

  return {
    executed: true,
    passed,
    ssrHtml: {
      status: response.status,
      hasAnyDataRevealStateAttr,
      philosophyRevealVariantCount,
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
          pendingTransitionsAfterReveal: window.__adoraMotionProbe.revealHistory.filter((h) => h.value === 'pending').length,
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
      await navigateAndWaitReady(session, siteUrl, false);
      const jumpResult = await session.evaluate(`(async () => {
        const beforePendingCount = document.querySelectorAll('#philosophy [data-reveal="pending"]').length;
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
        return {
          beforePendingCount,
          totalPendingAfterJump: pendingElements.length,
          pendingInViewport,
          philosophyStates,
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
    fastScrollJumpTest.pendingInViewport === 0 &&
    fastScrollJumpTest.totalPendingAfterJump === 0 &&
    fastScrollJumpTest.philosophyStates.every((s) => s === "visible") &&
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
      await navigateAndWaitReady(session, siteUrl, false);
      const beforeScrollStats = await session.evaluate(`({
        activeObservers: window.__adoraMotionProbe.activeRevealObservers.size,
        scrollListeners: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
      })`);

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
        return {
          pathname: window.location.pathname,
          visibleUnitCount: visibleUnits.length,
          allRemainVisible: visibleUnits.every(
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

  // Case 2: Pending on / (unscrolled) -> navigate to /destinations (Activity hides / & cleans up observers) -> Back -> scroll reveals cleanly
  const activityPendingRestoreCheck = await withIsolatedSession(
    browserClient,
    { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
    async (session) => {
      await navigateAndWaitReady(session, siteUrl, false);
      const initialPendingCount = await session.evaluate(
        "document.querySelectorAll('#philosophy [data-reveal=\"pending\"]').length",
      );

      const whileHiddenOnDestinations = await session.evaluate(`(async () => {
        const destLink = Array.from(document.querySelectorAll('header a[href="/destinations"]')).find((el) => el.checkVisibility());
        destLink?.click();
        for (let i = 0; i < 40; i += 1) {
          if (window.location.pathname === '/destinations' && document.querySelector('[data-testid="destination-results"]')) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        return {
          pathname: window.location.pathname,
          activeObserversWhileHidden: window.__adoraMotionProbe.activeRevealObservers.size,
          scrollListenersWhileHidden: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
        };
      })()`);

      const afterBackAndScroll = await session.evaluate(`(async () => {
        window.history.back();
        for (let i = 0; i < 40; i += 1) {
          const section = document.querySelector('#philosophy');
          if (window.location.pathname === '/' && section && section.checkVisibility()) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        await new Promise((r) => setTimeout(r, 120));
        document.documentElement.style.scrollBehavior = 'auto';
        const section = Array.from(document.querySelectorAll('#philosophy')).find((el) => el.checkVisibility());
        section.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(
          document.getAnimations()
            .filter((anim) => section.contains(anim.effect?.target))
            .map((anim) => anim.finished.catch(() => {})),
        );
        const visibleUnits = Array.from(section.querySelectorAll('[data-reveal-variant]'));
        return {
          pathname: window.location.pathname,
          unitCount: visibleUnits.length,
          allRevealedAfterRestore: visibleUnits.every(
            (el) => el.getAttribute('data-reveal') === 'visible' && getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
          ),
          activeObserversAfterReveal: window.__adoraMotionProbe.activeRevealObservers.size,
          scrollListenersAfterReveal: window.__adoraMotionProbe.activeWindowListeners.get('scroll')?.size ?? 0,
        };
      })()`);

      return {
        initialPendingCount,
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
        await navigateAndWaitReady(session, strictDevUrl, false);
        await wait(600);
        const beforeScroll = await session.evaluate(`({
          ioConstructed: window.__adoraMotionProbe.revealIoConstructed,
          activeObserversWhilePending: window.__adoraMotionProbe.activeRevealObservers.size,
          pendingCount: document.querySelectorAll('#philosophy [data-reveal="pending"]').length,
        })`);

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
        })()`);

        const afterScroll = await session.evaluate(`(() => {
          const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
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
          beforeScroll.ioConstructed >= 6 &&
          beforeScroll.activeObserversWhilePending === 3 &&
          beforeScroll.pendingCount === 3 &&
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
    activityPostRevealCheck.beforeScrollStats.activeObservers === 3 &&
    activityPostRevealCheck.beforeScrollStats.scrollListeners === 3 &&
    activityPostRevealCheck.afterRevealStats.activeObservers === 0 &&
    activityPostRevealCheck.afterRevealStats.scrollListeners === 0 &&
    activityPostRevealCheck.afterRevealStats.resizeListeners === 0 &&
    activityPostRevealCheck.afterActivityBack.pathname === "/" &&
    activityPostRevealCheck.afterActivityBack.visibleUnitCount === 3 &&
    activityPostRevealCheck.afterActivityBack.allRemainVisible &&
    activityPostRevealCheck.afterActivityBack.activeObservers === 0 &&
    activityPostRevealCheck.afterActivityBack.scrollListeners === 0 &&
    activityPostRevealCheck.errors.length === 0 &&
    activityPendingRestoreCheck.initialPendingCount === 3 &&
    activityPendingRestoreCheck.whileHiddenOnDestinations.pathname === "/destinations" &&
    activityPendingRestoreCheck.whileHiddenOnDestinations.activeObserversWhileHidden === 0 &&
    activityPendingRestoreCheck.whileHiddenOnDestinations.scrollListenersWhileHidden === 0 &&
    activityPendingRestoreCheck.afterBackAndScroll.pathname === "/" &&
    activityPendingRestoreCheck.afterBackAndScroll.unitCount === 3 &&
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
      const box = await session.evaluate(`(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        const container = document.querySelector('#destinations .image-reveal');
        container.scrollIntoView({ block: 'center', behavior: 'instant' });
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
      const box = await session.evaluate(`(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        const container = document.querySelector('#destinations .image-reveal');
        container.scrollIntoView({ block: 'center', behavior: 'instant' });
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
    console.error(`Verifying Package A React Strict Mode against ${strictDevUrl}...`);
    const lifecycleOnly = await withIsolatedSession(
      browserClient,
      { width: 1440, height: 900, initScript: OBSERVER_TRACKER_INIT_SCRIPT },
      async (session) => {
        await navigateAndWaitReady(session, strictDevUrl, false);
        await wait(700);
        const beforeScroll = await session.evaluate(`({
          ioConstructed: window.__adoraMotionProbe.revealIoConstructed,
          activeObserversWhilePending: window.__adoraMotionProbe.activeRevealObservers.size,
          pendingCount: document.querySelectorAll('#philosophy [data-reveal="pending"]').length,
        })`);

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
        })()`);

        const afterScroll = await session.evaluate(`(() => {
          const units = Array.from(document.querySelectorAll('#philosophy [data-reveal-variant]'));
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
          beforeScroll.ioConstructed >= 6 &&
          beforeScroll.activeObserversWhilePending === 3 &&
          beforeScroll.pendingCount === 3 &&
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

    const packageAPassed =
      ssrAndNoJs.passed &&
      intersectionObserver.passed &&
      failVisible.passed &&
      lifecycleAndActivity.passed &&
      responsiveAndCss.passed;

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
      futurePackages: {
        packageB: { implemented: false, executed: false },
        packageD: { implemented: false, executed: false },
        packageC: { implemented: false, executed: false },
        packageE: { implemented: false, executed: false },
      },
    };

    console.log(JSON.stringify(summary, null, 2));
    if (!packageAPassed) process.exitCode = 1;
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

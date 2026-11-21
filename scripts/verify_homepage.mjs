import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const siteUrl = process.env.ADORA_WEB_URL ?? "http://127.0.0.1:3100";
const outputDirectory = resolve(process.env.ADORA_VERIFY_OUTPUT ?? "docs/reports/assets/web-design-0-2");
const debugPort = 9224;
const configuredViewports = [
  { name: "360", width: 360, height: 800, heroOnly: true },
  { name: "mobile", width: 390, height: 844, screenshots: true },
  { name: "768", width: 768, height: 1024, heroOnly: true },
  { name: "1024", width: 1024, height: 900, heroOnly: true },
  { name: "desktop", width: 1440, height: 900, screenshots: true },
  { name: "1920", width: 1920, height: 1080, heroOnly: true },
];
const requestedViewport = process.env.ADORA_VERIFY_VIEWPORT;
const viewports = requestedViewport
  ? configuredViewports.filter((viewport) => String(viewport.width) === requestedViewport)
  : configuredViewports;

if (viewports.length === 0) {
  throw new Error(`Unsupported ADORA_VERIFY_VIEWPORT: ${requestedViewport}`);
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitForJsonVersion() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await wait(100);
  }
  throw new Error("Chrome DevTools Protocol did not become available");
}

async function createTarget() {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent("about:blank")}`, {
    method: "PUT",
  });
  if (!response.ok) throw new Error(`Unable to create Chrome target: ${response.status}`);
  return response.json();
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const events = new Map();

  socket.addEventListener("message", (message) => {
    const payload = JSON.parse(message.data);
    if (payload.id) {
      const request = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) request?.reject(new Error(payload.error.message));
      else request?.resolve(payload.result);
      return;
    }
    for (const listener of events.get(payload.method) ?? []) listener(payload.params);
  });

  const ready = new Promise((resolvePromise, reject) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    ready,
    on(method, listener) {
      events.set(method, [...(events.get(method) ?? []), listener]);
    },
    send(method, params = {}) {
      id += 1;
      const requestId = id;
      return new Promise((resolvePromise, reject) => {
        pending.set(requestId, { resolve: resolvePromise, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function pressKey(client, key, code, windowsVirtualKeyCode, text = "") {
  const event = { key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode };
  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    ...event,
    ...(text ? { text, unmodifiedText: text } : {}),
  });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
}

async function capture(client, filename, fullPage) {
  const parameters = { format: "png", fromSurface: true, captureBeyondViewport: fullPage };
  if (fullPage) {
    const metrics = await client.send("Page.getLayoutMetrics");
    parameters.clip = {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: metrics.cssContentSize.height,
      scale: 1,
    };
  }
  const screenshot = await client.send("Page.captureScreenshot", parameters);
  await writeFile(join(outputDirectory, filename), Buffer.from(screenshot.data, "base64"));
}

async function verifyViewport(viewport) {
  const target = await createTarget();
  const client = createCdpClient(target.webSocketDebuggerUrl);
  const errors = [];
  await client.ready;
  client.on("Runtime.exceptionThrown", (event) => errors.push(`exception: ${event.exceptionDetails.text}`));
  client.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") errors.push(`console: ${event.args.map((argument) => argument.value ?? argument.description).join(" ")}`);
  });
  client.on("Network.loadingFailed", (event) => {
    if (!event.canceled) errors.push(`network: ${event.errorText} (${event.type})`);
  });

  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Network.enable"),
    client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 768,
    }),
  ]);
  await client.send("Page.navigate", { url: siteUrl });
  await wait(2800);
  await evaluate(client, "document.fonts.ready.then(() => true)");
  if (viewport.screenshots || viewport.heroOnly) await capture(client, `${viewport.name}-hero.png`, false);

  await evaluate(
    client,
    `(async () => {
      const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
      document.documentElement.style.scrollBehavior = 'auto';
      const pageHeight = document.documentElement.scrollHeight;
      for (let y = 0; y < pageHeight; y += Math.max(window.innerHeight * 0.8, 500)) {
        window.scrollTo(0, y);
        await delay(120);
      }
      window.scrollTo(0, 0);
      await delay(300);
      await Promise.race([
        Promise.all(Array.from(document.images).map((image) => image.complete
          ? Promise.resolve()
          : new Promise((resolvePromise) => {
              image.addEventListener('load', resolvePromise, { once: true });
              image.addEventListener('error', resolvePromise, { once: true });
            }))),
        delay(5000),
      ]);
      return true;
    })()`
  );

  const metrics = await evaluate(
    client,
    `(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      h1Count: document.querySelectorAll('h1').length,
      mainCount: document.querySelectorAll('main').length,
      aiPlannerLinks: document.querySelectorAll('a[href="/ai-planner"]').length,
      fallbackVisible: document.body.innerText.toLocaleLowerCase('vi').includes('api tạm ngoại tuyến'),
      commercialClaims: Array.from(document.querySelectorAll('main')).flatMap((main) => {
        const text = main.innerText.toLocaleLowerCase('vi');
        return ['available now', 'đặt ngay', 'còn chỗ', 'vnd', '₫'].filter((claim) => text.includes(claim));
      }),
      images: Array.from(document.images).map((image) => ({
        alt: image.alt,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
      })),
      heroCta: (() => {
        const link = document.querySelector('.hero-primary-cta');
        const styles = link ? getComputedStyle(link) : null;
        return styles ? { color: styles.color, backgroundColor: styles.backgroundColor } : null;
      })(),
    }))()`
  );

  if (viewport.screenshots) {
    await capture(client, `${viewport.name}-full-page.png`, true);
  }

  let reducedMotion = null;
  let keyboardNavigation = null;
  if (viewport.width === 390) {
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    reducedMotion = await evaluate(
      client,
      `(() => {
        const scrollLine = document.querySelector('.hero-scroll-line');
        const image = document.querySelector('.image-reveal img');
        return {
          matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
          scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
          animationDuration: scrollLine ? getComputedStyle(scrollLine).animationDuration : null,
          transitionDuration: image ? getComputedStyle(image).transitionDuration : null,
        };
      })()`
    );
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });

    await evaluate(client, "window.scrollTo(0, 0); document.activeElement?.blur(); document.body.focus(); true");
    // Tab 1 -> skip-to-content link (#main-content)
    await pressKey(client, "Tab", "Tab", 9);
    const skipLink = await evaluate(
      client,
      `(() => {
        const element = document.activeElement;
        const rect = element ? element.getBoundingClientRect() : null;
        return {
          href: element?.getAttribute('href') ?? null,
          visible: Boolean(element && element.checkVisibility() && rect && rect.width > 0 && rect.height > 0),
        };
      })()`
    );
    // Tab 2 -> ADORA home link (/), Tab 3 -> mobile menu toggle button
    await pressKey(client, "Tab", "Tab", 9);
    const brandLinkHref = await evaluate(client, "document.activeElement?.getAttribute('href') ?? null");
    await pressKey(client, "Tab", "Tab", 9);
    const focusedMenuButton = await evaluate(
      client,
      `(() => {
        const element = document.activeElement;
        const styles = element ? getComputedStyle(element) : null;
        return {
          control: element?.getAttribute('aria-controls') ?? null,
          expanded: element?.getAttribute('aria-expanded') ?? null,
          outlineStyle: styles?.outlineStyle ?? null,
          outlineWidth: styles?.outlineWidth ?? null,
        };
      })()`
    );
    await pressKey(client, " ", "Space", 32, " ");
    await wait(120);
    const openedMenu = await evaluate(
      client,
      `(() => {
        const button = Array.from(document.querySelectorAll('button[aria-controls="mobile-navigation"]')).find((el) => el.checkVisibility()) ?? null;
        const menu = document.querySelector('#mobile-navigation');
        return {
          expanded: button?.getAttribute('aria-expanded') ?? null,
          display: menu ? getComputedStyle(menu).display : null,
          visibleLinks: menu ? Array.from(menu.querySelectorAll('a')).filter((link) => getComputedStyle(link).display !== 'none').length : 0,
        };
      })()`
    );
    await pressKey(client, "Tab", "Tab", 9);
    const firstMenuLink = await evaluate(client, "document.activeElement?.getAttribute('href') ?? null");
    await pressKey(client, "Enter", "Enter", 13, "\r");
    await evaluate(
      client,
      `(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let i = 0; i < 30; i += 1) {
          if (
            window.location.pathname === '/destinations' &&
            document.querySelector('[data-testid="destination-results"]')
          ) {
            break;
          }
          await delay(100);
        }
        return true;
      })()`
    );
    const closedMenu = await evaluate(
      client,
      `(() => {
        const visibleHeader = Array.from(document.querySelectorAll('header')).find((el) => el.checkVisibility()) ?? null;
        const button = visibleHeader?.querySelector('button[aria-controls="mobile-navigation"]') ?? null;
        const menu = visibleHeader?.querySelector('#mobile-navigation') ?? null;
        const anyMenuExpanded = Array.from(document.querySelectorAll('button[aria-controls="mobile-navigation"]'))
          .some((btn) => btn.getAttribute('aria-expanded') === 'true');
        const visibleH1s = Array.from(document.querySelectorAll('h1')).filter((el) => el.checkVisibility());
        return {
          expanded: button?.getAttribute('aria-expanded') ?? null,
          anyMenuExpanded,
          display: menu ? getComputedStyle(menu).display : null,
          pathname: window.location.pathname,
          visibleH1Count: visibleH1s.length,
          h1Text: visibleH1s[0]?.textContent?.replace(/\\s+/g, ' ').trim() ?? null,
          destinationResultsVisible: Boolean(document.querySelector('[data-testid="destination-results"]')),
        };
      })()`
    );
    keyboardNavigation = { skipLink, brandLinkHref, focusedMenuButton, openedMenu, firstMenuLink, closedMenu };
  }

  let plannerNavigation = null;
  if (viewport.width === 1440) {
    await evaluate(client, "document.querySelector('.hero-primary-cta')?.click(); true");
    await evaluate(
      client,
      `(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let i = 0; i < 30; i += 1) {
          // UX-1: explicitly expand the shared dialog to retain route coverage.
          document.querySelector('dialog[open] a[href="/ai-planner"]')?.click();
          const visibleH1s = Array.from(document.querySelectorAll('h1')).filter((el) => el.checkVisibility());
          if (window.location.pathname === '/ai-planner' && visibleH1s.length > 0) {
            break;
          }
          await delay(100);
        }
        return true;
      })()`
    );
    plannerNavigation = await evaluate(
      client,
      `(() => {
        const activeMain = Array.from(document.querySelectorAll('main')).find((el) => el.checkVisibility()) ?? null;
        const visibleH1s = Array.from(document.querySelectorAll('h1')).filter((el) => el.checkVisibility());
        const mainText = activeMain?.innerText ?? '';
        const lowerText = mainText.toLocaleLowerCase('vi');
        const forbiddenLiveAiClaims = [
          'live ai',
          'connected to gemini',
          'connected to openai',
          'đã kết nối mô hình ai',
          'trợ lý ai trực tiếp',
        ].filter((claim) => lowerText.includes(claim));
        return {
          pathname: window.location.pathname,
          visibleH1Count: visibleH1s.length,
          h1Text: visibleH1s[0]?.textContent?.trim() ?? null,
          staticPreviewVisible: mainText.includes('ADORA chưa kết nối mô hình AI'),
          headerDisclosureVisible: mainText.includes('chưa kết nối mô hình AI'),
          forbiddenLiveAiClaims,
        };
      })()`
    );
  }

  client.close();
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    ...metrics,
    keyboardNavigation,
    reducedMotion,
    plannerNavigation,
    errors,
  };
}

const profileDirectory = await mkdtemp(join(tmpdir(), "adora-homepage-chrome-"));
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
  { stdio: "ignore", windowsHide: true }
);

try {
  await mkdir(outputDirectory, { recursive: true });
  await waitForJsonVersion();
  const homepageResponse = await fetch(siteUrl);
  const destinationsResponse = await fetch(`${siteUrl}/destinations`);
  const plannerResponse = await fetch(`${siteUrl}/ai-planner`);
  const results = [];
  for (const viewport of viewports) {
    console.error(`Verifying ${viewport.width}x${viewport.height}...`);
    results.push(await verifyViewport(viewport));
  }

  const summary = {
    homepageStatus: homepageResponse.status,
    destinationsStatus: destinationsResponse.status,
    aiPlannerStatus: plannerResponse.status,
    results,
  };
  console.log(JSON.stringify(summary, null, 2));

  const failed =
    homepageResponse.status !== 200 ||
    destinationsResponse.status !== 200 ||
    plannerResponse.status !== 200 ||
    results.some(
      (result) =>
        result.scrollWidth > result.width ||
        result.h1Count !== 1 ||
        result.mainCount !== 1 ||
        result.aiPlannerLinks < 1 ||
        !result.fallbackVisible ||
        result.commercialClaims.length > 0 ||
        result.images.some((image) => !image.complete || image.naturalWidth === 0) ||
        (result.viewport === "390x844" &&
          (result.keyboardNavigation?.skipLink?.href !== "#main-content" ||
            !result.keyboardNavigation?.skipLink?.visible ||
            result.keyboardNavigation?.brandLinkHref !== "/" ||
            result.keyboardNavigation?.focusedMenuButton.control !== "mobile-navigation" ||
            result.keyboardNavigation?.focusedMenuButton.expanded !== "false" ||
            result.keyboardNavigation?.focusedMenuButton.outlineStyle === "none" ||
            result.keyboardNavigation?.focusedMenuButton.outlineWidth === "0px" ||
            result.keyboardNavigation?.openedMenu.expanded !== "true" ||
            result.keyboardNavigation?.openedMenu.display !== "grid" ||
            result.keyboardNavigation?.openedMenu.visibleLinks < 5 ||
            result.keyboardNavigation?.firstMenuLink !== "/destinations" ||
            result.keyboardNavigation?.closedMenu.expanded !== "false" ||
            result.keyboardNavigation?.closedMenu.anyMenuExpanded ||
            result.keyboardNavigation?.closedMenu.display !== "none" ||
            result.keyboardNavigation?.closedMenu.pathname !== "/destinations" ||
            result.keyboardNavigation?.closedMenu.visibleH1Count !== 1 ||
            result.keyboardNavigation?.closedMenu.h1Text !== "Những miền đất để đi chậm." ||
            !result.keyboardNavigation?.closedMenu.destinationResultsVisible ||
            !result.reducedMotion?.matches ||
            result.reducedMotion?.scrollBehavior !== "auto" ||
            result.reducedMotion?.animationDuration === "2.2s" ||
            result.reducedMotion?.transitionDuration === "1.2s")) ||
        (result.viewport === "1440x900" &&
          (result.plannerNavigation?.pathname !== "/ai-planner" ||
            result.plannerNavigation?.visibleH1Count !== 1 ||
            result.plannerNavigation?.h1Text !== "ADORA AI Travel Planner" ||
            !result.plannerNavigation?.staticPreviewVisible ||
            !result.plannerNavigation?.headerDisclosureVisible ||
            result.plannerNavigation?.forbiddenLiveAiClaims?.length > 0)) ||
        result.errors.length > 0
    );
  if (failed) process.exitCode = 1;
} finally {
  chrome.kill();
  await Promise.race([
    new Promise((resolvePromise) => chrome.once("exit", resolvePromise)),
    wait(2000),
  ]);
  const resolvedProfile = resolve(profileDirectory);
  const safeTemporaryProfile =
    resolvedProfile.startsWith(resolve(tmpdir())) && basename(resolvedProfile).startsWith("adora-homepage-chrome-");
  if (safeTemporaryProfile) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(resolvedProfile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 4) console.warn(`Temporary Chrome profile cleanup deferred: ${error.message}`);
        else await wait(250);
      }
    }
  }
}

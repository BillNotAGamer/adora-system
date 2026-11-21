import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const siteUrl = process.env.ADORA_WEB_URL ?? "http://127.0.0.1:3100";
const outputDirectory = resolve(process.env.ADORA_VERIFY_OUTPUT ?? "docs/reports/assets/web-design-0-3");
const debugPort = 9226;

const configuredViewports = [
  { name: "360", width: 360, height: 800 },
  { name: "mobile", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 900 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
];

const routesToVerifyAtAllWidths = [
  "/",
  "/destinations",
  "/destinations/da-lat",
  "/experiences",
  "/experiences/ca-phe-nho-giot-cao-nguyen",
  "/ai-planner",
  "/trips",
  "/trips/da-lat-3-ngay",
];

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitForJsonVersion() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is starting.
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

async function scrollAndLoadImages(client) {
  await evaluate(
    client,
    `(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      document.documentElement.style.scrollBehavior = 'auto';
      const pageHeight = document.documentElement.scrollHeight;
      for (let y = 0; y < pageHeight; y += Math.max(window.innerHeight * 0.8, 500)) {
        window.scrollTo(0, y);
        await delay(90);
      }
      window.scrollTo(0, 0);
      await delay(220);
      await Promise.race([
        Promise.all(Array.from(document.images).map((img) => img.complete
          ? Promise.resolve()
          : new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            }))),
        delay(4500),
      ]);
      return true;
    })()`,
  );
}

async function collectPageMetrics(client) {
  return evaluate(
    client,
    `(() => ({
      pathname: window.location.pathname,
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      h1Count: document.querySelectorAll('h1').length,
      h1Text: document.querySelector('h1')?.textContent?.trim() ?? null,
      mainCount: document.querySelectorAll('main').length,
      images: Array.from(document.images).map((img) => ({
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      })),
      forbiddenCommercialClaims: (() => {
        const text = (document.querySelector('main')?.innerText ?? '').toLocaleLowerCase('vi');
        return ['available now', 'đặt ngay', 'còn chỗ'].filter((claim) => text.includes(claim));
      })(),
    }))()`,
  );
}

async function verifyHttpRoutes() {
  const expected200 = [
    "/",
    "/destinations",
    "/destinations/da-lat",
    "/experiences",
    "/experiences/rung-thong-binh-minh",
    "/experiences/ca-phe-nho-giot-cao-nguyen",
    "/experiences/vuon-hoa-nha-kinh",
    "/experiences/hoang-hon-ben-ho",
    "/experiences/bua-toi-pho-dem",
    "/experiences/ngam-doi-trong-suong",
    "/ai-planner",
    "/trips",
    "/trips/da-lat-3-ngay",
    "/trips/da-lat-cuoi-tuan-2-ngay",
  ];
  const expectedNotFound = [
    "/unknown-route",
    "/destinations/unknown-slug",
    "/destinations/hoi-an",
    "/experiences/unknown-slug",
    "/trips/unknown-slug",
  ];

  const statuses200 = {};
  for (const route of expected200) {
    const res = await fetch(`${siteUrl}${route}`);
    statuses200[route] = res.status;
  }

  const statuses404 = {};
  for (const route of expectedNotFound) {
    const res = await fetch(`${siteUrl}${route}`);
    const body = await res.text();
    statuses404[route] = {
      status: res.status,
      hasNoindexMeta: body.includes('name="robots" content="noindex"'),
      hasCustom404Heading: body.includes("Trang này không") && body.includes("tồn tại."),
    };
  }

  return { statuses200, statuses404 };
}

async function verifyViewportMatrix() {
  const target = await createTarget();
  const client = createCdpClient(target.webSocketDebuggerUrl);
  const errors = [];
  const externalAiRequests = [];
  await client.ready;

  client.on("Runtime.exceptionThrown", (event) => errors.push(`exception: ${event.exceptionDetails.text}`));
  client.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") {
      errors.push(`console: ${event.args.map((arg) => arg.value ?? arg.description).join(" ")}`);
    }
  });
  client.on("Network.requestWillBeSent", (event) => {
    const url = event.request?.url ?? "";
    if (/generativelanguage\.googleapis|openai\.com|anthropic\.com|gemini/i.test(url)) {
      externalAiRequests.push(url);
    }
  });
  client.on("Network.loadingFailed", (event) => {
    if (!event.canceled) errors.push(`network: ${event.errorText} (${event.type})`);
  });

  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable"), client.send("Network.enable")]);

  const matrix = [];

  for (const viewport of configuredViewports) {
    console.error(`Verifying viewport ${viewport.width}x${viewport.height} across ${routesToVerifyAtAllWidths.length} routes...`);
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 768,
    });

    const routeChecks = [];
    for (const route of routesToVerifyAtAllWidths) {
      const beforeErrors = errors.length;
      await client.send("Page.navigate", { url: `${siteUrl}${route}` });
      await wait(route === "/" ? 2400 : 900);
      await evaluate(client, "document.fonts.ready.then(() => true)");
      await scrollAndLoadImages(client);
      const metrics = await collectPageMetrics(client);
      routeChecks.push({
        route,
        ...metrics,
        routeErrors: errors.slice(beforeErrors),
      });

      if (viewport.name === "desktop" || viewport.name === "mobile") {
        const prefix = viewport.name;
        if (route === "/destinations") await capture(client, `${prefix}-destinations.png`, true);
        if (route === "/destinations/da-lat") await capture(client, `${prefix}-destination-detail.png`, true);
        if (route === "/experiences") await capture(client, `${prefix}-experiences.png`, true);
        if (route === "/experiences/ca-phe-nho-giot-cao-nguyen") await capture(client, `${prefix}-experience-detail.png`, true);
        if (route === "/ai-planner") await capture(client, `${prefix}-ai-planner-initial.png`, false);
        if (route === "/trips") await capture(client, `${prefix}-trips.png`, true);
        if (route === "/trips/da-lat-3-ngay") await capture(client, `${prefix}-trip-detail.png`, true);
      }
    }

    matrix.push({
      viewport: `${viewport.width}x${viewport.height}`,
      routeChecks,
    });
  }

  client.close();
  return { matrix, errors, externalAiRequests };
}

async function verifyInteractiveFlows() {
  const target = await createTarget();
  const client = createCdpClient(target.webSocketDebuggerUrl);
  const errors = [];
  await client.ready;

  client.on("Runtime.exceptionThrown", (event) => errors.push(`exception: ${event.exceptionDetails.text}`));
  client.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") {
      errors.push(`console: ${event.args.map((arg) => arg.value ?? arg.description).join(" ")}`);
    }
  });

  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable"), client.send("Network.enable")]);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // 1. Destinations interactive filtering
  await client.send("Page.navigate", { url: `${siteUrl}/destinations` });
  await wait(900);
  const destinationFilterCheck = await evaluate(
    client,
    `(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const countText = () => document.querySelector('[data-testid="destination-count"]')?.textContent?.trim() ?? '';
      const initialCount = countText();

      const buttons = Array.from(document.querySelectorAll('button.filter-chip'));
      const coastBtn = buttons.find((b) => b.textContent?.trim() === 'Ven biển');
      coastBtn?.click();
      await delay(100);
      const coastCount = countText();

      const allRegionBtn = buttons.find((b) => b.textContent?.trim() === 'Tất cả vùng');
      allRegionBtn?.click();
      const availBtn = buttons.find((b) => b.textContent?.trim() === 'Đã có nội dung');
      availBtn?.click();
      await delay(100);
      const availableCount = countText();

      const input = document.querySelector('input[type="search"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'khong-ton-tai');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(100);
      const emptyVisible = Boolean(document.querySelector('[data-testid="destination-empty"]'));
      const resetBtn = document.querySelector('[data-testid="destination-empty"] button');
      resetBtn?.click();
      await delay(100);
      const resetCount = countText();

      return { initialCount, coastCount, availableCount, emptyVisible, resetCount };
    })()`,
  );

  // 2. Experiences interactive filtering
  await client.send("Page.navigate", { url: `${siteUrl}/experiences` });
  await wait(900);
  const experienceFilterCheck = await evaluate(
    client,
    `(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const countText = () => document.querySelector('[data-testid="experience-count"]')?.textContent?.trim() ?? '';
      const initialCount = countText();

      const chips = Array.from(document.querySelectorAll('button.filter-chip'));
      const coffeeChip = chips.find((b) => b.textContent?.includes('Ẩm thực & cà phê'));
      coffeeChip?.click();
      await delay(100);
      const coffeeCount = countText();

      const input = document.querySelector('input[type="search"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'khong-co-ket-qua');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(100);
      const emptyVisible = Boolean(document.querySelector('[data-testid="experience-empty"]'));
      const resetBtn = document.querySelector('[data-testid="experience-empty"] button');
      resetBtn?.click();
      await delay(100);
      const resetCount = countText();

      return { initialCount, coffeeCount, emptyVisible, resetCount };
    })()`,
  );

  // 3. AI Planner scripted demo, unsupported prompt, reset, and screenshots (desktop + mobile)
  await client.send("Page.navigate", { url: `${siteUrl}/ai-planner` });
  await wait(900);
  const plannerDesktopCheck = await evaluate(
    client,
    `(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const log = document.querySelector('[role="log"]');
      const logRect = log.getBoundingClientRect();
      const initialScrollTop = log.scrollTop;
      const suggestionButtons = Array.from(log.querySelectorAll('ul[aria-label="Gợi ý câu hỏi"] button'));
      const initialBothSuggestionsFullyVisible =
        suggestionButtons.length === 2 &&
        suggestionButtons.every((btn) => {
          const r = btn.getBoundingClientRect();
          return r.top >= logRect.top && r.bottom <= logRect.bottom;
        });
      const openingMsg = log.querySelector('article[aria-label="ADORA Planner"]');
      const openingRect = openingMsg ? openingMsg.getBoundingClientRect() : null;
      const initialOpeningMessageFullyVisible = Boolean(
        openingRect && openingRect.top >= logRect.top && openingRect.bottom <= logRect.bottom
      );

      const initialEmptyPreview = Boolean(document.querySelector('[data-testid="trip-preview-empty"]'));

      // Click the 3-day Da Lat suggested prompt
      const promptButtons = Array.from(document.querySelectorAll('button'));
      const dalatBtn = promptButtons.find((b) => b.textContent?.includes('Lên kế hoạch chuyến đi 3 ngày tới Đà Lạt'));
      dalatBtn?.click();
      await delay(200);

      const userBubble = log.querySelector('article[aria-label="Bạn"]');
      const userRect = userBubble ? userBubble.getBoundingClientRect() : null;
      const userBubbleVisibleInLog = Boolean(
        userRect && userRect.top >= logRect.top && userRect.bottom <= logRect.bottom
      );

      const scriptedReply = document.querySelector('[data-testid="scripted-reply"]');
      const scriptedRect = scriptedReply ? scriptedReply.getBoundingClientRect() : null;
      const scriptedReplyVisible = Boolean(scriptedReply);
      const scriptedReplyVisibleInLog = Boolean(
        scriptedRect && scriptedRect.top >= logRect.top && scriptedRect.top < logRect.bottom
      );
      const tripPreviewVisible = Boolean(document.querySelector('[data-testid="trip-preview"]'));
      const tripLinkHref = document.querySelector('[data-testid="trip-preview"] a')?.getAttribute('href') ?? null;

      return {
        initialScrollTop,
        initialBothSuggestionsFullyVisible,
        initialOpeningMessageFullyVisible,
        initialEmptyPreview,
        userBubbleVisibleInLog,
        scriptedReplyVisible,
        scriptedReplyVisibleInLog,
        tripPreviewVisible,
        tripLinkHref,
      };
    })()`,
  );
  await capture(client, "desktop-ai-planner-scripted.png", false);

  // Test unsupported prompt + reset on desktop
  const plannerUnsupportedAndResetCheck = await evaluate(
    client,
    `(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const textarea = document.querySelector('#planner-prompt');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, 'Plan a 5-day trip to Tokyo with live flights');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(80);
      const submitBtn = document.querySelector('form button[type="submit"]');
      submitBtn?.click();
      await delay(150);

      const unsupportedText = document.querySelector('[data-testid="unsupported-reply"]')?.textContent?.trim() ?? '';

      const newConvBtn = Array.from(document.querySelectorAll('aside button')).find((b) =>
        b.textContent?.includes('Cuộc trò chuyện demo mới')
      );
      newConvBtn?.click();
      await delay(150);
      document.querySelector('[data-confirm-reset]')?.click();
      await delay(150);

      const resetEmptyPreview = Boolean(document.querySelector('[data-testid="trip-preview-empty"]'));
      const scriptedAfterReset = Boolean(document.querySelector('[data-testid="scripted-reply"]'));

      return {
        unsupportedHonest: unsupportedText.includes('chưa kết nối mô hình AI'),
        resetEmptyPreview,
        scriptedAfterReset,
      };
    })()`,
  );

  // Capture mobile AI Planner scripted state at 390x844
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Page.navigate", { url: `${siteUrl}/ai-planner` });
  await wait(900);
  const plannerMobileCheck = await evaluate(
    client,
    `(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const log = document.querySelector('[role="log"]');
      const composer = document.querySelector('form[aria-label="Soạn tin nhắn demo"]')?.parentElement;
      const logRectInitial = log.getBoundingClientRect();
      const composerRectInitial = composer.getBoundingClientRect();
      const initialScrollTop = log.scrollTop;
      const composerDoesNotOverlapLog = logRectInitial.bottom <= composerRectInitial.top + 1;

      const suggestionButtons = Array.from(log.querySelectorAll('ul[aria-label="Gợi ý câu hỏi"] button'));
      const initialBothSuggestionsFullyVisible =
        suggestionButtons.length === 2 &&
        suggestionButtons.every((btn) => {
          const r = btn.getBoundingClientRect();
          return r.top >= logRectInitial.top && r.bottom <= logRectInitial.bottom;
        });

      const promptButtons = Array.from(document.querySelectorAll('button'));
      const dalatBtn = promptButtons.find((b) => b.textContent?.includes('Lên kế hoạch chuyến đi 3 ngày tới Đà Lạt'));
      dalatBtn?.click();
      await delay(200);

      const logRectAfter = log.getBoundingClientRect();
      const userBubble = log.querySelector('article[aria-label="Bạn"]');
      const userRect = userBubble ? userBubble.getBoundingClientRect() : null;
      const userBubbleVisibleInLog = Boolean(
        userRect && userRect.top >= logRectAfter.top && userRect.bottom <= logRectAfter.bottom
      );

      const scriptedReply = document.querySelector('[data-testid="scripted-reply"]');
      const scriptedRect = scriptedReply ? scriptedReply.getBoundingClientRect() : null;
      const scriptedReplyVisibleInLog = Boolean(
        scriptedRect && scriptedRect.top >= logRectAfter.top && scriptedRect.bottom <= logRectAfter.bottom
      );

      const mobileJumpbarVisible = Boolean(document.querySelector('[data-testid="mobile-planner-jumpbar"]'));
      const mobilePreview = document.querySelector('[data-testid="trip-preview-mobile"]');
      const mobilePreviewRect = mobilePreview ? mobilePreview.getBoundingClientRect() : null;
      const mobilePreviewVisible = Boolean(mobilePreview);
      const mobilePreviewVisibleInLog = Boolean(
        mobilePreviewRect && mobilePreviewRect.top < logRectAfter.bottom
      );

      return {
        initialScrollTop,
        composerDoesNotOverlapLog,
        initialBothSuggestionsFullyVisible,
        userBubbleVisibleInLog,
        scriptedReplyVisibleInLog,
        mobileJumpbarVisible,
        mobilePreviewVisible,
        mobilePreviewVisibleInLog,
      };
    })()`,
  );
  await capture(client, "mobile-ai-planner-scripted.png", false);

  // 4. Trip itinerary day switching and activity disclosure
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send("Page.navigate", { url: `${siteUrl}/trips/da-lat-3-ngay` });
  await wait(900);
  const itineraryInteractionCheck = await evaluate(
    client,
    `(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const panelHeading = () => document.querySelector('[data-testid="day-panel"] h3')?.textContent?.trim() ?? '';
      const budgetText = () => document.querySelector('[data-testid="day-budget"]')?.textContent?.trim() ?? '';

      const day1Heading = panelHeading();
      const day1Budget = budgetText();

      const tab2 = document.querySelector('#day-tab-2');
      tab2?.click();
      await delay(120);
      const day2Selected = tab2?.getAttribute('aria-selected') === 'true';
      const day2Heading = panelHeading();
      const day2Budget = budgetText();

      // Toggle second activity accordion in Day 2
      const secondActivityBtn = document.querySelector('button[aria-controls="activity-d2-lunch"]');
      const expandedBefore = secondActivityBtn?.getAttribute('aria-expanded');
      secondActivityBtn?.click();
      await delay(100);
      const expandedAfter = secondActivityBtn?.getAttribute('aria-expanded');

      // Keyboard ArrowRight on Day 2 tab -> Day 3
      tab2?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await delay(120);
      const day3Heading = panelHeading();
      const day3Budget = budgetText();

      return {
        day1Heading,
        day1Budget,
        day2Selected,
        day2Heading,
        day2Budget,
        expandedBefore,
        expandedAfter,
        day3Heading,
        day3Budget,
      };
    })()`,
  );

  // 5. Mobile keyboard navigation & reduced motion on /destinations at 390x844
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Page.navigate", { url: `${siteUrl}/destinations` });
  await wait(900);
  await evaluate(client, "document.activeElement?.blur(); document.body.focus(); true");
  // First Tab -> skip link, second Tab -> ADORA logo, third Tab -> mobile menu toggle button
  await pressKey(client, "Tab", "Tab", 9);
  const skipLinkFocused = await evaluate(client, "document.activeElement?.getAttribute('href') ?? null");
  await pressKey(client, "Tab", "Tab", 9);
  await pressKey(client, "Tab", "Tab", 9);
  const mobileMenuFocus = await evaluate(
    client,
    `(() => {
      const el = document.activeElement;
      const styles = el ? getComputedStyle(el) : null;
      return {
        controls: el?.getAttribute('aria-controls') ?? null,
        expanded: el?.getAttribute('aria-expanded') ?? null,
        outlineStyle: styles?.outlineStyle ?? null,
        outlineWidth: styles?.outlineWidth ?? null,
      };
    })()`,
  );
  await pressKey(client, " ", "Space", 32, " ");
  await wait(120);
  const mobileMenuOpened = await evaluate(
    client,
    `(() => {
      const btn = document.querySelector('button[aria-controls="mobile-navigation"]');
      const nav = document.querySelector('#mobile-navigation');
      return {
        expanded: btn?.getAttribute('aria-expanded') ?? null,
        display: nav ? getComputedStyle(nav).display : null,
        links: nav ? Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href')) : [],
      };
    })()`,
  );

  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reducedMotionCheck = await evaluate(
    client,
    `(() => {
      const img = document.querySelector('.image-reveal img');
      return {
        matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        transitionDuration: img ? getComputedStyle(img).transitionDuration : null,
      };
    })()`,
  );

  client.close();
  return {
    destinationFilterCheck,
    experienceFilterCheck,
    plannerDesktopCheck,
    plannerUnsupportedAndResetCheck,
    plannerMobileCheck,
    itineraryInteractionCheck,
    accessibilityCheck: {
      skipLinkFocused,
      mobileMenuFocus,
      mobileMenuOpened,
      reducedMotionCheck,
    },
    errors,
  };
}

const profileDirectory = await mkdtemp(join(tmpdir(), "adora-web-0-3-chrome-"));
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
  await waitForJsonVersion();

  const httpChecks = await verifyHttpRoutes();
  const viewportVerification = await verifyViewportMatrix();
  const interactiveVerification = await verifyInteractiveFlows();

  const summary = {
    httpChecks,
    viewportVerification,
    interactiveVerification,
  };

  console.log(JSON.stringify(summary, null, 2));

  const any200Failed = Object.values(httpChecks.statuses200).some((status) => status !== 200);
  const any404Failed =
    httpChecks.statuses404["/unknown-route"]?.status !== 404 ||
    Object.values(httpChecks.statuses404).some(
      (entry) => !entry.hasCustom404Heading || !entry.hasNoindexMeta,
    );
  const anyViewportFailed = viewportVerification.matrix.some((vp) =>
    vp.routeChecks.some(
      (rc) =>
        rc.scrollWidth > rc.width ||
        rc.h1Count !== 1 ||
        rc.mainCount !== 1 ||
        rc.forbiddenCommercialClaims.length > 0 ||
        rc.images.some((img) => !img.complete || img.naturalWidth === 0) ||
        rc.routeErrors.length > 0,
    ),
  );
  const anyInteractiveFailed =
    interactiveVerification.destinationFilterCheck.coastCount !== "Hiển thị 2 / 4 điểm đến" ||
    interactiveVerification.destinationFilterCheck.availableCount !== "Hiển thị 1 / 4 điểm đến" ||
    !interactiveVerification.destinationFilterCheck.emptyVisible ||
    interactiveVerification.destinationFilterCheck.resetCount !== "Hiển thị 4 / 4 điểm đến" ||
    interactiveVerification.experienceFilterCheck.coffeeCount !== "Hiển thị 2 / 6 trải nghiệm" ||
    !interactiveVerification.experienceFilterCheck.emptyVisible ||
    interactiveVerification.experienceFilterCheck.resetCount !== "Hiển thị 6 / 6 trải nghiệm" ||
    interactiveVerification.plannerDesktopCheck.initialScrollTop !== 0 ||
    !interactiveVerification.plannerDesktopCheck.initialBothSuggestionsFullyVisible ||
    !interactiveVerification.plannerDesktopCheck.initialOpeningMessageFullyVisible ||
    !interactiveVerification.plannerDesktopCheck.initialEmptyPreview ||
    !interactiveVerification.plannerDesktopCheck.userBubbleVisibleInLog ||
    !interactiveVerification.plannerDesktopCheck.scriptedReplyVisible ||
    !interactiveVerification.plannerDesktopCheck.scriptedReplyVisibleInLog ||
    !interactiveVerification.plannerDesktopCheck.tripPreviewVisible ||
    interactiveVerification.plannerDesktopCheck.tripLinkHref !== "/trips/da-lat-3-ngay" ||
    !interactiveVerification.plannerUnsupportedAndResetCheck.unsupportedHonest ||
    !interactiveVerification.plannerUnsupportedAndResetCheck.resetEmptyPreview ||
    interactiveVerification.plannerUnsupportedAndResetCheck.scriptedAfterReset ||
    interactiveVerification.plannerMobileCheck.initialScrollTop !== 0 ||
    !interactiveVerification.plannerMobileCheck.composerDoesNotOverlapLog ||
    !interactiveVerification.plannerMobileCheck.initialBothSuggestionsFullyVisible ||
    !interactiveVerification.plannerMobileCheck.userBubbleVisibleInLog ||
    !interactiveVerification.plannerMobileCheck.scriptedReplyVisibleInLog ||
    !interactiveVerification.plannerMobileCheck.mobileJumpbarVisible ||
    !interactiveVerification.plannerMobileCheck.mobilePreviewVisible ||
    !interactiveVerification.plannerMobileCheck.mobilePreviewVisibleInLog ||
    !interactiveVerification.itineraryInteractionCheck.day2Selected ||
    !interactiveVerification.itineraryInteractionCheck.day2Heading.includes("Ngày 2") ||
    !interactiveVerification.itineraryInteractionCheck.day3Heading.includes("Ngày 3") ||
    interactiveVerification.accessibilityCheck.skipLinkFocused !== "#main-content" ||
    interactiveVerification.accessibilityCheck.mobileMenuFocus.controls !== "mobile-navigation" ||
    interactiveVerification.accessibilityCheck.mobileMenuOpened.expanded !== "true" ||
    !interactiveVerification.accessibilityCheck.reducedMotionCheck.matches ||
    viewportVerification.externalAiRequests.length > 0 ||
    viewportVerification.errors.length > 0 ||
    interactiveVerification.errors.length > 0;

  if (any200Failed || any404Failed || anyViewportFailed || anyInteractiveFailed) {
    process.exitCode = 1;
  }
} finally {
  chrome.kill();
  await Promise.race([new Promise((r) => chrome.once("exit", r)), wait(2000)]);
  const resolvedProfile = resolve(profileDirectory);
  if (resolvedProfile.startsWith(resolve(tmpdir())) && basename(resolvedProfile).startsWith("adora-web-0-3-chrome-")) {
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

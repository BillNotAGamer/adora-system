import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const siteUrl = process.env.ADORA_WEB_URL ?? "http://127.0.0.1:3100";
const outputDirectory = resolve(process.env.ADORA_VERIFY_OUTPUT ?? "../adora-ux1-scratch/concierge");
const debugPort = 9235;
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
        const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
        pending.set(requestId, {
          resolve: value => { clearTimeout(timer); resolvePromise(value); },
          reject: error => { clearTimeout(timer); reject(error); },
        });
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


async function until(client, expression) {
  for(let i=0;i<60;i++){ if(await evaluate(client, expression)) return; await wait(100); }
  throw new Error('Timed out: '+expression);
}
function check(condition, label) { if(!condition) throw new Error(label); }
const profileDirectory = await mkdtemp(join(tmpdir(), "adora-concierge-"));
const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-port="+debugPort, "--user-data-dir="+profileDirectory,"--no-first-run","about:blank"], {stdio:"ignore",windowsHide:true});
const results=[];
try {
 await mkdir(outputDirectory,{recursive:true}); await waitForJsonVersion();
 for(const viewport of viewports) {
  const target=await createTarget(), client=createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  const errors=[];client.on("Runtime.exceptionThrown",e=>errors.push(e.exceptionDetails.text));
  client.on('Runtime.consoleAPICalled',event=>{ if(event.type==='error') errors.push('console: '+event.args.map(arg=>arg.value??arg.description).join(' ')); });
  client.on('Network.loadingFailed',event=>{ if(!event.canceled) errors.push('network: '+event.errorText+' '+event.type); });
  client.on('Network.requestWillBeSent',event=>{ if(/generativelanguage\.googleapis\.com|api\.openai\.com/.test(event.request.url)) errors.push('Unexpected model-provider request'); });
  await client.send("Page.enable");await client.send("Runtime.enable");
  await client.send('Network.enable');
  await client.send("Emulation.setDeviceMetricsOverride",{width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.width<768});
  const openEntryExpr =
    viewport.width < 1024
      ? "(() => { const b = document.querySelector('button[aria-controls=\"mobile-navigation\"]'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); document.querySelector('#mobile-navigation [data-concierge-trigger]').click(); })()"
      : "document.querySelector('header [data-concierge-trigger]').click()";
  await client.send("Page.navigate",{url:siteUrl});
  await until(client, "document.readyState === 'complete' && !!document.querySelector('header [data-concierge-trigger]')");
  await wait(700);
  check(await evaluate(client, "!document.querySelector('a.concierge-floating')"), 'Floating trigger must be hidden during Movement 01');
  await evaluate(client, "window.__tasks=[];new PerformanceObserver(list=>window.__tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});window.__initialJs=performance.getEntriesByType('resource').filter(e=>e.name.includes('.js')).reduce((s,e)=>s+e.encodedBodySize,0);window.__openStart=performance.now();" + openEntryExpr);
  await until(client,"!!document.querySelector('dialog[open]')");
  await wait(350);
  const welcome=await evaluate(client,`({pollingOpenMs:performance.now()-window.__openStart,paintMarkMs:(performance.getEntriesByName('adora-concierge-painted').at(-1)?.startTime??0)-(performance.getEntriesByName('adora-concierge-requested').at(-1)?.startTime??0),initialJsBytes:window.__initialJs,lazyJsBytes:performance.getEntriesByType('resource').filter(e=>e.name.includes('.js')).reduce((s,e)=>s+e.encodedBodySize,0)-window.__initialJs,longTasks:window.__tasks,focus:document.activeElement.id,overflow:document.documentElement.scrollWidth>innerWidth,lock:document.documentElement.style.overflow,logCount:Array.from(document.querySelectorAll('[role=log]')).filter(e=>e.checkVisibility()).length,title:document.querySelector('dialog').getAttribute('aria-labelledby')})`);
  check(welcome.focus==='concierge-title' && !welcome.overflow && welcome.lock==='hidden' && welcome.logCount===1,'Welcome focus/geometry/lock');
  await capture(client,viewport.name+'-welcome.png',false);
  await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  check(await evaluate(client,"document.querySelector('dialog').contains(document.activeElement)"),'Reverse Tab escaped modal');
  check(await evaluate(client,"document.querySelector('header a[href=\"/\"]')?.focus();document.querySelector('dialog').contains(document.activeElement)"),'Background focus was not inert');
  for(let i=0;i<18;i++){await pressKey(client,'Tab','Tab',9);check(await evaluate(client,"document.querySelector('dialog').contains(document.activeElement)"),'Focus escaped modal');}
  await evaluate(client,"document.querySelector('dialog button[aria-pressed]').click();Array.from(document.querySelectorAll('dialog button')).find(e=>e.textContent==='Tiếp tục').click();Array.from(document.querySelectorAll('dialog button')).find(e=>e.textContent==='Xem mong muốn').click()");
  await evaluate(client,"Array.from(document.querySelectorAll('dialog button')).find(e=>e.textContent.includes('Xác nhận &')).click()");
  await evaluate(client,"document.querySelector('dialog [aria-label=\"Chọn ví dụ dựng sẵn\"] button').click()");
  await until(client,"!!document.querySelector('dialog .concierge-cover')");
  await evaluate(client,"const input=document.querySelector('#concierge-prompt');input.focus();document.execCommand('insertText',false,'draft survives')");
  check(await evaluate(client,"(()=>{const n=document.querySelectorAll('dialog [role=log] article').length;const input=document.querySelector('#concierge-prompt');input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,isComposing:true}));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,shiftKey:true}));return document.querySelectorAll('dialog [role=log] article').length===n && input.value==='draft survives'})()"),'IME/Shift+Enter submitted prematurely');
  if(viewport.width>=1024) await evaluate(client,"(()=>{const pane=document.querySelector('.concierge-scroll'),log=document.querySelector('dialog [role=log]');pane.scrollTop+=log.getBoundingClientRect().top-pane.getBoundingClientRect().top-16})()");
  await capture(client,viewport.name+'-preview.png',false);
  await evaluate(client,"Array.from(document.querySelectorAll('dialog button')).find(e=>e.textContent==='Xem lịch trình minh họa').click()");
  await capture(client,viewport.name+'-itinerary.png',false);
  check(await evaluate(client,"document.activeElement.matches('.concierge-preview h2')"),'Itinerary focus was not handed off');
  if(viewport.width<1024) {
    await evaluate(client,"document.querySelector('.concierge-back').click()");
    check(await evaluate(client,"document.activeElement.id==='concierge-title'"),'Conversation return lost focus');
  }
  await pressKey(client,'Escape','Escape',27);
  await until(client,"!document.querySelector('dialog[open]')");
  await wait(50);
  check(
    await evaluate(
      client,
      viewport.width < 1024
        ? "document.activeElement!==document.body && document.activeElement.checkVisibility() && !document.activeElement.closest('[aria-hidden=\"true\"]')"
        : "document.activeElement.matches('header [data-concierge-trigger]')",
    ),
    'Focus not restored to origin',
  );
  check(await evaluate(client,"document.documentElement.style.overflow!== 'hidden'"),'Scroll lock leaked');
  await evaluate(client, openEntryExpr);
  await until(client,"!!document.querySelector('dialog[open]')");
  check(await evaluate(client,"document.querySelector('#concierge-prompt').value==='draft survives'"),'Draft lost');
  await evaluate(client,"document.querySelector('dialog a[href=\"/ai-planner\"]').click()");
  await until(client,"location.pathname==='/ai-planner' && !!document.querySelector('#planner-prompt')");
  check(await evaluate(client,"document.querySelector('#planner-prompt').value==='draft survives' && Array.from(document.querySelectorAll('[role=log]')).filter(e=>e.checkVisibility()).length===1"),'Shared standalone state');
  await evaluate(client,"document.querySelector('details > summary').click()");
  check(await evaluate(client,"document.querySelector('#planner-prompt').getBoundingClientRect().bottom<=innerHeight"),'Expanded survey obscured composer');
  await evaluate(client,"document.querySelector('details > summary').click()");
  await evaluate(client,"history.back()");
  await until(client,"location.pathname==='/' && !!document.querySelector('header [data-concierge-trigger]')");
  if(viewport.width<1024) {
    await evaluate(client,"document.querySelector('button[aria-controls=\"mobile-navigation\"]').click();history.forward()");
    await until(client,"location.pathname==='/ai-planner' && !!document.querySelector('#planner-prompt')");
    await evaluate(client,"history.back()");
    await until(client,"location.pathname==='/' && !!document.querySelector('header [data-concierge-trigger]')");
    check(await evaluate(client,"document.querySelector('button[aria-controls=\"mobile-navigation\"]').getAttribute('aria-expanded')==='false'"),'Mobile menu restored with stale state');
  }
  check(await evaluate(client,"!document.querySelector('dialog[open]') && document.documentElement.style.overflow!=='hidden'"),'Back left modal/lock');
  await evaluate(client,"history.forward()");
  await until(client,"location.pathname==='/ai-planner' && !!document.querySelector('#planner-prompt')");
  check(await evaluate(client,"document.querySelector('#planner-prompt').value==='draft survives'"),'Forward lost draft');
  await evaluate(client,"history.back()");
  await until(client,"location.pathname==='/' && !!document.querySelector('header [data-concierge-trigger]')");
  await client.send('Page.reload');
  await until(client,"document.readyState==='complete' && !!document.querySelector('header [data-concierge-trigger]')"); await wait(700);
  await evaluate(client, openEntryExpr);
  await until(client,"!!document.querySelector('dialog[open]')");
  check(await evaluate(client,"document.querySelector('#concierge-prompt').value==='' && !document.querySelector('dialog .concierge-cover')"),'Reload did not reset');
  await evaluate(client,"document.querySelector('#concierge-prompt').focus();document.execCommand('insertText',false,'Tokyo budget')");
  await pressKey(client,'Enter','Enter',13);
  check(await evaluate(client,"document.querySelector('dialog [role=log]').innerText.includes('Tokyo budget') && document.querySelector('dialog [role=log]').innerText.includes('chưa diễn giải') && !document.querySelector('dialog .concierge-cover')"),'Unsupported text was not honestly retained');
  await evaluate(client,"document.documentElement.dataset.motion='off'");
  check(await evaluate(client,"document.querySelector('.concierge-shell').getAnimations().length===0"),'Motion off failed');
  check(errors.length===0,'Runtime errors '+errors.join(';'));
  await pressKey(client,'Escape','Escape',27);
  if(viewport.width<1024) {
    await evaluate(client,"document.querySelector('button[aria-controls=\"mobile-navigation\"]').click()");await wait(50);
    await evaluate(client,"document.querySelector('#mobile-navigation [data-concierge-trigger]').click()");
  } else await evaluate(client,"document.querySelector('header [data-concierge-trigger]').click()");
  await until(client,"!!document.querySelector('dialog[open]')");
  check(await evaluate(client,"!document.querySelector('button[aria-expanded=\"true\"][aria-controls=\"mobile-navigation\"]')"),'Mobile menu did not close');
  await client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  check(await evaluate(client,"document.querySelector('.concierge-shell').getAnimations().length===0"),'Reduced motion failed');
  await pressKey(client,'Escape','Escape',27);
  await evaluate(client,"document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,1700)");
  await until(client,"!!document.querySelector('a.concierge-floating')");
  await evaluate(client,"document.querySelector('a.concierge-floating').click()");
  await until(client,"!!document.querySelector('dialog[open]')");
  check(await evaluate(client,"document.querySelector('dialog [role=log]').innerText.includes('Tokyo budget')"),'Floating trigger lost shared transcript');
  await client.send('Emulation.setEmulatedMedia',{media:'print'});
  check(await evaluate(client,"getComputedStyle(document.querySelector('dialog')).display==='none' && getComputedStyle(document.documentElement).overflow!=='hidden'"),'Print remained locked behind dialog');
  await client.send('Emulation.setEmulatedMedia',{media:''});
  await pressKey(client,'Escape','Escape',27);
  await wait(80);
  check(await evaluate(client,"document.activeElement!==document.body && document.activeElement.checkVisibility() && !document.activeElement.closest('[aria-hidden=\"true\"]')"),'Floating dismissal lost visible focus');
  check(errors.length===0,'Runtime errors after navigation '+errors.join(';'));
  if(viewport.width===390) {
    await evaluate(client,"window.HTMLDialogElement=undefined;" + openEntryExpr);
    await until(client,"location.pathname==='/ai-planner' && !!document.querySelector('#planner-prompt')");
  }
  results.push({viewport:viewport.width,welcome,errors,passed:true});
  client.close(); await fetch('http://127.0.0.1:'+debugPort+'/json/close/'+target.id);
 }
 await writeFile(join(outputDirectory,'results.json'),JSON.stringify(results,null,2)); console.log(JSON.stringify(results,null,2));
} finally {
 chrome.kill(); await wait(500);
 const profile=resolve(profileDirectory);
 if(profile.startsWith(resolve(tmpdir())) && basename(profile).startsWith('adora-concierge-')) await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}

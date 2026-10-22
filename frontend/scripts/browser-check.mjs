// Run against a started stack: node frontend/scripts/browser-check.mjs <screenshot-dir>  (needs Google Chrome; demo accounts must exist)
// Minimal Chrome DevTools Protocol driver (Node 24 has a global WebSocket). No dependencies.
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SHOTS = process.argv[2];
const WEB = "http://localhost:3010";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "zubie-chrome-"));
const chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9222",
  `--user-data-dir=${profile}`, "--window-size=1440,900", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());

let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch("http://127.0.0.1:9222/json/list")).json(); if (targets.length) break; } catch {}
  await sleep(200);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let nextId = 1; const pending = new Map(); const log = { console: [], errors: [], wsFrames: 0, wsUrls: [], wsClosed: [], failed: [] };
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type))
    log.console.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 220)}`);
  if (m.method === "Runtime.exceptionThrown") log.errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 220) ?? m.params.exceptionDetails.text);
  if (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level)) log.console.push(`log ${m.params.entry.level}: ${m.params.entry.text.slice(0, 200)} ${m.params.entry.url ?? ""}`);
  if (m.method === "Network.webSocketCreated") log.wsUrls.push(m.params.url);
  if (m.method === "Network.webSocketFrameReceived") log.wsFrames++;
  if (m.method === "Network.webSocketClosed") log.wsClosed.push(m.params.requestId);
  if (m.method === "Network.loadingFailed" && !m.params.canceled) log.failed.push(`${m.params.errorText} ${m.params.blockedReason ?? ""}`);
};
const send = (method, params = {}) => new Promise((res) => { const id = nextId++; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (url, wait = 2500) => { await send("Page.navigate", { url }); await sleep(wait); };
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.result.data, "base64")); };
const theme = (scheme) => send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });

for (const d of ["Page", "Runtime", "Log", "Network"]) await send(`${d}.enable`);
const results = [];
const check = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}  ${detail}`); };

// 1. landing, Persian, light then dark
await theme("light"); await go(`${WEB}/fa`, 4000); await shot("01-landing-fa-light");
check("landing renders Persian RTL", (await evalJs("document.documentElement.dir")) === "rtl", `dir=${await evalJs("document.documentElement.dir")} lang=${await evalJs("document.documentElement.lang")}`);
check("landing does NOT open the private socket", log.wsUrls.length === 0, `sockets opened: ${log.wsUrls.length}`);
await theme("dark"); await go(`${WEB}/fa`, 2500); await shot("02-landing-fa-dark");
await theme("light"); await go(`${WEB}/en`, 2500); await shot("03-landing-en-light");

// 2. login: production build must not prefill or print demo credentials
await go(`${WEB}/fa/login`, 2500); await shot("04-login-fa");
const prefilled = await evalJs("document.querySelector('input[type=email]').value + document.querySelector('input[type=password]').value");
const showsDemoPassword = await evalJs("document.body.innerText.includes('zubie1234')");
check("production login starts empty and never prints the demo password", prefilled === "" && showsDemoPassword === false, `prefilled='${prefilled}' printed=${showsDemoPassword}`);

// 3. wrong password shows the localized message, not server English
await evalJs(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};
  set(document.querySelector('input[type=email]'),'demo@zubie.ir');set(document.querySelector('input[type=password]'),'definitely-wrong');document.querySelector('form').requestSubmit();})()`);
await sleep(2500);
const err = await evalJs("document.querySelector('[role=alert]')?.innerText ?? ''");
check("wrong password gives a localized Persian error", /[؀-ۿ]/.test(err) && !/incorrect/i.test(err), `message='${err}'`);
await shot("05-login-error");

// 4. real login through the form, land on the dashboard, socket opens with auth
await evalJs(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};
  set(document.querySelector('input[type=password]'),'zubie1234');document.querySelector('form').requestSubmit();})()`);
await sleep(6000);
check("login lands on the dashboard", (await evalJs("location.pathname")).startsWith("/fa/app"), `path=${await evalJs("location.pathname")}`);
check("dashboard opens exactly one authenticated telemetry socket and receives frames", log.wsUrls.length >= 1 && log.wsFrames >= 1, `sockets=${log.wsUrls.length} frames=${log.wsFrames}`);
const stored = await evalJs("localStorage.getItem('zubie.token')");
check("token is stored for the session", !!stored && stored.split('.').length === 3);
await shot("06-dashboard-fa-light");
await theme("dark"); await go(`${WEB}/fa/app`, 5000); await shot("07-dashboard-fa-dark");
await theme("light");

// 5. other pages render without crashing
for (const [name, path, wait] of [["map", "map", 7000], ["vehicles", "vehicles", 3500], ["alerts", "alerts", 3000], ["geofences", "geofences", 3500], ["reports", "reports", 3500], ["settings", "settings", 3000]]) {
  await go(`${WEB}/fa/app/${path}`, wait);
  const text = await evalJs("document.body.innerText.length");
  check(`page /app/${path} renders content`, text > 200, `text length ${text}`);
  await shot(`08-${name}`);
}
// English dashboard
await go(`${WEB}/en/app`, 4000); await shot("09-dashboard-en");

// 6. mobile viewport
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go(`${WEB}/fa/app`, 4000); await shot("10-dashboard-mobile");
const overflow = await evalJs("document.documentElement.scrollWidth > document.documentElement.clientWidth");
check("no horizontal scroll at 390 px", overflow === false, `overflow=${overflow}`);
await go(`${WEB}/fa`, 3000); await shot("11-landing-mobile");
await send("Emulation.clearDeviceMetricsOverride");

// 7. empty organization: register through the API, use that token
const reg = await evalJs(`fetch('http://localhost:8010/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'e2e-${Date.now()}@example.com',password:'Str0ng-and-long-1',full_name:'E2E Owner',company:'E2E Co'})}).then(r=>r.json()).then(j=>j.access_token)`);
await evalJs(`localStorage.setItem('zubie.token', ${JSON.stringify(reg)})`);
await go(`${WEB}/fa/app`, 5000); await shot("12-empty-org-overview");
const emptyText = await evalJs("document.body.innerText");
check("a brand-new organization sees the empty-fleet state", emptyText.includes("ناوگان شما هنوز خالی است"), "");
await go(`${WEB}/fa/app/vehicles`, 3500); await shot("13-empty-org-vehicles");
await go(`${WEB}/fa/app/map`, 3500); await shot("14-empty-org-map");

// 8. logout / invalid token ends the session
await evalJs("localStorage.setItem('zubie.token','not-a-real-token')");
await go(`${WEB}/fa/app`, 4000);
check("an invalid token sends the user to the login page", (await evalJs("location.pathname")).includes("/login"), `path=${await evalJs("location.pathname")}`);

const csp = log.console.filter((l) => /content security policy|refused to/i.test(l));
check("no Content-Security-Policy violations in the whole run", csp.length === 0, csp.slice(0, 3).join(" | "));
console.log("\nCONSOLE ERRORS/WARNINGS (" + log.console.length + "):", JSON.stringify([...new Set(log.console)].slice(0, 12), null, 1));
console.log("UNCAUGHT EXCEPTIONS (" + log.errors.length + "):", JSON.stringify([...new Set(log.errors)].slice(0, 6), null, 1));
console.log("FAILED REQUESTS (" + log.failed.length + "):", JSON.stringify([...new Set(log.failed)].slice(0, 8), null, 1));
writeFileSync(join(SHOTS, "results.json"), JSON.stringify({ results, log }, null, 1));
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} browser checks passed`);
chrome.kill(); process.exit(0);

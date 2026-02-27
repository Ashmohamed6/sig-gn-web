import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execSync } from "node:child_process";

const BASE_URL = process.env.SIG_UI_BASE_URL || "http://localhost:3001";
const EDGE_PATH =
  process.env.SIG_EDGE_PATH ||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const DEBUG_PORT = Number(process.env.SIG_EDGE_DEBUG_PORT || 9234);

const scenarios = [
  {
    id: "mohamed",
    username: process.env.SIG_VISUAL_USER_MOHAMED || "mohamed",
    password: process.env.SIG_VISUAL_PASS_MOHAMED || "SigGn2024!",
    projectCode: (process.env.SIG_VISUAL_PROJECT_MOHAMED || "AGRIECO").toUpperCase(),
    expectedMode: "single",
  },
  {
    id: "admin_global",
    username: process.env.SIG_VISUAL_USER_ADMIN || "qa_admin_global",
    password: process.env.SIG_VISUAL_PASS_ADMIN || "Recette@2026!",
    projectCode: (process.env.SIG_VISUAL_PROJECT_ADMIN || "AGRIECO").toUpperCase(),
    expectedMode: "multi",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDebuggerEndpoint(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error("CDP debugger endpoint unavailable");
}

function launchEdge() {
  const profileDir = path.join(os.tmpdir(), `sig-gn-edge-cdp-${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const args = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--window-size=1600,1000",
    "about:blank",
  ];

  const child = spawn(EDGE_PATH, args, {
    stdio: ["ignore", "ignore", "ignore"],
    detached: false,
  });

  return { child, profileDir };
}

async function createClient(port) {
  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!listRes.ok) throw new Error("Unable to fetch CDP target list");

  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error("No page target found");

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (err) => reject(err);
  });

  let seq = 0;
  const pending = new Map();
  const eventWaiters = [];

  ws.onmessage = (event) => {
    let payload;
    try {
      payload = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (payload.id) {
      const req = pending.get(payload.id);
      if (!req) return;
      pending.delete(payload.id);
      if (payload.error) req.reject(new Error(payload.error.message || "CDP error"));
      else req.resolve(payload.result);
      return;
    }

    if (payload.method) {
      for (let i = 0; i < eventWaiters.length; i += 1) {
        const waiter = eventWaiters[i];
        if (waiter.method !== payload.method) continue;
        if (waiter.predicate && !waiter.predicate(payload.params || {})) continue;
        clearTimeout(waiter.timer);
        eventWaiters.splice(i, 1);
        waiter.resolve(payload.params || {});
        break;
      }
    }
  };

  function send(method, params = {}) {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function waitEvent(method, { predicate, timeoutMs = 30000 } = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = eventWaiters.indexOf(waiter);
        if (idx >= 0) eventWaiters.splice(idx, 1);
        reject(new Error(`Event timeout: ${method}`));
      }, timeoutMs);

      const waiter = { method, predicate, resolve, reject, timer };
      eventWaiters.push(waiter);
    });
  }

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result?.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
    }
    return result?.result?.value;
  }

  async function navigate(url, timeoutMs = 45000) {
    const loaded = waitEvent("Page.loadEventFired", { timeoutMs });
    await send("Page.navigate", { url });
    await loaded;
    await sleep(200);
  }

  async function waitForCondition(expression, timeoutMs = 20000, intervalMs = 250) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ok = await evaluate(expression);
      if (ok) return true;
      await sleep(intervalMs);
    }
    throw new Error(`Condition timeout: ${expression.slice(0, 80)}...`);
  }

  async function screenshot(filePath) {
    const data = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
    });
    fs.writeFileSync(filePath, Buffer.from(data.data, "base64"));
  }

  async function close() {
    try {
      ws.close();
    } catch {
      // ignore
    }
  }

  return { send, waitEvent, evaluate, navigate, waitForCondition, screenshot, close };
}

async function clearSession(client) {
  await client.send("Network.enable");
  await client.send("Network.clearBrowserCookies");
  await client.send("Network.clearBrowserCache");
}

async function login(client, username, password) {
  await client.navigate(`${BASE_URL}/login`);

  await client.waitForCondition(
    "(() => !!document.querySelector(\"input[type='password']\"))()",
    20000
  );

  const escapedUser = JSON.stringify(username);
  const escapedPass = JSON.stringify(password);

  const loginResult = await client.evaluate(`(() => {
    const setValue = (el, value) => {
      if (!el) return false;
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && typeof desc.set === 'function') {
        desc.set.call(el, value);
      } else {
        el.value = value;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const userInput = document.querySelector("input[type='text']") || document.querySelector("input[name='username']") || document.querySelector("input[name='email']");
    const passInput = document.querySelector("input[type='password']");
    if (!userInput || !passInput) {
      return { ok: false, reason: 'inputs_not_found' };
    }

    setValue(userInput, ${escapedUser});
    setValue(passInput, ${escapedPass});

    const buttons = Array.from(document.querySelectorAll('button'));
    const submit = buttons.find((b) => /se\s*connecter/i.test((b.textContent || '').trim())) || buttons.find((b) => b.type === 'submit');
    if (!submit) {
      return { ok: false, reason: 'submit_not_found' };
    }

    submit.click();
    return { ok: true };
  })()`);

  if (!loginResult?.ok) {
    throw new Error(`Login form interaction failed: ${JSON.stringify(loginResult)}`);
  }

  await client.waitForCondition(
    "(() => !window.location.pathname.includes('/login'))()",
    30000
  );
}

async function maybeSelectProject(client, projectCode) {
  const pathName = await client.evaluate("window.location.pathname");
  if (!String(pathName).includes("/project-selection")) return false;

  const escapedProject = JSON.stringify(projectCode);
  const result = await client.evaluate(`(() => {
    const projectCode = ${escapedProject};
    const buttons = Array.from(document.querySelectorAll('button'));
    const card = buttons.find((b) => (b.textContent || '').toUpperCase().includes(projectCode));
    if (!card) return { ok: false, reason: 'project_card_not_found' };
    card.click();

    const continueBtn = buttons.find((b) => /continuer/i.test((b.textContent || '').trim()));
    if (!continueBtn) return { ok: false, reason: 'continue_not_found' };
    continueBtn.click();
    return { ok: true };
  })()`);

  if (!result?.ok) {
    throw new Error(`Project selection failed: ${JSON.stringify(result)}`);
  }

  await client.waitForCondition(
    "(() => !window.location.pathname.includes('/project-selection'))()",
    30000
  );
  return true;
}

async function openCartographyExportModal(client) {
  await client.navigate(`${BASE_URL}/cartographie`);

  const current = await client.evaluate("window.location.pathname");
  if (String(current).includes("/project-selection")) {
    return { redirectedToProjectSelection: true };
  }

  await client.waitForCondition(
    "(() => !!document.querySelector('.leaflet-container') && !!document.querySelector('button[title=\"Imprimer / Exporter\"]'))()",
    60000
  );

  const clicked = await client.evaluate(`(() => {
    const btn = document.querySelector('button[title="Imprimer / Exporter"]');
    if (!btn) return false;
    btn.click();
    return true;
  })()`);
  if (!clicked) throw new Error("Export toolbar button not found");

  await client.waitForCondition(
    "(() => Array.from(document.querySelectorAll('h2')).some((h) => /Exporter la carte/i.test(h.textContent || '')))()",
    20000
  );

  return { redirectedToProjectSelection: false };
}

async function collectRegionState(client) {
  return client.evaluate(`(() => {
    const select = Array.from(document.querySelectorAll('select')).find((s) =>
      Array.from(s.options || []).some((o) => /selectionner une region|sélectionner une région/i.test((o.textContent || '').trim()))
    );
    if (!select) return { found: false };

    const options = Array.from(select.options || [])
      .map((o) => ({ text: (o.textContent || '').trim(), value: (o.value || '').trim() }))
      .filter((o) => o.value);

    return {
      found: true,
      disabled: !!select.disabled,
      value: (select.value || '').trim(),
      options: options.map((o) => o.text),
      optionCount: options.length,
    };
  })()`);
}

async function collectLegendState(client) {
  await client.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Mise en page/i.test((b.textContent || '').trim()));
    if (btn) btn.click();
    return true;
  })()`);

  await client.waitForCondition(
    "(() => Array.from(document.querySelectorAll('p')).some((p) => /Couches dans la legende|Couches dans la légende/i.test((p.textContent || '').trim())))()",
    10000
  );

  return client.evaluate(`(() => {
    const legendLabel = Array.from(document.querySelectorAll('p')).find((p) => /Couches dans la legende|Couches dans la légende/i.test((p.textContent || '').trim()));
    if (!legendLabel) return { found: false };

    const block = legendLabel.closest('div');
    const rows = block ? Array.from(block.querySelectorAll('div > div.flex.items-center.gap-2')) : [];
    const htmlSymbols = rows.map((r) => {
      const symbol = r.querySelector('span');
      return (symbol?.innerHTML || '').trim();
    });

    const symbolRichCount = htmlSymbols.filter((h) => /<svg|<div|<span/i.test(h)).length;

    return {
      found: true,
      label: (legendLabel.textContent || '').trim(),
      rowCount: rows.length,
      symbolRichCount,
    };
  })()`);
}

async function triggerExport(client, scenarioId) {
  await client.evaluate(`(() => {
    const headerTab = Array.from(document.querySelectorAll('button')).find((b) => /En-tete|En-tête/i.test((b.textContent || '').trim()));
    if (headerTab) headerTab.click();
    return true;
  })()`);

  const escapedTitle = JSON.stringify(`Test visuel export ${scenarioId}`);

  await client.evaluate(`(() => {
    const setValue = (el, value) => {
      if (!el) return false;
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && typeof desc.set === 'function') {
        desc.set.call(el, value);
      } else {
        el.value = value;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const titleInput = Array.from(document.querySelectorAll('input[type="text"]'))
      .find((el) => /Titre de la carte/i.test(el.closest('div')?.textContent || ''));
    if (titleInput) {
      setValue(titleInput, ${escapedTitle});
    }

    const regionSelect = Array.from(document.querySelectorAll('select')).find((s) =>
      Array.from(s.options || []).some((o) => /selectionner une region|sélectionner une région/i.test((o.textContent || '').trim()))
    );

    if (regionSelect && !regionSelect.disabled) {
      const candidate = Array.from(regionSelect.options || []).find((o) => (o.value || '').trim());
      if (candidate) {
        regionSelect.value = candidate.value;
        regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const exportBtn = Array.from(document.querySelectorAll('button')).find((b) => /Exporter en/i.test((b.textContent || '').trim()));
    if (!exportBtn) return { ok: false, reason: 'export_button_not_found' };
    exportBtn.click();
    return { ok: true };
  })()`);

  await client.waitForCondition(
    "(() => Array.from(document.querySelectorAll('div')).some((d) => /Export/i.test((d.textContent || '').trim()) && /succes|succes/i.test((d.textContent || '').trim())))()",
    60000
  );

  const successText = await client.evaluate(`(() => {
    const msg = Array.from(document.querySelectorAll('div')).find((d) =>
      /Export/i.test((d.textContent || '').trim()) && /succes|succes/i.test((d.textContent || '').trim())
    );
    return msg ? (msg.textContent || '').trim() : '';
  })()`);

  return { ok: true, successText };
}

async function runScenario(client, outDir, scenario) {
  const result = {
    id: scenario.id,
    username: scenario.username,
    expectedMode: scenario.expectedMode,
    status: "ok",
    notes: [],
  };

  try {
    await clearSession(client);
    await login(client, scenario.username, scenario.password);
    await maybeSelectProject(client, scenario.projectCode);

    let openRes = await openCartographyExportModal(client);
    if (openRes.redirectedToProjectSelection) {
      await maybeSelectProject(client, scenario.projectCode);
      openRes = await openCartographyExportModal(client);
    }

    const headerShot = path.join(outDir, `${scenario.id}_01_modal_header.png`);
    await client.screenshot(headerShot);
    result.headerScreenshot = headerShot;

    const regionState = await collectRegionState(client);
    result.regionState = regionState;

    const legendState = await collectLegendState(client);
    result.legendState = legendState;

    const layoutShot = path.join(outDir, `${scenario.id}_02_modal_layout.png`);
    await client.screenshot(layoutShot);
    result.layoutScreenshot = layoutShot;

    const exportState = await triggerExport(client, scenario.id);
    result.exportState = exportState;

    const finalShot = path.join(outDir, `${scenario.id}_03_after_export.png`);
    await client.screenshot(finalShot);
    result.afterExportScreenshot = finalShot;

    if (scenario.expectedMode === "single") {
      if (!regionState?.found) result.notes.push("region_select_not_found");
      if (regionState?.found && !regionState.disabled) {
        result.status = "warning";
        result.notes.push("single_region_expected_disabled_but_enabled");
      }
      if (regionState?.found && Number(regionState.optionCount || 0) !== 1) {
        result.status = "warning";
        result.notes.push(`single_region_expected_1_option_got_${regionState.optionCount}`);
      }
    }

    if (scenario.expectedMode === "multi") {
      if (!regionState?.found) result.notes.push("region_select_not_found");
      if (regionState?.found && regionState.disabled) {
        result.status = "warning";
        result.notes.push("multi_region_expected_enabled_but_disabled");
      }
      if (regionState?.found && Number(regionState.optionCount || 0) < 2) {
        result.status = "warning";
        result.notes.push(`multi_region_expected_>=2_options_got_${regionState.optionCount}`);
      }
    }

    if (!legendState?.found || Number(legendState.rowCount || 0) === 0) {
      result.status = "warning";
      result.notes.push("legend_rows_missing");
    }

    if (Number(legendState?.symbolRichCount || 0) === 0) {
      result.status = "warning";
      result.notes.push("legend_symbol_preview_missing");
    }
  } catch (err) {
    result.status = "error";
    result.error = err?.message || String(err);
  }

  return result;
}

async function main() {
  if (!fs.existsSync(EDGE_PATH)) {
    throw new Error(`Edge not found at ${EDGE_PATH}`);
  }

  const outDir = path.resolve(process.cwd(), "tmp", "visual-cartographie-export");
  fs.mkdirSync(outDir, { recursive: true });

  const { child, profileDir } = launchEdge();
  let client = null;

  try {
    await waitForDebuggerEndpoint(DEBUG_PORT, 25000);
    client = await createClient(DEBUG_PORT);

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const results = [];
    for (const scenario of scenarios) {
      // eslint-disable-next-line no-await-in-loop
      const r = await runScenario(client, outDir, scenario);
      results.push(r);
      // eslint-disable-next-line no-await-in-loop
      await sleep(800);
    }

    const reportPath = path.join(outDir, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify({ baseUrl: BASE_URL, generatedAt: new Date().toISOString(), results }, null, 2));

    for (const r of results) {
      console.log(`SCENARIO ${r.id} status=${r.status}`);
      if (r.regionState) {
        console.log(
          `  region found=${r.regionState.found} disabled=${r.regionState.disabled} options=${r.regionState.optionCount} values=${(r.regionState.options || []).join(" | ")}`
        );
      }
      if (r.legendState) {
        console.log(`  legend rows=${r.legendState.rowCount} richSymbols=${r.legendState.symbolRichCount}`);
      }
      if (r.exportState) {
        console.log(`  export success=${r.exportState.ok} text=${r.exportState.successText || ""}`);
      }
      if (r.error) {
        console.log(`  error=${r.error}`);
      }
      if (Array.isArray(r.notes) && r.notes.length > 0) {
        console.log(`  notes=${r.notes.join(",")}`);
      }
      console.log(`  shots=${r.headerScreenshot || "-"}, ${r.layoutScreenshot || "-"}, ${r.afterExportScreenshot || "-"}`);
    }

    console.log(`REPORT ${reportPath}`);
  } finally {
    try {
      if (client) await client.close();
    } catch {
      // ignore
    }

    if (child?.pid) {
      try {
        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
      } catch {
        // ignore
      }
    }

    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

import { chromium } from "@playwright/test";

const baseUrl = process.env.SIG_UI_BASE_URL || "http://localhost:3001";
const username = process.env.SIG_SMOKE_USERNAME || "qa_admin_global";
const password = process.env.SIG_SMOKE_PASSWORD || "Recette@2026!";
const projectCode = (process.env.SIG_SMOKE_PROJECT || "AGRIECO").toUpperCase();

function fail(message) {
  throw new Error(`[smoke-administration-ui] ${message}`);
}

async function maybeSelectProject(page) {
  if (!page.url().includes("/project-selection")) return;

  const card = page.locator("button", { hasText: projectCode }).first();
  if ((await card.count()) === 0) {
    fail(`project card not found: ${projectCode}`);
  }
  await card.click();

  const continueBtn = page.getByRole("button", { name: /continuer/i });
  await continueBtn.click();
  await page.waitForLoadState("networkidle");
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });

    await page.locator("input[type='text']").first().fill(username);
    await page.locator("input[type='password']").first().fill(password);
    await page.getByRole("button", { name: /se connecter/i }).click();

    await page.waitForLoadState("networkidle");
    await maybeSelectProject(page);

    await page.goto(`${baseUrl}/administration`, { waitUntil: "networkidle", timeout: 45000 });
    if (!page.url().includes("/administration")) {
      fail("administration page not reached");
    }

    const qaTab = page.getByRole("button", { name: /\bqa\b/i }).first();
    if ((await qaTab.count()) === 0) fail("QA tab not found");
    await qaTab.click();

    const qaTitle = page.getByRole("heading", { name: /qa - qualite des imports/i });
    if ((await qaTitle.count()) === 0) fail("QA title not found");

    const qaRefreshBtn = page.getByRole("button", { name: /^Rafraichir$/i }).first();
    if ((await qaRefreshBtn.count()) === 0) fail("QA refresh button not found");
    await qaRefreshBtn.click();
    await page.waitForTimeout(1200);

    const qaExportBtn = page.getByRole("button", { name: /^Exporter CSV$/i }).first();
    if ((await qaExportBtn.count()) === 0) fail("QA export button not found");
    if (await qaExportBtn.isDisabled()) fail("QA export button is disabled");

    const qaDownloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await qaExportBtn.click();
    const qaDownload = await qaDownloadPromise;
    const qaFilename = qaDownload.suggestedFilename();
    if (!qaFilename.toLowerCase().includes("qa_imports_")) {
      fail(`unexpected QA export filename: ${qaFilename}`);
    }

    const refreshViewsBtn = page.getByRole("button", { name: /refresh vues core\/marts/i }).first();
    if ((await refreshViewsBtn.count()) === 0) fail("Refresh views button not found");
    if (await refreshViewsBtn.isDisabled()) fail("Refresh views button is disabled");
    await refreshViewsBtn.click();

    const refreshFeedback = page.getByText(/run_id:|Aucune vue materialisee core\/marts a rafraichir\./i).first();
    await refreshFeedback.waitFor({ state: "visible", timeout: 30000 });

    const referTab = page.locator("button[title*='ref.*']").first();
    if ((await referTab.count()) === 0) fail("Referentiels tab not found");
    await referTab.click();

    const referTitle = page.getByRole("heading", { name: /referentiels \(ref\.\*\)/i });
    if ((await referTitle.count()) === 0) fail("Referentiels title not found");

    const refLayerLabel = page.locator("label", { hasText: "Referentiel" }).first();
    if ((await refLayerLabel.count()) === 0) fail("Referentiel selector label not found");
    const refLayerSelect = refLayerLabel.locator("xpath=following-sibling::select[1]");
    if ((await refLayerSelect.count()) === 0) fail("Referentiel selector not found");
    await refLayerSelect.selectOption("admin-region");

    const refRefreshBtn = page.getByRole("button", { name: /^Rafraichir$/i }).first();
    if ((await refRefreshBtn.count()) === 0) fail("Referentiels refresh button not found");
    await refRefreshBtn.click();
    await page.waitForTimeout(1200);

    const refExportBtn = page.getByRole("button", { name: /^Exporter CSV$/i }).first();
    if ((await refExportBtn.count()) === 0) fail("Referentiels export button not found");
    if (await refExportBtn.isDisabled()) fail("Referentiels export button is disabled");

    const refDownloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await refExportBtn.click();
    const refDownload = await refDownloadPromise;
    const refFilename = refDownload.suggestedFilename();
    if (!refFilename.toLowerCase().includes("referentiel_admin-region_")) {
      fail(`unexpected referentiels export filename: ${refFilename}`);
    }

    const openMapBtn = page.getByRole("button", { name: /ouvrir cartographie/i }).first();
    if ((await openMapBtn.count()) === 0) fail("Open map button not found");
    await openMapBtn.click();

    await page.waitForURL(/\/cartographie\?layer=/i, { timeout: 30000 });
    if (!page.url().includes("layer=regions")) {
      fail(`unexpected cartography layer deep-link: ${page.url()}`);
    }

    console.log("[smoke-administration-ui] OK");
    console.log(`[smoke-administration-ui] QA export: ${qaFilename}`);
    console.log(`[smoke-administration-ui] Referentiels export: ${refFilename}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

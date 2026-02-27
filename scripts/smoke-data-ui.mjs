import { chromium } from "@playwright/test";

const baseUrl = process.env.SIG_UI_BASE_URL || "http://localhost:3001";
const username = process.env.SIG_SMOKE_USERNAME || "qa_admin_global";
const password = process.env.SIG_SMOKE_PASSWORD || "Recette@2026!";
const projectCode = (process.env.SIG_SMOKE_PROJECT || "AGRIECO").toUpperCase();

function fail(message) {
  throw new Error(`[smoke-data-ui] ${message}`);
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
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });

    await page.locator("input[type='text']").first().fill(username);
    await page.locator("input[type='password']").first().fill(password);
    await page.getByRole("button", { name: /se connecter/i }).click();

    await page.waitForLoadState("networkidle");
    await maybeSelectProject(page);

    if (!page.url().includes("/dashboard")) {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 45000 });
    }

    await page.goto(`${baseUrl}/data`, { waitUntil: "networkidle", timeout: 45000 });

    if ((await page.getByText("Données", { exact: false }).count()) === 0) {
      fail("data page title not found");
    }

    // Switch tab and interact with filters/search.
    const intrantsTab = page.getByRole("button", { name: /distributions d'intrants/i });
    if ((await intrantsTab.count()) > 0) {
      await intrantsTab.click();
    }

    const search = page.getByPlaceholder("Rechercher par ID, nom, organisation...");
    if ((await search.count()) === 0) {
      fail("data search input not found");
    }
    await search.fill("RIZ");
    await page.waitForTimeout(800);

    // Pick first row if any.
    const firstRow = page.locator("tbody tr").first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForTimeout(300);
      const closeBtn = page.getByRole("button", { name: /fermer/i }).last();
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
      }
    }

    // Try selection checkbox.
    const rowCheckbox = page.locator("tbody input[type='checkbox']").first();
    if ((await rowCheckbox.count()) > 0) {
      await rowCheckbox.check();
      await page.waitForTimeout(300);
    }

    console.log("[smoke-data-ui] OK");
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

const baseUrl = process.env.SIG_UI_BASE_URL || "http://localhost:3001";
const defaultPassword = process.env.SIG_SMOKE_PASSWORD || "Recette@2026!";

const usersPath = "/api/proxy/admin/users?page=1&page_size=1";
const importsPath = "/api/proxy/import/log?page=1&page_size=1";
const workflowPath = "/api/proxy/workflow/submissions?page=1&page_size=1";
const refSchemaPath = "/api/proxy/data/referentiels/admin-region/schema";

function fail(message) {
  throw new Error(`[smoke-administration-roles] ${message}`);
}

function getSetCookieHeaders(headers) {
  const maybeHeaders = headers;
  if (typeof maybeHeaders.getSetCookie === "function") {
    return maybeHeaders.getSetCookie();
  }

  const single = headers.get("set-cookie");
  if (!single) return [];

  return single.split(/,(?=[^;,\s]+=)/g);
}

function buildCookieHeader(setCookies) {
  return setCookies
    .map((cookieLine) => cookieLine.split(";")[0]?.trim())
    .filter((value) => Boolean(value))
    .join("; ");
}

function makeAccount(label, username, password, checks, crossProjectChecks) {
  return {
    label,
    username,
    password: password || defaultPassword,
    checks,
    crossProjectChecks: crossProjectChecks || [],
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isThrottleMessage(bodyText) {
  const body = String(bodyText || "").toLowerCase();
  return body.includes("ralentie") || body.includes("throttle") || body.includes("too many");
}

function getRetryDelayMs(bodyText, fallbackMs) {
  const match = String(bodyText || "").match(/available in\s+(\d+)\s+seconds/i);
  if (!match) return fallbackMs;
  const sec = Number(match[1]);
  if (!Number.isFinite(sec) || sec <= 0) return fallbackMs;
  return (sec + 1) * 1000;
}

const cookieCache = new Map();

async function loginAndGetCookieHeader(username, password) {
  const cacheKey = `${username}:${password}`;
  const cached = cookieCache.get(cacheKey);
  if (cached) return cached;

  const maxAttempts = 5;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SIG-Intent": "1",
      },
      body: JSON.stringify({ username, password }),
      redirect: "manual",
    });

    if (response.ok) {
      const cookieHeader = buildCookieHeader(getSetCookieHeaders(response.headers));
      if (!cookieHeader) {
        fail(`login for ${username} did not return authentication cookies`);
      }
      cookieCache.set(cacheKey, cookieHeader);
      return cookieHeader;
    }

    const body = await response.text();
    if (!isThrottleMessage(body) || attempt >= maxAttempts) {
      fail(`login failed for ${username} (${response.status}): ${body.slice(0, 240)}`);
    }

    const delayMs = getRetryDelayMs(body, attempt * 4000);
    console.log(
      `[smoke-administration-roles] login throttled for ${username}, retry in ${Math.round(delayMs / 1000)}s`
    );
    await sleep(delayMs);
  }

  fail(`login failed for ${username} after retries`);
}

async function checkStatus(params) {
  const {
    cookieHeader,
    path,
    expectedStatus,
    projectCode,
    includeProjectHeader = true,
    accountLabel,
    contextLabel,
  } = params;

  const headers = {
    Accept: "application/json",
    Cookie: cookieHeader,
  };

  if (includeProjectHeader && projectCode) {
    headers["X-Project-Code"] = projectCode;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers,
    redirect: "manual",
  });

  const raw = await response.text();
  if (response.status !== expectedStatus) {
    fail(
      `${contextLabel} ${accountLabel} ${path} expected ${expectedStatus}, got ${response.status}. Body: ${raw.slice(0, 240)}`
    );
  }

  console.log(
    `[smoke-administration-roles] ${contextLabel} ${accountLabel} ${path} -> ${response.status} (expected ${expectedStatus})`
  );
}

const adminChecks = [
  { path: usersPath, expected: 200 },
  { path: importsPath, expected: 200 },
  { path: workflowPath, expected: 200 },
  { path: refSchemaPath, expected: 200 },
];

const nonEditorAdminChecks = [
  { path: usersPath, expected: 200 },
  { path: importsPath, expected: 200 },
  { path: workflowPath, expected: 200 },
  { path: refSchemaPath, expected: 200 },
];

const editorChecks = [
  { path: usersPath, expected: 403 },
  { path: importsPath, expected: 403 },
  { path: workflowPath, expected: 200 },
  { path: refSchemaPath, expected: 403 },
];

const matrixes = [
  {
    projectCode: "FIERE",
    accounts: [
      makeAccount(
        "project_manager",
        process.env.SIG_SMOKE_PM_FIERE_USER || "qa_pm_fiere",
        process.env.SIG_SMOKE_PM_FIERE_PASSWORD || process.env.SIG_SMOKE_PM_PASSWORD,
        nonEditorAdminChecks,
        [
          { path: importsPath, expected: 403 },
          { path: workflowPath, expected: 403 },
        ]
      ),
      makeAccount(
        "manager",
        process.env.SIG_SMOKE_MANAGER_FIERE_USER || "qa_sa_fiere_kindia",
        process.env.SIG_SMOKE_MANAGER_FIERE_PASSWORD || process.env.SIG_SMOKE_MANAGER_PASSWORD,
        nonEditorAdminChecks,
        [
          { path: importsPath, expected: 403 },
          { path: workflowPath, expected: 403 },
        ]
      ),
      makeAccount(
        "editor",
        process.env.SIG_SMOKE_EDITOR_FIERE_USER || "qa_fiere_kindia",
        process.env.SIG_SMOKE_EDITOR_FIERE_PASSWORD || process.env.SIG_SMOKE_EDITOR_PASSWORD,
        editorChecks,
        [{ path: workflowPath, expected: 403 }]
      ),
    ],
  },
  {
    projectCode: "AGRIECO",
    accounts: [
      makeAccount(
        "project_manager",
        process.env.SIG_SMOKE_PM_AGRIECO_USER || "qa_pm_agrieco",
        process.env.SIG_SMOKE_PM_AGRIECO_PASSWORD || process.env.SIG_SMOKE_PM_PASSWORD,
        nonEditorAdminChecks,
        [
          { path: importsPath, expected: 403 },
          { path: workflowPath, expected: 403 },
        ]
      ),
      makeAccount(
        "manager",
        process.env.SIG_SMOKE_MANAGER_AGRIECO_USER || "qa_sa_agrieco_kindia",
        process.env.SIG_SMOKE_MANAGER_AGRIECO_PASSWORD || process.env.SIG_SMOKE_MANAGER_PASSWORD,
        nonEditorAdminChecks,
        [
          { path: importsPath, expected: 403 },
          { path: workflowPath, expected: 403 },
        ]
      ),
      makeAccount(
        "editor",
        process.env.SIG_SMOKE_EDITOR_AGRIECO_USER || "qa_agrieco_mamou",
        process.env.SIG_SMOKE_EDITOR_AGRIECO_PASSWORD || process.env.SIG_SMOKE_EDITOR_PASSWORD,
        editorChecks,
        [{ path: workflowPath, expected: 403 }]
      ),
    ],
  },
];

const adminAccount = makeAccount(
  "admin",
  process.env.SIG_SMOKE_ADMIN_USER || "qa_admin_global",
  process.env.SIG_SMOKE_ADMIN_PASSWORD,
  adminChecks
);

function getOtherProject(projectCode) {
  return matrixes.find((m) => m.projectCode !== projectCode)?.projectCode || null;
}

async function runMatrix(matrix) {
  const contextLabel = `[${matrix.projectCode}]`;
  const otherProject = getOtherProject(matrix.projectCode);
  const accounts = [adminAccount, ...matrix.accounts];

  console.log(`[smoke-administration-roles] START matrix ${matrix.projectCode}`);

  for (const account of accounts) {
    const cookieHeader = await loginAndGetCookieHeader(account.username, account.password);

    await checkStatus({
      cookieHeader,
      path: "/api/proxy/accounts/me",
      expectedStatus: 200,
      includeProjectHeader: false,
      accountLabel: account.label,
      contextLabel,
    });

    for (const check of account.checks) {
      await checkStatus({
        cookieHeader,
        path: check.path,
        expectedStatus: check.expected,
        projectCode: matrix.projectCode,
        includeProjectHeader: true,
        accountLabel: account.label,
        contextLabel,
      });
    }

    if (otherProject && account.crossProjectChecks.length > 0) {
      for (const check of account.crossProjectChecks) {
        await checkStatus({
          cookieHeader,
          path: check.path,
          expectedStatus: check.expected,
          projectCode: otherProject,
          includeProjectHeader: true,
          accountLabel: account.label,
          contextLabel: `${contextLabel} cross->${otherProject}`,
        });
      }
    }
  }
}

async function run() {
  for (const matrix of matrixes) {
    await runMatrix(matrix);
  }
  console.log("[smoke-administration-roles] ALL ROLE MATRICES PASSED");
}

run().catch((errorValue) => {
  const message = errorValue instanceof Error ? errorValue.message : String(errorValue);
  console.error(message);
  process.exit(1);
});

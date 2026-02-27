const baseUrl = process.env.SIG_UI_BASE_URL || "http://localhost:3001";
const username = process.env.SIG_SMOKE_USERNAME || "qa_admin_global";
const password = process.env.SIG_SMOKE_PASSWORD || "Recette@2026!";
const projectCode = (process.env.SIG_SMOKE_PROJECT || "AGRIECO").toUpperCase();

function fail(message) {
  throw new Error(`[smoke-administration-api] ${message}`);
}

function getSetCookieHeaders(headers) {
  const maybeHeaders = headers;
  if (typeof maybeHeaders.getSetCookie === "function") {
    return maybeHeaders.getSetCookie();
  }

  const single = headers.get("set-cookie");
  if (!single) return [];

  // Fallback parser when getSetCookie() is unavailable.
  return single.split(/,(?=[^;,\s]+=)/g);
}

function buildCookieHeader(setCookies) {
  return setCookies
    .map((cookieLine) => cookieLine.split(";")[0]?.trim())
    .filter((value) => Boolean(value))
    .join("; ");
}

async function loginAndGetCookieHeader() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SIG-Intent": "1",
    },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });

  if (!response.ok) {
    const body = await response.text();
    fail(`login failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const cookieHeader = buildCookieHeader(getSetCookieHeaders(response.headers));
  if (!cookieHeader) {
    fail("login did not return authentication cookies");
  }

  return cookieHeader;
}

function parseJsonSafe(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function checkEndpoint(cookieHeader, target) {
  const headers = {
    Accept: "application/json",
    Cookie: cookieHeader,
  };

  if (target.includeProjectHeader !== false) {
    headers["X-Project-Code"] = projectCode;
  }

  const response = await fetch(`${baseUrl}${target.path}`, {
    method: "GET",
    headers,
    redirect: "manual",
  });

  const raw = await response.text();
  if (response.status !== 200) {
    fail(`${target.path} returned ${response.status}: ${raw.slice(0, 240)}`);
  }

  if (typeof target.validate === "function") {
    const payload = parseJsonSafe(raw);
    target.validate(payload, target.path);
  }

  console.log(`[smoke-administration-api] OK ${target.path} -> 200`);
}

async function run() {
  const cookieHeader = await loginAndGetCookieHeader();

  const targets = [
    {
      path: "/administration",
      includeProjectHeader: false,
    },
    {
      path: "/api/proxy/accounts/me",
      includeProjectHeader: false,
      validate(payload, path) {
        const role = payload && typeof payload === "object" ? payload.role : null;
        if (typeof role !== "string" || role.trim().length === 0) {
          fail(`${path} payload missing role`);
        }
      },
    },
    {
      path: "/api/proxy/admin/users?page=1&page_size=1",
      validate(payload, path) {
        const count = payload && typeof payload === "object" ? payload.count : null;
        if (typeof count !== "number") {
          fail(`${path} payload missing numeric count`);
        }
      },
    },
    {
      path: "/api/proxy/import/log?page=1&page_size=1",
      validate(payload, path) {
        const count = payload && typeof payload === "object" ? payload.count : null;
        if (typeof count !== "number") {
          fail(`${path} payload missing numeric count`);
        }
      },
    },
    {
      path: "/api/proxy/workflow/submissions?page=1&page_size=1",
      validate(payload, path) {
        const count = payload && typeof payload === "object" ? payload.count : null;
        if (typeof count !== "number") {
          fail(`${path} payload missing numeric count`);
        }
      },
    },
    {
      path: "/api/proxy/data/referentiels/admin-region/schema",
      validate(payload, path) {
        const layerId = payload && typeof payload === "object" ? payload.layer_id : null;
        if (typeof layerId !== "string" || layerId.trim().length === 0) {
          fail(`${path} payload missing layer_id`);
        }
      },
    },
  ];

  for (const target of targets) {
    await checkEndpoint(cookieHeader, target);
  }

  console.log("[smoke-administration-api] ALL CHECKS PASSED");
}

run().catch((errorValue) => {
  const message = errorValue instanceof Error ? errorValue.message : String(errorValue);
  console.error(message);
  process.exit(1);
});

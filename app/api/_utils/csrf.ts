import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const INTENT_HEADER_NAME = "x-sig-intent";
const INTENT_HEADER_VALUE = "1";

function normalizeOrigin(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    return new URL(input).origin.toLowerCase();
  } catch {
    return null;
  }
}

function parseOriginList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => normalizeOrigin(v.trim()))
    .filter((v): v is string => Boolean(v));
}

function buildAllowedOrigins(request: NextRequest): Set<string> {
  const allowed = new Set<string>();

  const runtimeOrigin = normalizeOrigin(request.nextUrl.origin);
  if (runtimeOrigin) {
    allowed.add(runtimeOrigin);
  }

  const appOrigin = normalizeOrigin(process.env.APP_URL);
  if (appOrigin) {
    allowed.add(appOrigin);
  }

  for (const origin of parseOriginList(process.env.APP_ALLOWED_ORIGINS)) {
    allowed.add(origin);
  }

  for (const origin of parseOriginList(process.env.DJANGO_CSRF_TRUSTED_ORIGINS)) {
    allowed.add(origin);
  }

  return allowed;
}

function isUnsafeMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function rejectIfCsrfRisk(request: NextRequest): NextResponse | null {
  if (!isUnsafeMethod(request.method)) {
    return null;
  }

  const intent = request.headers.get(INTENT_HEADER_NAME);
  if (intent !== INTENT_HEADER_VALUE) {
    return NextResponse.json(
      { message: "CSRF blocked (missing security header)" },
      { status: 403 }
    );
  }

  const secFetchSite = (request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (secFetchSite === "cross-site") {
    return NextResponse.json({ message: "CSRF blocked (cross-site request)" }, { status: 403 });
  }

  const origin = normalizeOrigin(request.headers.get("origin"));
  if (!origin) {
    // Non-browser clients may not send Origin/Sec-Fetch-*; keep compatibility.
    return null;
  }

  const allowedOrigins = buildAllowedOrigins(request);
  if (!allowedOrigins.has(origin)) {
    return NextResponse.json({ message: "CSRF blocked (origin mismatch)" }, { status: 403 });
  }

  return null;
}

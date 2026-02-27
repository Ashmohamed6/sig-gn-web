import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { rejectIfCsrfRisk } from "@/app/api/_utils/csrf";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_HOST || "http://localhost:8000"
).replace(/\/+$/, "");

function getCookieSecurity() {
  const secure = process.env.NODE_ENV === "production";
  return {
    secure,
    sameSite: (secure ? "strict" : "lax") as "strict" | "lax",
  };
}

function buildTargetUrl(pathParts: string[], search: string): string {
  const rawPath = pathParts.join("/").replace(/^\/+/, "");
  const apiPath = rawPath.startsWith("api/") ? rawPath : `api/${rawPath}`;
  // DRF endpoints in this project are slash-terminated; enforce it to avoid POST redirect failures.
  const normalizedPath = apiPath.endsWith("/") ? apiPath : `${apiPath}/`;
  return `${BACKEND_API_URL}/${normalizedPath}${search}`;
}

function buildForwardHeaders(request: NextRequest, accessToken: string): Headers {
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("Accept", accept);
  }

  const projectCode = request.headers.get("x-project-code");
  if (projectCode) {
    headers.set("X-Project-Code", projectCode);
  }

  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

async function refreshAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) {
    return null;
  }

  const refreshResponse = await fetch(`${BACKEND_API_URL}/api/accounts/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
  });

  if (!refreshResponse.ok) {
    return null;
  }

  const payload = await refreshResponse.json().catch(() => null);
  const newAccess = payload?.access;
  if (!newAccess) {
    return null;
  }
  const cookieSecurity = getCookieSecurity();

  cookieStore.set("access_token", newAccess, {
    httpOnly: true,
    secure: cookieSecurity.secure,
    sameSite: cookieSecurity.sameSite,
    path: "/",
  });

  return newAccess;
}

function responseFromBackend(backendResponse: Response, body: string): NextResponse {
  const response = new NextResponse(body, {
    status: backendResponse.status,
  });

  const contentType = backendResponse.headers.get("content-type");
  if (contentType) {
    response.headers.set("content-type", contentType);
  }

  response.headers.set("cache-control", "no-store");
  return response;
}

async function forward(request: NextRequest, pathParts: string[]): Promise<NextResponse> {
  const csrfRejected = rejectIfCsrfRisk(request);
  if (csrfRejected) {
    return csrfRejected;
  }

  const cookieStore = await cookies();
  let accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Non authentifie" }, { status: 401 });
  }

  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();

  const targetUrl = buildTargetUrl(pathParts, request.nextUrl.search);
  let headers = buildForwardHeaders(request, accessToken);

  let backendResponse = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  if (backendResponse.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = refreshed;
      headers = buildForwardHeaders(request, accessToken);

      backendResponse = await fetch(targetUrl, {
        method,
        headers,
        body,
        cache: "no-store",
      });
    }
  }

  const responseBody = await backendResponse.text();
  return responseFromBackend(backendResponse, responseBody);
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

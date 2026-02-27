import { cookies } from "next/headers";

const API_URL = (
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_HOST || "http://localhost:8000"
).replace(/\/+$/, "");

const APP_URL = (
  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/+$/, "");

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload?.detail || payload?.message || `API Error: ${response.status}`;
  } catch {
    return `API Error: ${response.status}`;
  }
}

// Requete sans authentification (login, register, etc.)
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

// Requete authentifiee (access token en cookie HTTP-only)
export async function authenticatedApiRequest(endpoint: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  let response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options?.headers,
    },
    ...options,
  });

  // Access token expire
  if (response.status === 401) {
    const refreshRes = await fetch(`${APP_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "X-SIG-Intent": "1",
      },
    });

    if (!refreshRes.ok) {
      throw new Error("Session expiree");
    }

    const newAccessToken = (await cookies()).get("access_token")?.value;

    response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(newAccessToken && {
          Authorization: `Bearer ${newAccessToken}`,
        }),
        ...options?.headers,
      },
      ...options,
    });
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

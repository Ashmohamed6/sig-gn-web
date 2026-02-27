import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiRequest } from "@/utils/api";
import { setAuthCookies } from "@/utils/auth";

export async function GET() {
  const cookieStore = await cookies();
  let access = cookieStore.get("access_token")?.value;
  const refresh = cookieStore.get("refresh_token")?.value;

  if (!access && !refresh) {
    return NextResponse.json({ message: "Non authentifie" }, { status: 401 });
  }

  const fetchCurrentUser = async (token: string) =>
    apiRequest("/api/accounts/me/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

  try {
    if (!access && refresh) {
      const refreshed = await apiRequest("/api/accounts/token/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
      access = refreshed?.access;
      if (access) {
        await setAuthCookies(access, refresh);
      }
    }

    if (!access) {
      return NextResponse.json({ message: "Non authentifie" }, { status: 401 });
    }

    let user;
    try {
      user = await fetchCurrentUser(access);
    } catch {
      if (!refresh) {
        throw new Error("No refresh token");
      }

      const refreshed = await apiRequest("/api/accounts/token/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
      access = refreshed?.access;

      if (!access) {
        throw new Error("Refresh token invalide");
      }

      await setAuthCookies(access, refresh);
      user = await fetchCurrentUser(access);
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ message: "Non authentifie" }, { status: 401 });
  }
}

import { cookies } from "next/headers";

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function setAuthCookies(access: string, refresh: string) {
  const cookieStore = await cookies();
  const secure = isSecureCookie();

  cookieStore.set("access_token", access, {
    httpOnly: true,
    secure,
    sameSite: secure ? "strict" : "lax",
    path: "/",
  });

  cookieStore.set("refresh_token", refresh, {
    httpOnly: true,
    secure,
    sameSite: secure ? "strict" : "lax",
    path: "/",
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

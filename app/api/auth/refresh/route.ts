import { NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/utils/api";
import { cookies } from "next/headers";
import { setAuthCookies } from "@/utils/auth";
import { rejectIfCsrfRisk } from "@/app/api/_utils/csrf";

export async function POST(req: NextRequest) {
  const csrfRejected = rejectIfCsrfRisk(req);
  if (csrfRejected) {
    return csrfRejected;
  }

  const cookieStore = await cookies();
  const refresh = cookieStore.get("refresh_token")?.value;

  if (!refresh) {
    return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  }

  try {
    const { access } = await apiRequest("/api/accounts/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    });

    await setAuthCookies(access, refresh);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Session expirée" }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/utils/api";
import { setAuthCookies } from "@/utils/auth";
import { rejectIfCsrfRisk } from "@/app/api/_utils/csrf";

export async function POST(req: NextRequest) {
  const csrfRejected = rejectIfCsrfRisk(req);
  if (csrfRejected) {
    return csrfRejected;
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || body?.email || "").trim();
  const password = String(body?.password || "");

  if (!username || !password) {
    return NextResponse.json({ message: "Identifiants invalides" }, { status: 400 });
  }

  try {
    // Utilise l'endpoint JWT standard (plus stable) et accepte email/username via serializer backend.
    const data = await apiRequest("/api/accounts/token/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const { access, refresh } = data;

    if (!access || !refresh) {
      return NextResponse.json({ message: "Tokens manquants dans la reponse" }, { status: 500 });
    }

    await setAuthCookies(access, refresh);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || "Identifiants invalides",
      },
      {
        status: 401,
      }
    );
  }
}

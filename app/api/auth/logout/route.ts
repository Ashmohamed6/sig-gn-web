import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/utils/auth";
import { rejectIfCsrfRisk } from "@/app/api/_utils/csrf";

export async function POST(req: NextRequest) {
  const csrfRejected = rejectIfCsrfRisk(req);
  if (csrfRejected) {
    return csrfRejected;
  }

  await clearAuthCookies();
  return NextResponse.json({ success: true });
}

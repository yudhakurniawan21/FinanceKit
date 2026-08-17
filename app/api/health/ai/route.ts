import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { testPoolsideKey } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/health/ai  → cek keabsahan Poolside API key (tanpa stream).
// Dibatasi sesi login agar endpoint tidak bisa disalahgunakan untuk
// memicu panggilan API eksternal (cost abuse).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ok = await testPoolsideKey();
    return NextResponse.json({ ok, provider: "poolside" });
  } catch {
    return NextResponse.json({ ok: false, provider: "poolside" }, { status: 503 });
  }
}
import { NextResponse } from "next/server";
import { testPoolsideKey } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/health/ai  → cek keabsahan Poolside API key (tanpa stream)
export async function GET() {
  try {
    const ok = await testPoolsideKey();
    return NextResponse.json(
      ok
        ? { ok: true, provider: "poolside" }
        : { ok: false, provider: "poolside" }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, provider: "poolside", error: String(e).slice(0, 200) },
      { status: 401 }
    );
  }
}

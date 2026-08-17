import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { streamInsight, testPoolsideKey, isFinancialQuestion, OUT_OF_SCOPE_REPLY } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PROMPT_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 20_000;

// 10 permintaan/menit per user (API berbayar; batasi biaya).
const RATE = { capacity: 10, refillPerSecond: 10 / 60 };

async function requireAuth(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET(request: NextRequest) {
  const userId = await requireAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tes konektivitas / keabsahan Poolside API key.
  const url = new URL(request.url);
  if (url.searchParams.get("check") === "key") {
    const ok = await testPoolsideKey();
    return NextResponse.json({ ok, provider: "poolside" });
  }
  return NextResponse.json({ status: "poolside-ai-ready" });
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`insights:${userId}`, RATE)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await request
    .json()
    .catch(() => ({})) as {
    prompt?: string;
    context?: string;
  };

  const prompt = (body.prompt ?? "").slice(0, MAX_PROMPT_LENGTH);
  const context = (body.context ?? "").slice(0, MAX_CONTEXT_LENGTH);

  if (!prompt.trim()) {
    return NextResponse.json({ error: "Prompt kosong" }, { status: 400 });
  }

  // Tolak cepat pertanyaan di luar konteks keuangan (tanpa biaya token).
  if (!isFinancialQuestion(prompt)) {
    return new Response(OUT_OF_SCOPE_REPLY, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, max-age=0",
      },
    });
  }

  // Streaming via TransformStream → client menerima per chunk.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const encoder = new TextEncoder();
  const writer = writable.getWriter();

  const pump = async () => {
    try {
      for await (const chunk of streamInsight(prompt, context)) {
        await writer.write(encoder.encode(chunk));
      }
      await writer.close();
    } catch (err) {
      console.error("[insights] stream error:", err);
      try {
        await writer.abort(err);
      } catch {
        // writer sudah ditutup; abaikan
      }
    }
  };
  void pump();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, max-age=0",
    },
  });
}

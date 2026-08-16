import OpenAI from "openai";

// Klien Poolside langsung (OpenAI-compatible), per contoh yang Anda berikan.
// Key disimpan di env: POOLSIDE_API_KEY, base URL inference.poolside.ai/v1.
// NOTE: jika POOLSIDE_API_KEY Anda berasal dari Vercel AI Gateway (prefix "sky_"),
// ubah POOLSIDE_BASE_URL ke "https://ai-gateway.vercel.sh" — lihat lib/ai.ts:detectBaseURL.
let _client: OpenAI | null = null;

export function getPoolsideClient(): OpenAI {
  const apiKey = process.env.POOLSIDE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "POOLSIDE_API_KEY belum diatur di environment. Tambahkan di .env.local (lokal) atau Environment Variables (Vercel)."
    );
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey,
      baseURL:
        process.env.POOLSIDE_BASE_URL?.trim() ||
        "https://inference.poolside.ai/v1",
    });
  }
  return _client;
}

export const POOLSIDE_MODEL = process.env.POOLSIDE_MODEL || "poolside/laguna-s-2.1";

const SYSTEM_PROMPT = [
  "Anda adalah FinansialKit AI, seorang asisten perencanaan keuangan pribadi yang cerdas dan ramah.",
  "Anda hanya menjawab dalam Bahasa Indonesia (kecuali diminta lain).",
  "Berikan insight finansial yang singkat, menggoda, dan dapat ditindaklanjuti berdasarkan data transaksi pengguna.",
  "Fokus pada: pola pengeluaran, kategori yang melebihi anggaran, saran hemat, dan ramalan singkat.",
  "Jika bertanya tentang hal di luar keuangan, arahkan kembali ke topik keuangan pribadi.",
].join("\n");

/**
 * Streaming insight generation. Server-only (dipanggil dari route handler).
 * @returns async generator of text chunks.
 */
export async function* streamInsight(
  prompt: string,
  context: string = ""
): AsyncIterable<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(context ? [{ role: "user" as const, content: `DATA KONTEXT:\n${context}` }] : []),
    { role: "user", content: prompt },
  ];

  const stream = await getPoolsideClient().chat.completions.create({
    model: POOLSIDE_MODEL,
    messages,
    stream: true,
    temperature: 0.4,
    max_tokens: 700,
  });

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content ?? "";
    if (content) yield content;
  }
}

/**
 * Non-streaming helper (mengembalikan teks penuh).
 */
export async function generateInsight(
  prompt: string,
  context: string = ""
): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(context ? [{ role: "user" as const, content: `DATA KONTEXT:\n${context}` }] : []),
    { role: "user", content: prompt },
  ];

  const res = await getPoolsideClient().chat.completions.create({
    model: POOLSIDE_MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 700,
  });

  return res.choices?.[0]?.message?.content ?? "";
}

/** Uji konektivitas / keabsahan API key. */
export async function testPoolsideKey(): Promise<boolean> {
  try {
    await getPoolsideClient().models.list();
    return true;
  } catch {
    return false;
  }
}

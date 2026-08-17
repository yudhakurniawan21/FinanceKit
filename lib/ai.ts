import OpenAI from "openai";

// Klien Poolside langsung (OpenAI-compatible), per contoh yang Anda berikan.
// Key disimpan di env: POOLSIDE_API_KEY, base URL inference.poolside.ai/v1.
// NOTE: jika POOLSIDE_API_KEY Anda berasal dari Vercel AI Gateway (prefix "sky_"),
// ubah POOLSIDE_BASE_URL ke "https://ai-gateway.vercel.sh" — lihat lib/ai.ts:detectBaseURL.
let _client: OpenAI | null = null;

function getPoolsideClient(): OpenAI {
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

const POOLSIDE_MODEL = process.env.POOLSIDE_MODEL || "poolside/laguna-s-2.1";

const SYSTEM_PROMPT = [
  "Anda adalah FinansialKit AI, asisten perencanaan keuangan pribadi yang cerdas dan ramah.",
  "Anda HANYA membahas topik keuangan pribadi pengguna berdasarkan data transaksi yang diberikan: pola pengeluaran, kategori, anggaran, saran hemat, ringkasan bulanan, perencanaan keuangan, dan net worth (aset, kewajiban, kekayaan bersih).",
  "Jawab dalam Bahasa Indonesia, kecuali pengguna menulis dalam bahasa lain — gunakan bahasa yang sama dengan pengguna.",
  "Jika pertanyaan TIDAK berkaitan dengan keuangan pribadi (misalnya resep masakan, cuaca, kode program, pengetahuan umum, politik, hiburan, terjemahan, dll), JANGAN menjawab isi pertanyaan tersebut. Tolak dengan sopan dalam 1-2 kalimat dan arahkan kembali ke topik keuangan.",
  "Jika data tidak cukup untuk menjawab, akui keterbatasan itu dan sarankan tindakan yang bisa dilakukan dengan data yang ada.",
  "Jawaban singkat, jelas, dan dapat ditindaklanjuti.",
].join("\n");

/**
 * Deteksi pertanyaan di luar konteks keuangan pribadi.
 * Konservatif: hanya menolak bila jelas di luar topik DAN tanpa istilah finansial
 * apa pun, sehingga tidak ada false-positive pada pertanyaan keuangan.
 */
const OUT_OF_SCOPE_MARKERS = [
  "resep", "masak", "makanan apa", "cuaca", "presiden", "politik", "sejarah",
  "piala", "sepak bola", "film", "musik", "lagu", "buku", "game", "foto",
  "fotografi", "terjemahkan", "translate", "ibu kota", "ibukota", "kode",
  "program", "python", "javascript", "website", "aplikasi", "bahasa pemrograman",
  "cara membuat", "rumus", "persamaan", "kimia", "fisika", "biologi",
  "pemerintah", "negara", "planet", "hewan", "tumbuhan", "recipe", "cook",
  "weather", "president", "politics", "history", "movie", "song", "game",
  "translate", "capital of", "how to make", "code", "program", "formula",
  "equation", "chemistry", "physics", "biology", "country", "planet",
] as const;

const FINANCIAL_KEYWORDS = [
  "uang", "keuangan", "budget", "anggaran", "transaksi", "saldo", "belanja",
  "pengeluaran", "pemasukan", "tabungan", "investasi", "gaji", "tagihan",
  "hutang", "utang", "kredit", "debit", "kartu", "bank", "dompet", "menabung",
  "hemat", "harga", "jual", "beli", "cicilan", "bunga", "suku", "asuransi",
  "pajak", "properti", "saham", "reksa", "dana", "rupiah", "dollar", "euro",
  "income", "expense", "savings", "invest", "salary", "bill", "debt", "loan",
  "credit", "finance", "financial", "money", "spend", "spending", "cash",
  "wallet", "budget", "cost", "price", "pay", "payment", "monthly", "mortgage",
  "net worth", "kekayaan", "aset", "liabilitas", "kewajiban", "asset",
  "liability", "vermoegen", "vermögen",
] as const;

export function isFinancialQuestion(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const hasFinancialTerm = FINANCIAL_KEYWORDS.some((k) => lower.includes(k));
  if (hasFinancialTerm) return true;
  return !OUT_OF_SCOPE_MARKERS.some((m) => lower.includes(m));
}

export const OUT_OF_SCOPE_REPLY =
  "Maaf, saya hanya bisa membantu seputar keuangan pribadi kamu — misalnya " +
  "pola pengeluaran, anggaran, saran hemat, atau ringkasan bulan ini. " +
  "Pertanyaan di luar topik keuangan tidak bisa saya jawab. " +
  "Silakan tanya hal yang berkaitan dengan keuanganmu!";


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

/** Uji konektivitas / keabsahan API key. */
export async function testPoolsideKey(): Promise<boolean> {
  try {
    await getPoolsideClient().models.list();
    return true;
  } catch {
    return false;
  }
}

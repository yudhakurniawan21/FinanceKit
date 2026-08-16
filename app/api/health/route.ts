import prisma from "@/lib/prisma";

// Endpoint kesehatan: memastikan koneksi DB (PostgreSQL) bekerja.
// Dipakai untuk debug lokal + verifikasi setelah deploy.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      ok: true,
      db: "postgresql",
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

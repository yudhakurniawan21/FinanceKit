import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCurrencyMeta, minorToMajor } from "@/lib/currencies";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Export transaksi ke CSV (UTF-8 + BOM agar Excel menampilkan huruf
// Indonesia dengan benar). Filter: ?start=YYYY-MM-DD&end=YYYY-MM-DD&type=...
// Di-streaming per halaman (cursor) sehingga aman untuk data besar.
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const type = searchParams.get("type");

  if ((start && !DATE_RE.test(start)) || (end && !DATE_RE.test(end))) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (type && type !== "INCOME" && type !== "EXPENSE") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { currency: true },
  });
  const currency = settings?.currency ?? "IDR";

  const where: Prisma.TransactionWhereInput = {
    userId: session.user.id,
    ...(start ? { date: { gte: new Date(start) } } : {}),
    ...(end ? { date: { lte: new Date(end) } } : {}),
    ...(type === "INCOME" || type === "EXPENSE" ? { type } : {}),
  };

  const minorUnit = getCurrencyMeta(currency).minorUnit;
  const toMajor = (minor: number) =>
    minorToMajor(minor, currency).toFixed(minorUnit);

  // Escape: petik ganda untuk CSV + guard formula injection Excel
  // (nilai diawali =, +, -, @ diberi prefix apostrof).
  const esc = (v: string | null | undefined) => {
    const s = v ?? "";
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const header = [
    "Tanggal",
    "Jenis",
    "Kategori",
    "Deskripsi",
    "Metode",
    "Akun",
    "Jumlah",
  ]
    .map(esc)
    .join(",");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`\uFEFF${header}\r\n`));
        let cursor: { id: string } | undefined;
        while (true) {
          const page = await prisma.transaction.findMany({
            where,
            include: {
              category: { select: { name: true } },
              account: { select: { name: true } },
            },
            orderBy: { id: "asc" },
            take: PAGE_SIZE,
            ...(cursor ? { cursor, skip: 1 } : {}),
          });
          for (const t of page) {
            const row = [
              t.date.toISOString().slice(0, 10),
              esc(t.type),
              esc(t.category?.name),
              esc(t.description),
              esc(t.method),
              esc(t.account?.name),
              toMajor(t.amount),
            ].join(",");
            controller.enqueue(encoder.encode(`${row}\r\n`));
          }
          if (page.length < PAGE_SIZE) break;
          cursor = { id: page[page.length - 1].id };
        }
        controller.close();
      } catch (err) {
        console.error("[export] stream error:", err);
        controller.error(err);
      }
    },
  });

  const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, max-age=0",
    },
  });
}
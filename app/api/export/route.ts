import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrencyMeta, minorToMajor } from "@/lib/currencies";

export const dynamic = "force-dynamic";

// Export transaksi ke CSV (UTF-8 + BOM agar Excel menampilkan huruf
// Indonesia dengan benar). Filter: ?start=YYYY-MM-DD&end=YYYY-MM-DD&type=...
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const type = searchParams.get("type");

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { currency: true },
  });
  const currency = settings?.currency ?? "IDR";

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      ...(start ? { date: { gte: new Date(start) } } : {}),
      ...(end ? { date: { lte: new Date(end) } } : {}),
      ...(type === "INCOME" || type === "EXPENSE" ? { type } : {}),
    },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const minorUnit = getCurrencyMeta(currency).minorUnit;
  const toMajor = (minor: number) => minorToMajor(minor, currency).toFixed(minorUnit);

  const esc = (v: string | null | undefined) => {
    const s = v ?? "";
    return `"${s.replace(/"/g, '""')}"`;
  };

  const rows = [
    [
      "Tanggal",
      "Jenis",
      "Kategori",
      "Deskripsi",
      "Metode",
      "Akun",
      "Jumlah",
    ],
    ...transactions.map((t) => [
      t.date.toISOString().slice(0, 10),
      t.type,
      esc(t.category?.name),
      esc(t.description),
      esc(t.method),
      esc(t.account?.name),
      toMajor(t.amount),
    ]),
  ];

  const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
  const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
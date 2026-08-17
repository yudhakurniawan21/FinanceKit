import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processDueRecurring } from "@/lib/db/recurring";

export const dynamic = "force-dynamic";

// Cron endpoint: panggil dari external scheduler (Vercel Cron, GitHub Actions,
// dll) dengan header `Authorization: Bearer <CRON_SECRET>`. Idempoten.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET tidak disetel." },
      { status: 503 }
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueUsers = await prisma.recurringTransaction.findMany({
    where: { isActive: true, nextRunDate: { lte: new Date() } },
    select: { userId: true },
    distinct: ["userId"],
  });

  let created = 0;
  for (const u of dueUsers) {
    created += await processDueRecurring(u.userId);
  }

  return NextResponse.json({ created, users: dueUsers.length });
}
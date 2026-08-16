import { parseISO } from "date-fns";

// Format tanggal timezone-aware. Tanggal disimpan sebagai @db.Date (UTC
// midnight); tanpa timezone eksplisit, pengguna di barat UTC akan melihat
// tanggal bergeser satu hari. Default Asia/Jakarta sesuai settings aplikasi.
export function formatDate(
  date: Date | string,
  fmt: string = "dd/MM/yyyy",
  timeZone: string = "Asia/Jakarta"
): string {
  const d = typeof date === "string" ? parseISO(date) : date;

  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const p: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") p[part.type] = part.value;
  }
  const dd = p.day ?? "01";
  const MM = p.month ?? "01";
  const yyyy = p.year ?? "1970";

  if (fmt === "yyyy-MM-dd") return `${yyyy}-${MM}-${dd}`;
  if (fmt === "MM/dd/yyyy") return `${MM}/${dd}/${yyyy}`;
  if (fmt === "dd MMMM yyyy") {
    const monthLong = new Intl.DateTimeFormat("id-ID", {
      timeZone,
      month: "long",
    }).format(d);
    return `${dd} ${monthLong} ${yyyy}`;
  }
  return `${dd}/${MM}/${yyyy}`;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

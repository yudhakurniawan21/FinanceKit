import { parseISO } from "date-fns";
import { langCode } from "@/lib/i18n";

// Format tanggal timezone-aware. Tanggal disimpan sebagai @db.Date (UTC
// midnight); tanpa timezone eksplisit, pengguna di barat UTC akan melihat
// tanggal bergeser satu hari. Default Asia/Jakarta sesuai settings aplikasi.
export function formatDate(
  date: Date | string,
  fmt: string = "dd/MM/yyyy",
  timeZone: string = "Asia/Jakarta",
  locale: string = "id-ID"
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const lc = langCode(locale);

  const parts = new Intl.DateTimeFormat(lc, {
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
    const monthLong = new Intl.DateTimeFormat(lc, {
      timeZone,
      month: "long",
    }).format(d);
    return `${dd} ${monthLong} ${yyyy}`;
  }
  return `${dd}/${MM}/${yyyy}`;
}

// Batas bulan kalender dalam timezone user (UTC midnight). Dipakai untuk
// window "bulan ini" yang konsisten dengan timezone settings user, bukan
// timezone server/DB.
export function monthBounds(
  date = new Date(),
  timeZone = "Asia/Jakarta"
): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const p: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") p[part.type] = part.value;
  }
  const y = Number(p.year ?? "1970");
  const m = Number(p.month ?? "01");
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 0)),
  };
}

// Geser bulan pada string "YYYY-MM" (delta bulan, bisa negatif).
// Dipakai untuk navigasi prev/next bulan di halaman laporan & insights.
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

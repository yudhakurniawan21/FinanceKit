const ITEMS = [
  "Catat transaksi",
  "Anggaran kategori",
  "Transfer antar akun",
  "Transaksi berulang",
  "Net worth",
  "AI insights",
  "Laporan bulanan",
];

export function Marquee() {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden} className="flex w-max items-center">
      {ITEMS.map((item) => (
        <span
          key={item}
          className="mx-5 flex items-center gap-5 text-sm font-bold uppercase tracking-[0.2em] text-[#0e0f0c]"
        >
          {item}
          <span aria-hidden className="text-[#0e0f0c]/40">
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative z-10 overflow-hidden bg-[#0e0f0c] py-4">
      <div className="-mx-4 -rotate-1 scale-x-110 border-y border-[#9fe870]/30 bg-[#9fe870] py-3 shadow-[0_16px_60px_-20px_rgba(159,232,112,0.6)]">
        <div className="fk-marquee-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
"use client";

import { format, type Locale } from "date-fns";
import { id as idLocale, enUS as enLocale, de as deLocale } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getCurrencyMeta } from "@/lib/currencies";
import { langCode } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { useEffect, useMemo, useRef, useState } from "react";

const DF_LOCALES: Record<string, Locale> = {
  id: idLocale,
  en: enLocale,
  de: deLocale,
};

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  locale = "id-ID",
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  locale?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const dfLocale = DF_LOCALES[langCode(locale)] ?? idLocale;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center justify-start gap-2 text-left font-normal",
          "border border-input bg-transparent px-3 py-2 text-sm rounded-lg",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
          value ? "text-foreground" : "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0" />
        {value ? (
          format(value, "PPP", { locale: dfLocale })
        ) : (
          <span>{placeholder ?? t("pickDate")}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d: Date | undefined) => onChange(d ?? null)}
          locale={dfLocale}
        />
      </PopoverContent>
    </Popover>
  );
}

// Input uang termasking real-time: pemisah ribuan muncul saat mengetik.
// `raw` menyimpan digit murni + posisi desimal (dalam ruang digit) sehingga
// parsing tidak ambigu; caret dikembalikan setelah reformat.
export function MoneyInput({
  name,
  label,
  defaultValue,
  currency,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue?: number;
  currency: string;
  disabled?: boolean;
}) {
  const meta = getCurrencyMeta(currency);
  const [raw, setRaw] = useState(defaultValue != null ? String(defaultValue) : "");
  const caretDigitRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const decimalSep = useMemo(() => {
    const s = (1.1).toLocaleString(meta.locale);
    return s.includes(",") ? "," : ".";
  }, [meta.locale]);

  const display = useMemo(() => {
    if (raw === "") return "";
    const dotIdx = raw.indexOf(".");
    const intPart = dotIdx === -1 ? raw : raw.slice(0, dotIdx);
    const decPart = dotIdx === -1 ? "" : raw.slice(dotIdx + 1);
    const intFmt = intPart ? Number(intPart).toLocaleString(meta.locale) : "0";
    if (decPart === "") {
      return dotIdx === -1 ? intFmt : `${intFmt}${decimalSep}`;
    }
    return `${intFmt}${decimalSep}${decPart}`;
  }, [raw, meta.locale, decimalSep]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || document.activeElement !== el) return;
    const formatted = el.value;
    let pos = formatted.length;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) count++;
      if (count >= caretDigitRef.current) {
        pos = i + 1;
        break;
      }
    }
    el.setSelectionRange(pos, pos);
  }, [display]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    caretDigitRef.current = el.value.slice(0, caret).replace(/\D/g, "").length;

    const text = el.value;
    const digits = text.replace(/\D/g, "");
    const sepCount = (text.match(/[.,]/g) ?? []).length;
    const prevSepCount = (display.match(/[.,]/g) ?? []).length;

    let decIndex: number | null = raw.includes(".") ? raw.indexOf(".") : null;
    if (meta.minorUnit > 0 && sepCount > prevSepCount) {
      decIndex = caretDigitRef.current;
    }
    if (sepCount < prevSepCount) {
      decIndex = null;
    }

    let next: string;
    if (decIndex != null && decIndex <= digits.length) {
      next =
        digits.slice(0, decIndex) +
        "." +
        digits.slice(decIndex).slice(0, meta.minorUnit);
    } else {
      next = digits;
    }
    setRaw(next);
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {meta.symbol}
        </span>
        <Input
          ref={inputRef}
          id={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          disabled={disabled}
          className="pl-10"
          placeholder="0"
        />
        <input type="hidden" name={name} value={raw} />
      </div>
    </div>
  );
}

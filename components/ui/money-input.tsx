"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrencyMeta } from "@/lib/currencies";

// Hook masker uang: menyimpan `raw` (digit murni + 1 titik desimal) dan
// menampilkan format ber-pemisah ribuan sesuai locale mata uang.
export function useMoneyMask({
  defaultValue,
  currency,
  onChangeRaw,
}: {
  defaultValue?: number | string;
  currency: string;
  onChangeRaw?: (raw: string) => void;
}) {
  const meta = getCurrencyMeta(currency);
  const [raw, setRaw] = useState(
    defaultValue != null ? String(defaultValue) : ""
  );
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

  // Kembalikan caret ke posisi digit yang sama setelah reformat.
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
    onChangeRaw?.(next);
  }

  return {
    raw,
    inputRef,
    inputProps: {
      ref: inputRef,
      type: "text" as const,
      inputMode: "decimal" as const,
      autoComplete: "off",
      value: display,
      onChange: handleChange,
    },
  };
}

// Input uang termasking dengan label + simbol mata uang.
// `raw` (digit murni) dikirim lewat hidden input sehingga server action
// menerima nilai tanpa pemisah ribuan.
export function MoneyInput({
  name,
  label,
  defaultValue,
  currency,
  disabled,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: number | string;
  currency: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const meta = getCurrencyMeta(currency);
  const { raw, inputProps } = useMoneyMask({ defaultValue, currency });

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {meta.symbol}
        </span>
        <Input
          {...inputProps}
          id={name}
          disabled={disabled}
          required={required}
          className="pl-10"
          placeholder={placeholder ?? "0"}
        />
        <input
          type="hidden"
          name={name}
          value={raw}
          disabled={disabled}
          required={required}
        />
      </div>
    </div>
  );
}
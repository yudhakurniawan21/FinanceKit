"use client";

import { format, type Locale } from "date-fns";
import { id as idLocale, enUS as enLocale, de as deLocale } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { langCode } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { useState } from "react";

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

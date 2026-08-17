"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { shiftMonth } from "@/lib/formatting";

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

function renderInsight(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    if (trimmed.startsWith("### "))
      return (
        <h4 key={i} className="mt-2 font-semibold">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
    if (trimmed.startsWith("## "))
      return (
        <h3 key={i} className="mt-3 font-semibold">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (numbered)
      return (
        <p key={i} className="flex gap-2">
          <span className="font-semibold text-primary">{numbered[1]}.</span>
          <span>{renderInline(numbered[2])}</span>
        </p>
      );
    if (trimmed.startsWith("- ") || trimmed.startsWith("* "))
      return (
        <p key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
          <span>{renderInline(trimmed.slice(2))}</span>
        </p>
      );
    return <p key={i}>{renderInline(trimmed)}</p>;
  });
}

export function InsightPanel({
  context,
  presetPrompts,
  month,
  monthLabel,
  isCurrentMonth,
}: {
  context: string;
  presetPrompts: Array<{ label: string; prompt: string }>;
  month: string;
  monthLabel: string;
  isCurrentMonth: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [insight, setInsight] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (insight) {
      endRef.current?.scrollTo({
        top: endRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [insight]);

  async function fetchInsight(promptText: string) {
    if (!promptText.trim() || isStreaming) return;
    setIsStreaming(true);
    setError("");
    setInsight("");

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, context }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server ${res.status}: ${txt.slice(0, 200)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error(t("streamError"));

      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setInsight(text);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("insightError"));
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(insight);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — abaikan
    }
  }

  return (
    <div className="space-y-4">
      {/* Navigasi bulan */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("prevMonth")}
          onClick={() => router.push(`/insights?month=${shiftMonth(month, -1)}`)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold">{monthLabel}</p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("nextMonth")}
          disabled={isCurrentMonth}
          onClick={() => router.push(`/insights?month=${shiftMonth(month, 1)}`)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Preset + prompt bebas */}
      <div className="flex flex-wrap gap-2">
        {presetPrompts.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => fetchInsight(p.prompt)}
            disabled={isStreaming}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("customPromptPlaceholder")}
          aria-label={t("customPromptPlaceholder")}
          rows={2}
          className="min-h-[56px] w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              fetchInsight(prompt);
            }
          }}
        />
        <Button
          size="lg"
          className="h-auto shrink-0"
          onClick={() => fetchInsight(prompt)}
          disabled={isStreaming || !prompt.trim()}
        >
          <Send className="h-4 w-4" />
          {t("askAI")}
        </Button>
      </div>

      <Card className="min-h-[220px]">
        <CardHeader className="items-start pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("insightTitle")}
          </CardTitle>
          <CardDescription>{t("insightDesc")}</CardDescription>
          <CardAction>
            {insight !== "" && !error && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                aria-label={t("copyInsight")}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-positive" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? t("copied") : t("copyInsight")}
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          <div
            ref={endRef}
            className="h-[260px] max-h-[50dvh] overflow-y-auto text-sm leading-relaxed"
          >
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : insight === "" ? (
              <p className="text-muted-foreground">{t("clickPrompt")}</p>
            ) : (
              <>
                {renderInsight(insight)}
                {isStreaming && (
                  <span className="inline-block animate-pulse text-primary">
                    ▌
                  </span>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isStreaming && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("generating")}
        </p>
      )}
    </div>
  );
}
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

export function InsightPanel({
  context,
  presetPrompts,
}: {
  context: string;
  presetPrompts: Array<{ label: string; prompt: string }>;
}) {
  const [insight, setInsight] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (insight) {
      endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [insight]);

  async function fetchInsight(prompt: string) {
    setIsStreaming(true);
    setError("");
    setInsight("");

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server ${res.status}: ${txt.slice(0, 200)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Tidak dapat membaca stream.");

      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setInsight(text);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Gagal mendapatkan insight. Cek POOLSIDE_API_KEY / env."
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Card className="min-h-[220px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Insight AI
          </CardTitle>
          <CardDescription>
            Insight disesuaikan dengan data transaksi Anda (gunakan Poolside
            API).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={endRef}
            className="prose prose-sm max-w-none h-[260px] overflow-y-auto whitespace-pre-wrap"
          >
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : insight === "" ? (
              <p className="text-muted-foreground">
                Klik salah satu tombol di atas untuk menghasilkan insight.
              </p>
            ) : (
              insight
            )}
            {isStreaming && (
              <span className="inline-block animate-pulse">▌</span>
            )}
          </div>
        </CardContent>
      </Card>

      {isStreaming && (
        <p className="text-xs text-muted-foreground">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Menyusun insight…
        </p>
      )}
    </div>
  );
}

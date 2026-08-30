"use client";

import { useState, type FormEvent } from "react";
import type { Category } from "@/lib/categories";
import AnalysisPanel, { type Analysis } from "./Analysis";
import ExtractedData from "./ExtractedData";

type ScrapeResult = {
  title: string | null;
  category: Category | null;
  data: unknown;
  dataError: string | null;
  analysis: Analysis | null;
  analysisError: string | null;
};

export default function Scraper() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResult(data);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-zinc-600 dark:text-zinc-400">
        Enter a URL. AI scrapes the page, figures out what kind of content it
        is, and interprets it - key themes, sentiment, and recommended
        actions, not just raw data.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-full border border-black/[.08] bg-white px-5 py-3 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "Scraping…" : "Scrape"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Title
            </h2>
            <p className="text-black dark:text-zinc-50">
              {result.title ?? "—"}
            </p>
          </div>

          {result.dataError && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {result.dataError}
            </p>
          )}

          {result.analysisError && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {result.analysisError}
            </p>
          )}

          {result.analysis && <AnalysisPanel analysis={result.analysis} />}

          {result.data != null && result.category && (
            <ExtractedData category={result.category} data={result.data} />
          )}
        </div>
      )}
    </div>
  );
}

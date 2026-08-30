"use client";

import { useState, type FormEvent } from "react";
import type { Category } from "@/lib/categories";
import ExtractedData from "./ExtractedData";

type ScrapeResult = {
  title: string | null;
  description: string | null;
  headings: string[];
  links: { text: string; href: string }[];
  category: Category | null;
  ai: unknown;
  aiError: string | null;
};

export default function QuickScrape() {
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
        Enter a URL. AI figures out what kind of page it is and pulls out the
        relevant data. One-off - nothing is saved.
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

          {result.description && (
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Description
              </h2>
              <p className="text-black dark:text-zinc-50">
                {result.description}
              </p>
            </div>
          )}

          {result.aiError && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {result.aiError}
            </p>
          )}

          {result.ai != null && result.category && (
            <ExtractedData category={result.category} data={result.ai} />
          )}

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Headings ({result.headings.length})
            </h2>
            <ul className="mt-2 flex flex-col gap-1">
              {result.headings.map((heading, i) => (
                <li key={i} className="text-black dark:text-zinc-50">
                  {heading}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Links ({result.links.length})
            </h2>
            <ul className="mt-2 flex flex-col gap-1">
              {result.links.map((link, i) => (
                <li key={i} className="truncate">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

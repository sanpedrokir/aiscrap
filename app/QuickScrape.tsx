"use client";

import { useState, type FormEvent } from "react";
import { CATEGORY_OPTIONS, type Category } from "@/lib/categories";
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
  const [step, setStep] = useState<"url" | "category">("url");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [customFieldsInput, setCustomFieldsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  function handleUrlSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    setStep("category");
  }

  async function runScrape(chosenCategory: Category | null) {
    setLoading(true);
    setError(null);
    setResult(null);

    const customFields = customFieldsInput
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, category: chosenCategory, customFields }),
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

  function reset() {
    setStep("url");
    setCategory(null);
    setCustomFieldsInput("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-zinc-600 dark:text-zinc-400">
        Enter a URL, then tell me what to pull out of it. One-off - nothing is
        saved.
      </p>

      {step === "url" && (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
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
            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Next
          </button>
        </form>
      )}

      {step === "category" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <button
              type="button"
              onClick={reset}
              className="underline hover:text-black dark:hover:text-zinc-50"
            >
              ← change URL
            </button>
            <span className="truncate">{url}</span>
          </div>

          <p className="text-sm font-medium text-black dark:text-zinc-50">
            What do you want to extract?
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                  category === opt.value
                    ? "border-black bg-black/[.04] dark:border-white dark:bg-white/[.08]"
                    : "border-black/[.08] hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
                }`}
              >
                <span className="font-medium text-black dark:text-zinc-50">
                  {opt.label}
                </span>
                <span className="text-xs text-zinc-500">{opt.fields}</span>
              </button>
            ))}
          </div>

          {category === "custom" && (
            <input
              type="text"
              value={customFieldsInput}
              onChange={(e) => setCustomFieldsInput(e.target.value)}
              placeholder="e.g. title, author, ISBN, price"
              className="rounded-full border border-black/[.08] bg-white px-5 py-3 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                loading ||
                !category ||
                (category === "custom" && !customFieldsInput.trim())
              }
              onClick={() => runScrape(category)}
              className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {loading ? "Scraping…" : "Scrape"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => runScrape(null)}
              className="rounded-full border border-black/[.08] px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-white/[.04]"
            >
              Skip - just scrape the basics
            </button>
          </div>
        </div>
      )}

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

"use client";

import { useState, type FormEvent } from "react";

type Category = "shopping" | "news" | "jobs" | "custom";

type ScrapeResult = {
  title: string | null;
  description: string | null;
  headings: string[];
  links: { text: string; href: string }[];
  category: Category | null;
  ai: unknown;
  aiError: string | null;
};

const CATEGORY_OPTIONS: {
  value: Category;
  label: string;
  fields: string;
}[] = [
  {
    value: "shopping",
    label: "Shopping",
    fields: "Product, price, rating, availability",
  },
  {
    value: "news",
    label: "News / Article",
    fields: "Headline, date, author, article",
  },
  {
    value: "jobs",
    label: "Jobs",
    fields: "Company, location, job title, salary",
  },
  { value: "custom", label: "Custom", fields: "You choose the fields" },
];

export default function Home() {
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
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex w-full max-w-2xl flex-col gap-8 py-16 px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Web Scraper
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Enter a URL, then tell me what to pull out of it.
          </p>
        </div>

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
              <AiResult category={result.category} ai={result.ai} />
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
      </main>
    </div>
  );
}

function AiResult({ category, ai }: { category: Category; ai: unknown }) {
  const data = ai as Record<string, unknown>;

  const rows: Record<string, unknown>[] =
    category === "shopping"
      ? (data.products as Record<string, unknown>[])
      : category === "jobs"
        ? (data.jobs as Record<string, unknown>[])
        : category === "custom"
          ? (data.items as Record<string, unknown>[])
          : [];

  if (category === "news") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Extracted Article
        </h2>
        <div className="text-sm text-zinc-500">
          {[data.author, data.date].filter(Boolean).join(" · ") || null}
        </div>
        {typeof data.headline === "string" && (
          <p className="text-lg font-semibold text-black dark:text-zinc-50">
            {data.headline}
          </p>
        )}
        {typeof data.article === "string" && (
          <p className="whitespace-pre-wrap text-black dark:text-zinc-50">
            {data.article}
          </p>
        )}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-black/[.08] p-4 text-sm text-zinc-500 dark:border-white/[.145]">
        No items found.
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Extracted Items ({rows.length})
      </h2>
      <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] dark:border-white/[.145]">
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-3 py-2 font-medium capitalize text-zinc-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-black/[.05] last:border-0 dark:border-white/[.08]"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 text-black dark:text-zinc-50"
                  >
                    {row[col] == null ? "—" : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

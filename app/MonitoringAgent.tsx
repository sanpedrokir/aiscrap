"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Category } from "@/lib/categories";
import ExtractedData from "./ExtractedData";

type Change = { type: "added" | "removed" | "updated"; description: string };
type Flagged = { reason: string; detail: string };

type Snapshot = {
  id: string;
  data: unknown;
  summary: string | null;
  changes: Change[] | null;
  flagged: Flagged[] | null;
  createdAt: string;
};

type Site = {
  id: string;
  url: string;
  category: Category;
  customFields: string[];
  createdAt: string;
  latest: Snapshot | null;
};

export default function MonitoringAgent() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const [checkErrors, setCheckErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function loadSites() {
    try {
      const res = await fetch("/api/sites");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load sites");
      setSites(data.sites);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load sites");
    }
  }

  useEffect(() => {
    loadSites();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();

    setAdding(true);
    setAddError(null);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error ?? "Something went wrong");
        return;
      }

      setSites((prev) => (prev ? [data, ...prev] : [data]));
      setUrl("");
    } catch {
      setAddError("Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  async function checkSite(id: string) {
    setChecking((prev) => ({ ...prev, [id]: true }));
    setCheckErrors((prev) => ({ ...prev, [id]: "" }));

    try {
      const res = await fetch(`/api/sites/${id}/check`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setCheckErrors((prev) => ({ ...prev, [id]: data.error ?? "Check failed" }));
        return;
      }

      setSites(
        (prev) =>
          prev?.map((site) => (site.id === id ? { ...site, latest: data } : site)) ??
          prev
      );
    } catch {
      setCheckErrors((prev) => ({ ...prev, [id]: "Check failed" }));
    } finally {
      setChecking((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function removeSite(id: string) {
    setSites((prev) => prev?.filter((site) => site.id !== id) ?? prev);
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-zinc-600 dark:text-zinc-400">
        Add a page to watch. Each time you check it, AI compares it to the
        last check, summarizes what changed, and flags anything worth your
        attention.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="rounded-full border border-black/[.08] bg-white px-5 py-3 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        />

        <button
          type="submit"
          disabled={adding}
          className="self-start rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {adding ? "Adding…" : "Start watching"}
        </button>

        {addError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {addError}
          </p>
        )}
      </form>

      {loadError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {loadError}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {sites === null && !loadError && (
          <p className="text-sm text-zinc-500">Loading watched sites…</p>
        )}

        {sites?.length === 0 && (
          <p className="text-sm text-zinc-500">
            Nothing being watched yet - add a URL above.
          </p>
        )}

        {sites?.map((site) => {
          const flaggedCount = site.latest?.flagged?.length ?? 0;
          const isExpanded = expanded[site.id] ?? false;

          return (
            <div
              key={site.id}
              className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {site.url}
                  </a>
                  <div className="text-xs text-zinc-500">
                    {site.category}
                    {site.latest &&
                      ` · last checked ${new Date(site.latest.createdAt).toLocaleString()}`}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {flaggedCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {flaggedCount} flagged
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => checkSite(site.id)}
                    disabled={checking[site.id]}
                    className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-white/[.04]"
                  >
                    {checking[site.id] ? "Checking…" : "Check now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSite(site.id)}
                    className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.04]"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {checkErrors[site.id] && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                  {checkErrors[site.id]}
                </p>
              )}

              {site.latest?.summary && (
                <p className="text-sm text-black dark:text-zinc-50">
                  {site.latest.summary}
                </p>
              )}

              {flaggedCount > 0 && (
                <ul className="flex flex-col gap-1 rounded-lg bg-amber-50 p-3 dark:bg-amber-950">
                  {site.latest!.flagged!.map((f, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {f.reason}:
                      </span>{" "}
                      <span className="text-amber-900 dark:text-amber-200">
                        {f.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {site.latest?.changes && site.latest.changes.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {site.latest.changes.map((c, i) => (
                    <li key={i}>
                      <span className="uppercase text-xs font-medium text-zinc-400">
                        {c.type}
                      </span>{" "}
                      {c.description}
                    </li>
                  ))}
                </ul>
              )}

              {site.latest && (
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [site.id]: !isExpanded }))
                  }
                  className="self-start text-xs text-zinc-500 underline hover:text-black dark:hover:text-zinc-50"
                >
                  {isExpanded ? "Hide extracted data" : "Show extracted data"}
                </button>
              )}

              {isExpanded && site.latest && (
                <ExtractedData category={site.category} data={site.latest.data} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import MonitoringAgent from "./MonitoringAgent";
import QuickScrape from "./QuickScrape";

type Tab = "monitor" | "quick";

export default function Home() {
  const [tab, setTab] = useState<Tab>("monitor");

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex w-full max-w-2xl flex-col gap-8 py-16 px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            AI Scraper
          </h1>
        </div>

        <div className="flex gap-1 rounded-full border border-black/[.08] p-1 dark:border-white/[.145] self-start">
          {(
            [
              { id: "monitor", label: "Monitoring Agent" },
              { id: "quick", label: "Quick Scrape" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-foreground text-background"
                  : "text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.04]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "monitor" ? <MonitoringAgent /> : <QuickScrape />}
      </main>
    </div>
  );
}

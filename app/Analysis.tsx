type Highlight = { label: string; detail: string };
type Sentiment = {
  overall: "positive" | "negative" | "mixed" | "neutral";
  detail: string;
};

export type Analysis = {
  summary: string;
  highlights: Highlight[];
  sentiment: Sentiment | null;
  recommendedActions: string[];
};

const SENTIMENT_STYLES: Record<Sentiment["overall"], string> = {
  positive: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  negative: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  mixed: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function AnalysisPanel({ analysis }: { analysis: Analysis }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          AI Analysis
        </h2>
        {analysis.sentiment && (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium capitalize ${SENTIMENT_STYLES[analysis.sentiment.overall]}`}
          >
            {analysis.sentiment.overall}
          </span>
        )}
      </div>

      <p className="text-black dark:text-zinc-50">{analysis.summary}</p>

      {analysis.sentiment && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {analysis.sentiment.detail}
        </p>
      )}

      {analysis.highlights.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Key themes
          </h3>
          <ul className="flex flex-col gap-2">
            {analysis.highlights.map((h, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-black dark:text-zinc-50">
                  {h.label}:
                </span>{" "}
                <span className="text-zinc-600 dark:text-zinc-400">{h.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendedActions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Recommended actions
          </h3>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {analysis.recommendedActions.map((a, i) => (
              <li key={i} className="text-sm text-black dark:text-zinc-50">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

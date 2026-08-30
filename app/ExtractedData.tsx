import type { Category } from "@/lib/categories";

export default function ExtractedData({
  category,
  data,
}: {
  category: Category;
  data: unknown;
}) {
  const record = data as Record<string, unknown>;

  const rows: Record<string, unknown>[] =
    category === "shopping"
      ? (record.products as Record<string, unknown>[])
      : category === "jobs"
        ? (record.jobs as Record<string, unknown>[])
        : category === "custom"
          ? (record.items as Record<string, unknown>[])
          : [];

  if (category === "news") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Extracted Article
        </h2>
        <div className="text-sm text-zinc-500">
          {[record.author, record.date].filter(Boolean).join(" · ") || null}
        </div>
        {typeof record.headline === "string" && (
          <p className="text-lg font-semibold text-black dark:text-zinc-50">
            {record.headline}
          </p>
        )}
        {typeof record.article === "string" && (
          <p className="whitespace-pre-wrap text-black dark:text-zinc-50">
            {record.article}
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
                  <td key={col} className="px-3 py-2 text-black dark:text-zinc-50">
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

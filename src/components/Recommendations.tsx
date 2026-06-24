import type { Recommendation } from "@/lib/analysis";

const CATEGORY_STYLE: Record<string, string> = {
  inversion: "border-l-rose-500",
  trend: "border-l-rose-400",
  hole: "border-l-amber-500",
  overlap: "border-l-amber-400",
  sample: "border-l-slate-400",
  equipment: "border-l-fairway-500",
};

export function Recommendations({ recs }: { recs: Recommendation[] }) {
  if (recs.length === 0)
    return (
      <section className="card border-l-4 border-l-fairway-500 p-4">
        <h2 className="font-semibold">Recommendations</h2>
        <p className="mt-1 text-sm text-slate-500">
          No structural issues detected. Keep collecting shots to tighten your
          averages.
        </p>
      </section>
    );

  return (
    <section className="card p-4">
      <h2 className="mb-3 font-semibold">Recommendations — address top-down</h2>
      <ol className="space-y-2">
        {recs.map((r, i) => (
          <li
            key={i}
            className={`rounded-md border-l-4 bg-slate-50 px-3 py-2 text-sm ${
              CATEGORY_STYLE[r.category] ?? "border-l-slate-300"
            }`}
          >
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 ring-1 ring-slate-200">
              {i + 1}
            </span>
            {r.text}
          </li>
        ))}
      </ol>
    </section>
  );
}

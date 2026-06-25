// Human-readable bag report (Markdown) — a shareable summary a golfer can take
// to a fitting. Pure: builds a string from a BagAnalysis using the display
// formatter for units. Date is passed in so the function stays deterministic.

import type { BagAnalysis } from "./analysis";
import type { Formatter } from "./format";

function adequacyLabel(level: string): string {
  return level === "trustworthy"
    ? "Trustworthy"
    : level === "low"
      ? "Low confidence"
      : "Insufficient";
}

export function buildBagReport(
  analysis: BagAnalysis,
  fmt: Formatter,
  dateStr: string,
): string {
  const { clubs, bagAdvice, optimization, recommendations, settings } = analysis;
  const metric = settings.metric === "carry" ? "Carry" : "Total";
  const unit = fmt.dUnit;
  const lines: string[] = [];

  lines.push(`# SimpleDistance — Bag Report`);
  lines.push("");
  lines.push(
    `Generated ${dateStr} · ${analysis.totalShots} shots · ${clubs.length} clubs · ${metric} distance (${unit}) · ${analysis.totalExcluded} mishit${analysis.totalExcluded === 1 ? "" : "s"} excluded`,
  );
  lines.push("");

  // Stock yardages
  lines.push(`## Stock yardages`);
  lines.push("");
  lines.push(
    `| Club | N | Mean (${unit}) | Stock | Reliable | Cons | 95% CI | Sample | Trend |`,
  );
  lines.push(`| --- | --: | --: | --: | --: | :-: | --- | --- | --- |`);
  for (const c of clubs) {
    const ci = Number.isFinite(c.ci.lower)
      ? `${fmt.d(c.ci.lower, 1)}–${fmt.d(c.ci.upper, 1)}`
      : "—";
    const trend =
      c.trend.classification === "real-trend"
        ? `real ${c.trend.direction}`
        : c.trend.classification === "noise"
          ? "noise"
          : "—";
    const stock = Number.isFinite(c.playing.stock) ? fmt.d(c.playing.stock, 0) : "—";
    const reliable = Number.isFinite(c.playing.reliable)
      ? fmt.d(c.playing.reliable, 0)
      : "—";
    lines.push(
      `| ${c.label} | ${c.n} | ${Number.isFinite(c.mean) ? fmt.d(c.mean, 1) : "—"} | ${stock} | ${reliable} | ${c.playing.consistencyGrade ?? "—"} | ${ci} | ${adequacyLabel(c.adequacy.level)} | ${trend} |`,
    );
  }
  lines.push("");
  lines.push(
    `_Stock = robust median carry; Reliable = a conservative carry you'll reach most of the time; Cons = carry-consistency grade (A best)._`,
  );
  lines.push("");

  // Bag structure
  lines.push(`## Bag structure`);
  lines.push("");
  if (Number.isFinite(bagAdvice.typicalGapYards)) {
    lines.push(`Typical gap ~${fmt.dist(bagAdvice.typicalGapYards, 0)}.`);
    lines.push("");
  }
  if (bagAdvice.items.length === 0) {
    lines.push(`No holes, overlaps, or inversions detected.`);
  } else {
    for (const item of bagAdvice.items) {
      lines.push(
        `- **${item.kind}${item.tentative ? " (tentative)" : ""}:** ${item.text}`,
      );
    }
  }
  lines.push("");

  // Optimizer
  lines.push(`## Bag optimizer (target ${fmt.dist(optimization.targetGapYards, 0)} ladder)`);
  lines.push("");
  for (const s of optimization.summary) lines.push(`- ${s}`);
  lines.push("");
  if (optimization.ladder.length > 0) {
    lines.push(`| Target (${unit}) | Current | Δ | Status |`);
    lines.push(`| --: | --- | --: | --- |`);
    for (const slot of optimization.ladder) {
      const cur = slot.currentClub ?? "—";
      const dev =
        slot.deviation != null
          ? `${slot.deviation >= 0 ? "+" : ""}${fmt.d(slot.deviation, 0)}`
          : "—";
      lines.push(`| ${fmt.d(slot.targetCarry, 0)} | ${cur} | ${dev} | ${slot.status} |`);
    }
    lines.push("");
  }

  // Data collection plan
  if (analysis.dataPlan.length > 0) {
    lines.push(`## Collect more data`);
    lines.push("");
    lines.push(
      `To reach trustworthy samples (${analysis.dataPlan.reduce((s, p) => s + p.neededForTrustworthy, 0)} shots total):`,
    );
    for (const p of analysis.dataPlan) {
      lines.push(`- **${p.label}**: +${p.neededForTrustworthy} shots (have ${p.currentN})`);
    }
    lines.push("");
  }

  // Recommendations
  lines.push(`## Recommendations`);
  lines.push("");
  if (recommendations.length === 0) {
    lines.push(`No structural issues to address — keep collecting shots.`);
  } else {
    recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r.text}`));
  }
  lines.push("");

  lines.push(`---`);
  lines.push("");
  lines.push(
    `_SimpleDistance is decision support, not a club fitting. Verdicts state their confidence and the data behind them; equipment/swing notes are hypotheses to check, not diagnoses._`,
  );
  lines.push("");

  return lines.join("\n");
}

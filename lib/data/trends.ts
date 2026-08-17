import { readFileSync } from "node:fs";
import path from "node:path";

export interface Trend {
  id: string;
  label: string;
  shoeImageUrl: string;
  buyUrl: string | null;
}

const trendsPath = path.join(process.cwd(), "public", "trends.json");

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTrend(value: unknown): value is Trend {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.label) &&
    isNonEmptyString(candidate.shoeImageUrl) &&
    (candidate.buyUrl === null || isNonEmptyString(candidate.buyUrl))
  );
}

export function getTrends(): Trend[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(trendsPath, "utf8"));

    if (!Array.isArray(parsed)) {
      throw new TypeError("Trend seed must be a JSON array");
    }

    const trends: Trend[] = [];
    const ids = new Set<string>();

    for (const entry of parsed) {
      if (!isTrend(entry) || ids.has(entry.id)) {
        console.error("Skipping invalid or duplicate trend entry");
        continue;
      }

      ids.add(entry.id);
      trends.push(entry);
    }

    return trends;
  } catch (error) {
    console.error("Unable to load curated trends", error);
    return [];
  }
}

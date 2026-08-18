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

function isCleanAbsoluteHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value) || value !== value.trim()) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validateTrend(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return "entry must be an object";
  }

  const candidate = value as Record<string, unknown>;
  if (!isNonEmptyString(candidate.id)) return "id must be a non-empty string";
  if (!isNonEmptyString(candidate.label)) return "label must be a non-empty string";
  if (!isNonEmptyString(candidate.shoeImageUrl)) {
    return "shoeImageUrl must be a non-empty string";
  }
  if (
    candidate.shoeImageUrl !== candidate.shoeImageUrl.trim() ||
    !candidate.shoeImageUrl.startsWith("/trends/") ||
    candidate.shoeImageUrl.startsWith("//") ||
    candidate.shoeImageUrl.includes("\\")
  ) {
    return "shoeImageUrl must be a clean root-relative /trends/ path";
  }
  if (candidate.buyUrl !== null && !isCleanAbsoluteHttpsUrl(candidate.buyUrl)) {
    return "buyUrl must be null or a clean absolute HTTPS URL";
  }
  return null;
}

export function getTrends(): Trend[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(trendsPath, "utf8"));

    if (!Array.isArray(parsed)) {
      throw new TypeError("Trend seed must be a JSON array");
    }

    const trends: Trend[] = [];
    const ids = new Set<string>();

    for (const [index, entry] of parsed.entries()) {
      const validationError = validateTrend(entry);
      if (validationError) {
        console.error(`Skipping trend entry at index ${index}: ${validationError}`);
        continue;
      }

      const trend = entry as Trend;
      if (ids.has(trend.id)) {
        console.error(`Skipping duplicate trend entry at index ${index}: id "${trend.id}"`);
        continue;
      }

      ids.add(trend.id);
      trends.push(trend);
    }

    return trends;
  } catch (error) {
    console.error("Unable to load curated trends", error);
    return [];
  }
}

export function getTrendById(id: string): Trend | undefined {
  if (!isNonEmptyString(id) || id !== id.trim()) {
    return undefined;
  }

  return getTrends().find((trend) => trend.id === id);
}

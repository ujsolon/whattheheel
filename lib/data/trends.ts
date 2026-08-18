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

// C0 controls and DEL, spelled by code point so no invisible bytes live in
// this file. `String.trim()` does not remove these, but the URL parser does.
function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

const MAX_BUY_URL_LENGTH = 2048;

// This value becomes the `href` of the product's only outbound link, so it is
// validated well past "does the URL parser accept it" — several inputs the
// parser happily accepts would render an anchor whose visible host is not
// where the click actually goes.
export function isCleanAbsoluteHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value) || value !== value.trim()) return false;
  if (value.length > MAX_BUY_URL_LENGTH) return false;
  // `String.trim()` strips whitespace but not other C0 controls, while the URL
  // parser silently removes them — so without this, the string that was
  // validated and the string that gets stored/rendered could differ
  // (e.g. "\u0000https://evil.example").
  if (hasControlCharacter(value)) return false;
  // Same reason the sibling shoeImageUrl check rejects backslashes: the parser
  // treats "\" as "/" for special schemes.
  if (value.includes("\\")) return false;
  // Requires the full authority form, rejecting the parser's "https:host" and
  // "https:/host" shorthand, which normalize to a real host but are not what
  // "absolute HTTPS URL" means here.
  if (!value.startsWith("https://")) return false;

  try {
    const url = new URL(value);
    // Userinfo can masquerade as the host — "https://retailer.example@evil.example"
    // reads as retailer.example but resolves to evil.example — and credentials
    // have no business in a retail link.
    return url.protocol === "https:" && url.username === "" && url.password === "";
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
  // buyUrl is deliberately NOT validated here. It is optional retail metadata,
  // and rejecting the entry over it would delete the shoe from the feed, the
  // stylist picker, deep links, and history-label resolution — epics.md and
  // EXPERIENCE.md both scope the failure to hiding the *button*, not the shoe.
  // An unusable value is normalized to null in normalizeBuyUrl instead.
  return null;
}

// Returns the usable retail URL, or null. A bad value costs the trend its Buy
// Now link and nothing else.
function normalizeBuyUrl(value: unknown, id: string): string | null {
  if (value === null || value === undefined) return null;
  if (isCleanAbsoluteHttpsUrl(value)) return value;
  console.error(`Trend "${id}": ignoring unusable buyUrl (must be null or a clean absolute HTTPS URL)`);
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

      const candidate = entry as Record<string, unknown> & Trend;
      if (ids.has(candidate.id)) {
        console.error(`Skipping duplicate trend entry at index ${index}: id "${candidate.id}"`);
        continue;
      }

      ids.add(candidate.id);
      trends.push({
        id: candidate.id,
        label: candidate.label,
        shoeImageUrl: candidate.shoeImageUrl,
        buyUrl: normalizeBuyUrl(candidate.buyUrl, candidate.id),
      });
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

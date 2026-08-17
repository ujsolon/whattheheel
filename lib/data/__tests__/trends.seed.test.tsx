import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Trend } from "@/lib/data/trends";

describe("curated trend seed", () => {
  it("parses the real seed and resolves every local image", () => {
    const publicDirectory = path.join(process.cwd(), "public");
    const seed = JSON.parse(
      readFileSync(path.join(publicDirectory, "trends.json"), "utf8"),
    ) as Trend[];

    expect(seed.length).toBeGreaterThan(0);
    for (const trend of seed) {
      expect(Object.keys(trend).sort()).toEqual(["buyUrl", "id", "label", "shoeImageUrl"]);
      expect(trend.id).toEqual(expect.any(String));
      expect(trend.label).toEqual(expect.any(String));
      expect(trend.shoeImageUrl).toEqual(expect.stringMatching(/^\/trends\//));
      expect(trend.buyUrl === null || typeof trend.buyUrl === "string").toBe(true);
      expect(existsSync(path.join(publicDirectory, trend.shoeImageUrl.slice(1)))).toBe(true);
    }
  });
});

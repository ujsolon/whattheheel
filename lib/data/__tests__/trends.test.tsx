import { readFileSync } from "node:fs";

import { getTrendById, getTrends } from "@/lib/data/trends";

jest.mock("node:fs", () => ({ readFileSync: jest.fn() }));

const mockedReadFileSync = jest.mocked(readFileSync);

describe("getTrends", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it("returns valid trends", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([
        {
          id: "loafer",
          label: "Loafer",
          shoeImageUrl: "/trends/loafer.png",
          buyUrl: null,
        },
      ]),
    );

    expect(getTrends()).toHaveLength(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("accepts a clean absolute HTTPS buy URL", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([
        {
          id: "loafer",
          label: "Loafer",
          shoeImageUrl: "/trends/loafer.png",
          buyUrl: "https://retailer.example/products/loafer",
        },
      ]),
    );

    expect(getTrends()).toHaveLength(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "/products/loafer",
    "//retailer.example/products/loafer",
    " https://retailer.example/products/loafer",
    "https://retailer.example/products/loafer ",
    "not a url",
    "",
  ])("skips an unsafe buy URL: %s", (buyUrl) => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([{ id: "unsafe", label: "Unsafe", shoeImageUrl: "/trends/unsafe.png", buyUrl }]),
    );

    expect(getTrends()).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "Skipping trend entry at index 0: buyUrl must be null or a clean absolute HTTPS URL",
    );
  });

  it("skips a non-string non-null buy URL", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([{ id: "unsafe", label: "Unsafe", shoeImageUrl: "/trends/unsafe.png", buyUrl: 42 }]),
    );

    expect(getTrends()).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "Skipping trend entry at index 0: buyUrl must be null or a clean absolute HTTPS URL",
    );
  });

  it("resolves a trusted trend by exact id and rejects malformed lookup ids", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([
        { id: "loafer", label: "Loafer", shoeImageUrl: "/trends/loafer.png", buyUrl: null },
      ]),
    );

    expect(getTrendById("loafer")?.label).toBe("Loafer");
    expect(getTrendById(" loafer")).toBeUndefined();
    expect(getTrendById("")).toBeUndefined();
  });

  it.each(["{}", "not json"])("returns an empty collection for invalid seed %s", (seed) => {
    mockedReadFileSync.mockReturnValue(seed);

    expect(getTrends()).toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("returns an empty collection when the seed cannot be read", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("missing");
    });

    expect(getTrends()).toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("skips invalid and duplicate entries deterministically", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([
        {
          id: "runner",
          label: "Runner",
          shoeImageUrl: "/trends/runner.png",
          buyUrl: null,
        },
        {
          id: "runner",
          label: "Duplicate",
          shoeImageUrl: "/trends/duplicate.png",
          buyUrl: null,
        },
        { id: "broken" },
      ]),
    );

    expect(getTrends()).toEqual([
      {
        id: "runner",
        label: "Runner",
        shoeImageUrl: "/trends/runner.png",
        buyUrl: null,
      },
    ]);
    expect(consoleError).toHaveBeenNthCalledWith(
      1,
      'Skipping duplicate trend entry at index 1: id "runner"',
    );
    expect(consoleError).toHaveBeenNthCalledWith(
      2,
      "Skipping trend entry at index 2: label must be a non-empty string",
    );
  });

  it.each(["https://example.com/shoe.png", "//example.com/shoe.png", " trends/shoe.png", "trends/shoe.png"])(
    "skips an unsafe image source: %s",
    (shoeImageUrl) => {
      mockedReadFileSync.mockReturnValue(
        JSON.stringify([{ id: "unsafe", label: "Unsafe", shoeImageUrl, buyUrl: null }]),
      );

      expect(getTrends()).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith(
        "Skipping trend entry at index 0: shoeImageUrl must be a clean root-relative /trends/ path",
      );
    },
  );
});

import "@testing-library/jest-dom";

// jsdom doesn't implement matchMedia. Default to "no match" (normal motion);
// tests that need reduced-motion behavior override this per-test.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

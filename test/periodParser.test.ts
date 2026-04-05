import { parsePeriods } from "../src/comparison/periodParser";

describe("parsePeriods", () => {
  const now = new Date("2024-06-01T00:00:00Z").getTime();

  it("computes two equal periods by default", () => {
    const result = parsePeriods("30d", undefined, now);
    expect(result.current.until).toBe(new Date(now).toISOString());
    expect(result.current.since).toBe(
      new Date("2024-05-02T00:00:00.000Z").toISOString(),
    );
    expect(result.previous.until).toBe(result.current.since);
    expect(result.previous.since).toBe(
      new Date("2024-04-02T00:00:00.000Z").toISOString(),
    );
  });

  it("supports a different compare duration", () => {
    const result = parsePeriods("7d", "14d", now);
    // current: May 25 - Jun 1
    expect(new Date(result.current.since).toISOString()).toBe(
      new Date("2024-05-25T00:00:00.000Z").toISOString(),
    );
    // previous: May 11 - May 25 (14 days before current start)
    expect(new Date(result.previous.until).toISOString()).toBe(
      new Date("2024-05-25T00:00:00.000Z").toISOString(),
    );
    const prevDuration =
      new Date(result.previous.until).getTime() -
      new Date(result.previous.since).getTime();
    expect(prevDuration).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("throws on invalid duration", () => {
    expect(() => parsePeriods("bad")).toThrow("Invalid duration");
  });

  it("throws on invalid compare duration", () => {
    expect(() => parsePeriods("7d", "bad")).toThrow("Invalid compare duration");
  });
});

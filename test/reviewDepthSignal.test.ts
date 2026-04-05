import { calculateReviewDepthSignal } from "../src/calculators/reviewDepthSignal";
import type { FileCategory, ScopeSpread } from "../src/models/files";

const narrowScope: ScopeSpread = {
  directories: ["docs"],
  directoryCount: 1,
  topLevelModules: ["docs"],
  topLevelModuleCount: 1,
};

const wideScope: ScopeSpread = {
  directories: ["src/api", "src/auth", "src/db", "test/api"],
  directoryCount: 4,
  topLevelModules: ["src", "test"],
  topLevelModuleCount: 2,
};

describe("calculateReviewDepthSignal", () => {
  it("returns simple for docs-only narrow scope", () => {
    const cats: Record<string, FileCategory> = { "README.md": "docs" };
    expect(calculateReviewDepthSignal(0, narrowScope, cats)).toBe("simple");
  });

  it("returns simple for config-only narrow scope", () => {
    const cats: Record<string, FileCategory> = {
      "tsconfig.json": "config",
      ".eslintrc": "config",
    };
    expect(calculateReviewDepthSignal(5, narrowScope, cats)).toBe("simple");
  });

  it("returns critical for high risk score", () => {
    const cats: Record<string, FileCategory> = { "src/app.ts": "source" };
    expect(calculateReviewDepthSignal(60, wideScope, cats)).toBe("critical");
  });

  it("returns critical when touching auth paths", () => {
    const cats: Record<string, FileCategory> = { "src/auth/login.ts": "source" };
    expect(calculateReviewDepthSignal(10, wideScope, cats)).toBe("critical");
  });

  it("returns critical for migrations", () => {
    const cats: Record<string, FileCategory> = { "db/migrations/001.sql": "migration" };
    expect(calculateReviewDepthSignal(15, narrowScope, cats)).toBe("critical");
  });

  it("returns complex for typical source changes", () => {
    const cats: Record<string, FileCategory> = {
      "src/api/handler.ts": "source",
      "src/api/validator.ts": "source",
      "test/api/handler.test.ts": "test",
    };
    expect(calculateReviewDepthSignal(20, wideScope, cats)).toBe("complex");
  });
});

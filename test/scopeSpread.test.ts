import { calculateScopeSpread } from "../src/calculators/scopeSpread";
import { makeFile } from "./fixtures/prFiles";

describe("calculateScopeSpread", () => {
  it("counts unique directories", () => {
    const files = [
      makeFile({ filename: "src/api/handler.ts" }),
      makeFile({ filename: "src/api/validator.ts" }),
      makeFile({ filename: "src/utils/helpers.ts" }),
    ];
    const result = calculateScopeSpread(files);
    expect(result.directoryCount).toBe(2);
    expect(result.directories).toContain("src/api");
    expect(result.directories).toContain("src/utils");
  });

  it("counts top-level modules", () => {
    const files = [
      makeFile({ filename: "src/api/handler.ts" }),
      makeFile({ filename: "test/api.test.ts" }),
      makeFile({ filename: "docs/guide.md" }),
    ];
    const result = calculateScopeSpread(files);
    expect(result.topLevelModuleCount).toBe(3);
    expect(result.topLevelModules).toContain("src");
    expect(result.topLevelModules).toContain("test");
    expect(result.topLevelModules).toContain("docs");
  });

  it("handles root-level files", () => {
    const files = [
      makeFile({ filename: "README.md" }),
      makeFile({ filename: "package.json" }),
    ];
    const result = calculateScopeSpread(files);
    expect(result.directoryCount).toBe(0);
    expect(result.topLevelModuleCount).toBe(2);
  });
});

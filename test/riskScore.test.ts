import { calculateRiskScore } from "../src/calculators/riskScore";
import { classifyFiles } from "../src/calculators/fileCategories";
import {
  makeSourceFile,
  makeAuthFile,
  makeMigrationFile,
  makeCiFile,
  makeDependencyFile,
  makeDocFile,
  makeFile,
} from "./fixtures/prFiles";

describe("calculateRiskScore", () => {
  it("scores zero for docs-only PRs", () => {
    const files = [makeDocFile()];
    const cats = classifyFiles(files);
    const { score } = calculateRiskScore(files, cats);
    expect(score).toBe(0);
  });

  it("scores low for source-only PRs", () => {
    const files = [makeSourceFile()];
    const cats = classifyFiles(files);
    const { score } = calculateRiskScore(files, cats);
    expect(score).toBe(0);
  });

  it("scores high for auth files", () => {
    const files = [makeAuthFile()];
    const cats = classifyFiles(files);
    const { score, factors } = calculateRiskScore(files, cats);
    expect(score).toBeGreaterThanOrEqual(20);
    expect(factors.some((f) => f.reason === "auth-path")).toBe(true);
  });

  it("scores high for multi-risk PRs", () => {
    const files = [makeAuthFile(), makeMigrationFile(), makeCiFile(), makeDependencyFile()];
    const cats = classifyFiles(files);
    const { score } = calculateRiskScore(files, cats);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("applies multiplier for 3+ risk categories", () => {
    const files = [makeAuthFile(), makeMigrationFile(), makeCiFile()];
    const cats = classifyFiles(files);
    const { score } = calculateRiskScore(files, cats);
    // Base: 20 + 15 + 10 = 45, with 1.5x = 68
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("caps at 100", () => {
    const files = [
      makeAuthFile(),
      makeMigrationFile(),
      makeCiFile(),
      makeDependencyFile(),
      makeFile({ filename: ".env.production" }),
      makeFile({ filename: "Dockerfile" }),
    ];
    const cats = classifyFiles(files);
    const { score } = calculateRiskScore(files, cats);
    expect(score).toBeLessThanOrEqual(100);
  });
});

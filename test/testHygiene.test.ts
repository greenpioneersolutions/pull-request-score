import { calculateTestHygiene } from "../src/calculators/testHygiene";
import { classifyFiles } from "../src/calculators/fileCategories";
import { makeSourceFile, makeTestFile, makeDocFile } from "./fixtures/prFiles";

describe("calculateTestHygiene", () => {
  it("computes ratio of test to source changes", () => {
    const files = [
      makeSourceFile("src/app.ts", { changes: 20 }),
      makeTestFile("test/app.test.ts", { changes: 10 }),
    ];
    const cats = classifyFiles(files);
    const result = calculateTestHygiene(files, cats);
    expect(result.ratio).toBe(0.5);
    expect(result.sourceFileChanges).toBe(20);
    expect(result.testFileChanges).toBe(10);
  });

  it("returns null ratio when no source files", () => {
    const files = [makeTestFile()];
    const cats = classifyFiles(files);
    const result = calculateTestHygiene(files, cats);
    expect(result.ratio).toBeNull();
  });

  it("identifies source files without tests", () => {
    const files = [
      makeSourceFile("src/api.ts"),
      makeSourceFile("src/handler.ts"),
      makeTestFile("test/api.test.ts"),
    ];
    const cats = classifyFiles(files);
    const result = calculateTestHygiene(files, cats);
    expect(result.sourceFilesWithoutTests).toContain("src/handler.ts");
    expect(result.sourceFilesWithoutTests).not.toContain("src/api.ts");
  });

  it("tracks added test files", () => {
    const files = [
      makeTestFile("test/new.test.ts", { status: "added" }),
    ];
    const cats = classifyFiles(files);
    const result = calculateTestHygiene(files, cats);
    expect(result.testFilesAdded).toContain("test/new.test.ts");
  });

  it("ignores non-source non-test files", () => {
    const files = [makeDocFile(), makeSourceFile("src/app.ts", { changes: 10 })];
    const cats = classifyFiles(files);
    const result = calculateTestHygiene(files, cats);
    expect(result.sourceFileChanges).toBe(10);
    expect(result.testFileChanges).toBe(0);
  });
});

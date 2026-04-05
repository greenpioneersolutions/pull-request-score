import { detectCodePatterns } from "../src/calculators/codePatterns";
import { makeFile } from "./fixtures/prFiles";

describe("detectCodePatterns", () => {
  it("detects TODO comments", () => {
    const patch = "@@ -0,0 +1 @@\n+// TODO: fix this later";
    const result = detectCodePatterns([makeFile({ patch })]);
    expect(result[0]!.type).toBe("todo");
  });

  it("detects FIXME comments", () => {
    const patch = "@@ -0,0 +1 @@\n+// FIXME: broken edge case";
    const result = detectCodePatterns([makeFile({ patch })]);
    expect(result[0]!.type).toBe("fixme");
  });

  it("detects console.log", () => {
    const patch = '@@ -0,0 +1 @@\n+console.log("debug data", obj);';
    const result = detectCodePatterns([makeFile({ patch })]);
    expect(result[0]!.type).toBe("console-log");
  });

  it("detects debugger statements", () => {
    const patch = "@@ -0,0 +1 @@\n+  debugger;";
    const result = detectCodePatterns([makeFile({ patch })]);
    expect(result[0]!.type).toBe("debug-statement");
  });

  it("detects commented-out code", () => {
    const patch = "@@ -0,0 +1 @@\n+// return oldImplementation();";
    const result = detectCodePatterns([makeFile({ patch })]);
    expect(result[0]!.type).toBe("commented-code");
  });

  it("returns empty for clean code", () => {
    const patch = "@@ -0,0 +1 @@\n+const result = compute(input);";
    const result = detectCodePatterns([makeFile({ patch })]);
    expect(result).toHaveLength(0);
  });

  it("skips files without patches", () => {
    const result = detectCodePatterns([makeFile({ patch: undefined })]);
    expect(result).toHaveLength(0);
  });

  it("marks all findings as new", () => {
    const patch = "@@ -0,0 +1 @@\n+// TODO: cleanup";
    const result = detectCodePatterns([makeFile({ patch })]);
    expect(result[0]!.isNew).toBe(true);
  });
});

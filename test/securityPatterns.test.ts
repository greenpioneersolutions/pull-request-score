import { detectSecurityPatterns } from "../src/calculators/securityPatterns";
import { makeFile } from "./fixtures/prFiles";

describe("detectSecurityPatterns", () => {
  it("detects hardcoded secrets", () => {
    const patch = '@@ -0,0 +1 @@\n+const password = "supersecret123456";';
    const result = detectSecurityPatterns([makeFile({ patch })]);
    expect(result).toHaveLength(1);
    expect(result[0]!.pattern).toBe("hardcoded-secret");
    expect(result[0]!.severity).toBe("critical");
  });

  it("detects eval usage", () => {
    const patch = "@@ -0,0 +1 @@\n+const result = eval(userInput);";
    const result = detectSecurityPatterns([makeFile({ patch })]);
    expect(result[0]!.pattern).toBe("eval-usage");
  });

  it("detects SQL concatenation", () => {
    const patch =
      "@@ -0,0 +1 @@\n+const q = `SELECT * FROM users WHERE id = ${id}`;";
    const result = detectSecurityPatterns([makeFile({ patch })]);
    expect(result[0]!.pattern).toBe("sql-concatenation");
  });

  it("detects disabled eslint", () => {
    const patch = "@@ -0,0 +1 @@\n+/* eslint-disable no-eval */";
    const result = detectSecurityPatterns([makeFile({ patch })]);
    expect(result[0]!.pattern).toBe("disabled-eslint");
  });

  it("detects dangerouslySetInnerHTML", () => {
    const patch =
      "@@ -0,0 +1 @@\n+<div dangerouslySetInnerHTML={{ __html: content }} />";
    const result = detectSecurityPatterns([makeFile({ patch })]);
    expect(result[0]!.pattern).toBe("dangerous-html");
  });

  it("returns empty for clean code", () => {
    const patch = "@@ -0,0 +1 @@\n+const x = 1 + 2;";
    const result = detectSecurityPatterns([makeFile({ patch })]);
    expect(result).toHaveLength(0);
  });

  it("skips files without patches", () => {
    const result = detectSecurityPatterns([makeFile({ patch: undefined })]);
    expect(result).toHaveLength(0);
  });

  it("includes line numbers", () => {
    const patch = "@@ -0,0 +5 @@\n+safe line\n+const secret = \"abcdefgh12345678\";";
    const result = detectSecurityPatterns([makeFile({ patch })]);
    expect(result[0]!.line).toBe(6);
  });
});

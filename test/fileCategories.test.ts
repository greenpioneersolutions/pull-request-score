import { classifyFiles } from "../src/calculators/fileCategories";
import { makeFile } from "./fixtures/prFiles";

describe("classifyFiles", () => {
  const classify = (filename: string) =>
    classifyFiles([makeFile({ filename })])[filename];

  it("classifies test files", () => {
    expect(classify("src/app.test.ts")).toBe("test");
    expect(classify("src/app.spec.js")).toBe("test");
    expect(classify("test/handler.ts")).toBe("test");
    expect(classify("__tests__/foo.ts")).toBe("test");
  });

  it("classifies docs", () => {
    expect(classify("README.md")).toBe("docs");
    expect(classify("CHANGELOG.md")).toBe("docs");
    expect(classify("docs/guide.mdx")).toBe("docs");
    expect(classify("LICENSE")).toBe("docs");
  });

  it("classifies CI files", () => {
    expect(classify(".github/workflows/ci.yml")).toBe("ci");
    expect(classify(".circleci/config.yml")).toBe("ci");
    expect(classify("Jenkinsfile")).toBe("ci");
  });

  it("classifies config files", () => {
    expect(classify("jest.config.js")).toBe("config");
    expect(classify(".eslintrc.json")).toBe("config");
    expect(classify("tsconfig.json")).toBe("config");
    expect(classify(".env.local")).toBe("config");
  });

  it("classifies dependency files", () => {
    expect(classify("package.json")).toBe("dependency");
    expect(classify("pnpm-lock.yaml")).toBe("dependency");
    expect(classify("yarn.lock")).toBe("dependency");
    expect(classify("go.sum")).toBe("dependency");
    expect(classify("requirements.txt")).toBe("dependency");
  });

  it("classifies migration files", () => {
    expect(classify("db/migrations/001_create.sql")).toBe("migration");
    expect(classify("src/migrate/run.ts")).toBe("migration");
  });

  it("classifies generated files", () => {
    expect(classify("src/generated/types.ts")).toBe("generated");
    expect(classify("bundle.min.js")).toBe("generated");
    expect(classify("dist/index.js")).toBe("generated");
  });

  it("defaults to source", () => {
    expect(classify("src/app.ts")).toBe("source");
    expect(classify("lib/utils.py")).toBe("source");
  });
});

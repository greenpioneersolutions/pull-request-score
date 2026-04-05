import type { PrFile } from "../../src/models/files";

export function makeFile(overrides: Partial<PrFile> = {}): PrFile {
  return {
    sha: "abc123",
    filename: "src/index.ts",
    status: "modified",
    additions: 10,
    deletions: 5,
    changes: 15,
    patch:
      '@@ -1,5 +1,10 @@\n+import { foo } from "./foo";\n+\n export function main() {\n-  console.log("old");\n+  const result = foo();\n+  return result;\n }',
    ...overrides,
  };
}

export function makeSourceFile(
  filename = "src/app.ts",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({ filename, ...overrides });
}

export function makeTestFile(
  filename = "test/app.test.ts",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({
    filename,
    patch: '@@ -0,0 +1,5 @@\n+import { main } from "../src/app";\n+\n+test("works", () => {\n+  expect(main()).toBeDefined();\n+});',
    ...overrides,
  });
}

export function makeConfigFile(
  filename = "tsconfig.json",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({
    filename,
    additions: 2,
    deletions: 1,
    changes: 3,
    patch: '@@ -1,3 +1,4 @@\n {\n+  "strict": true,\n   "target": "ES2022"\n }',
    ...overrides,
  });
}

export function makeDocFile(
  filename = "README.md",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({
    filename,
    additions: 3,
    deletions: 0,
    changes: 3,
    patch: "@@ -10,0 +11,3 @@\n+## New Section\n+\n+Some docs.",
    ...overrides,
  });
}

export function makeCiFile(
  filename = ".github/workflows/ci.yml",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({ filename, ...overrides });
}

export function makeMigrationFile(
  filename = "db/migrations/001_create_users.sql",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({
    filename,
    patch: "@@ -0,0 +1,5 @@\n+CREATE TABLE users (\n+  id SERIAL PRIMARY KEY,\n+  name TEXT NOT NULL\n+);",
    ...overrides,
  });
}

export function makeAuthFile(
  filename = "src/auth/login.ts",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({
    filename,
    patch: '@@ -1,3 +1,8 @@\n+import bcrypt from "bcrypt";\n+\n+export async function login(password: string) {\n+  return bcrypt.compare(password, hash);\n+}',
    ...overrides,
  });
}

export function makeDependencyFile(
  filename = "package.json",
  overrides: Partial<PrFile> = {},
): PrFile {
  return makeFile({
    filename,
    additions: 1,
    deletions: 0,
    changes: 1,
    patch: '@@ -5,0 +6 @@\n+  "new-dep": "^1.0.0"',
    ...overrides,
  });
}

/** A realistic multi-file PR fixture. */
export function makeTypicalPrFiles(): PrFile[] {
  return [
    makeSourceFile("src/api/handler.ts"),
    makeSourceFile("src/api/validator.ts"),
    makeTestFile("test/api/handler.test.ts"),
    makeConfigFile(),
    makeDocFile(),
  ];
}

/** A high-risk PR fixture. */
export function makeHighRiskPrFiles(): PrFile[] {
  return [
    makeAuthFile(),
    makeMigrationFile(),
    makeCiFile(),
    makeDependencyFile(),
    makeSourceFile("src/middleware/auth.ts"),
  ];
}

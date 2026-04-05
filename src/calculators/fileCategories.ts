import type { PrFile, FileCategory } from "../models/files.js";

const matchers: [FileCategory, (f: string) => boolean][] = [
  ["test", (f) => /\.(test|spec)\.[^/]+$/.test(f) || /(?:^|\/)(test|tests|__tests__)\//.test(f)],
  ["docs", (f) => /\.(md|mdx)$/i.test(f) || /^(LICENSE|CHANGELOG|CONTRIBUTING)/i.test(f) || /\/docs\//.test(f)],
  ["ci", (f) => /^\.(github|circleci|gitlab)\//.test(f) || /^(Jenkinsfile|\.gitlab-ci\.yml)$/i.test(f)],
  ["config", (f) => /\.config\.[^/]+$/.test(f) || /^\.[^/]+rc(\.[^/]+)?$/.test(f) || /^\.env/.test(f) || /^tsconfig/.test(f)],
  ["dependency", (f) => /^(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Gemfile(\.lock)?|requirements\.txt|go\.sum|go\.mod|Cargo\.lock|Cargo\.toml)$/.test(f.split("/").pop() ?? "")],
  ["migration", (f) => /\/(migrations?|migrate)\//.test(f)],
  ["generated", (f) => /\/(generated|__generated__)\//.test(f) || /\.generated\.[^/]+$/.test(f) || /\.min\.(js|css)$/.test(f) || /^dist\//.test(f)],
];

/**
 * Classify each file into a category based on its path and extension.
 */
export function classifyFiles(
  files: PrFile[],
): Record<string, FileCategory> {
  const result: Record<string, FileCategory> = {};
  for (const file of files) {
    let category: FileCategory = "source";
    for (const [cat, test] of matchers) {
      if (test(file.filename)) {
        category = cat;
        break;
      }
    }
    result[file.filename] = category;
  }
  return result;
}

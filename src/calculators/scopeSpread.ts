import type { PrFile, ScopeSpread } from "../models/files.js";
import path from "path";

/**
 * Measure how many distinct directories and top-level modules a PR touches.
 */
export function calculateScopeSpread(files: PrFile[]): ScopeSpread {
  const dirSet = new Set<string>();
  const moduleSet = new Set<string>();

  for (const file of files) {
    const dir = path.dirname(file.filename);
    if (dir !== ".") {
      dirSet.add(dir);
    }
    const topLevel = file.filename.split("/")[0] ?? file.filename;
    moduleSet.add(topLevel);
  }

  const directories = [...dirSet].sort();
  const topLevelModules = [...moduleSet].sort();

  return {
    directories,
    directoryCount: directories.length,
    topLevelModules,
    topLevelModuleCount: topLevelModules.length,
  };
}

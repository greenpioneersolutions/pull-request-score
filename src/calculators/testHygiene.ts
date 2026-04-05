import type { PrFile, FileCategory, TestHygiene } from "../models/files.js";

/**
 * Evaluate whether a PR includes test changes alongside source changes.
 */
export function calculateTestHygiene(
  files: PrFile[],
  categories: Record<string, FileCategory>,
): TestHygiene {
  let testFileChanges = 0;
  let sourceFileChanges = 0;
  const testFilesAdded: string[] = [];
  const sourceFiles: string[] = [];

  for (const file of files) {
    const cat = categories[file.filename] ?? "source";
    if (cat === "test") {
      testFileChanges += file.changes;
      if (file.status === "added") {
        testFilesAdded.push(file.filename);
      }
    } else if (cat === "source") {
      sourceFileChanges += file.changes;
      sourceFiles.push(file.filename);
    }
  }

  // Determine which source files lack a corresponding test change
  const testFileNames = new Set(
    files
      .filter((f) => (categories[f.filename] ?? "source") === "test")
      .map((f) => f.filename.toLowerCase()),
  );

  const sourceFilesWithoutTests = sourceFiles.filter((sf) => {
    const base = sf
      .replace(/\.[^.]+$/, "")
      .toLowerCase();
    return ![...testFileNames].some(
      (tf) => tf.includes(base.split("/").pop() ?? ""),
    );
  });

  return {
    testFileChanges,
    sourceFileChanges,
    ratio: sourceFileChanges > 0 ? testFileChanges / sourceFileChanges : null,
    testFilesAdded,
    sourceFilesWithoutTests,
  };
}

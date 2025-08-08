import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

describe("playground fetch example", () => {
  it("runs and returns metrics", async () => {
    const script = path.resolve(__dirname, "scripts/run-fetch-example.mjs");
    const { stdout } = await execFileAsync("node", [script]);
    const metrics = JSON.parse(stdout);
    expect(metrics.mergeRate).toBe(0);
  });
});

import https from "https";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const key = fs.readFileSync(path.resolve(__dirname, "fixtures/test-key.pem"));
const cert = fs.readFileSync(path.resolve(__dirname, "fixtures/test-cert.pem"));

function startServer() {
  return new Promise<https.Server>((resolve) => {
    const server = https
      .createServer({ key, cert }, (req, res) => {
        let body = "";
        req.on("data", (d) => (body += d));
        req.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              data: {
                repository: {
                  pullRequests: {
                    pageInfo: { hasNextPage: false, endCursor: null },
                    nodes: [],
                  },
                },
              },
            }),
          );
        });
      })
      .listen(0, () => resolve(server));
  });
}

describe("self-signed certificates", () => {
  let server: https.Server;
  let url: string;
  beforeEach(async () => {
    server = await startServer();
    const { port } = server.address() as any;
    url = `https://localhost:${port}`;
  });
  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("fails by default", async () => {
    await expect(
      execFileAsync("node", [
        path.resolve(__dirname, "../playground/fetch-metrics.mjs"),
        "owner/repo",
        "--base-url",
        url,
      ], {
        env: { ...process.env, GH_TOKEN: "token" },
      }),
    ).rejects.toThrow();
  });

  it("succeeds when insecure flag is used", async () => {
    const { stdout } = await execFileAsync(
      "node",
      [
        path.resolve(__dirname, "../playground/fetch-metrics.mjs"),
        "owner/repo",
        "--base-url",
        url,
        "--insecure",
      ],
      { env: { ...process.env, GH_TOKEN: "token" } },
    );
    const metrics = JSON.parse(stdout);
    expect(metrics.mergeRate).toBe(0);
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { fileStore } from "../src/cache/fileStore";

describe("fileStore", () => {
  let tmpDir: string;
  const origHome = process.env["HOME"];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cache-"));
    process.env["HOME"] = tmpDir;
  });

  afterEach(() => {
    process.env["HOME"] = origHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("stores and retrieves values", () => {
    const store = fileStore();
    store.set("a", { v: 1 }, 10);
    expect(store.get("a")).toEqual({ v: 1 });
  });

  it("expires values", async () => {
    const store = fileStore();
    store.set("b", 2, 0.001); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(store.get("b")).toBeUndefined();
  });

  it("returns undefined for missing keys", () => {
    const store = fileStore();
    expect(store.get("nonexistent")).toBeUndefined();
  });

  it("overwrites existing values", () => {
    const store = fileStore();
    store.set("k", 1);
    store.set("k", 2);
    expect(store.get("k")).toBe(2);
  });
});

import { register, getAll } from "../src/plugins/registry";

describe("metric plugin registry", () => {
  it("registers custom plugins", () => {
    const before = getAll().length;
    const plugin = {
      slug: "mock",
      description: "Mock metric",
      calculate: () => 1,
    };
    register(plugin);
    const list = getAll();
    expect(list.length).toBe(before + 1);
    expect(list).toContain(plugin);
  });
});

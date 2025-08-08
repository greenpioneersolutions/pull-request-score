import { parseTicket, hasTicket } from "../src/utils/parseTicket";

describe("parseTicket", () => {
  it("parses ticket prefix and number", () => {
    expect(parseTicket("BOSS-1252 fix bug")).toEqual({ team: "BOSS", number: 1252 });
  });

  it("returns null when no ticket", () => {
    expect(parseTicket("regular title")).toBeNull();
  });

  it("checks presence of a ticket", () => {
    expect(hasTicket("TEAM-42 add feature")).toBe(true);
    expect(hasTicket("no id here")).toBe(false);
  });
});

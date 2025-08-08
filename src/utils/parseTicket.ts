export interface TicketInfo {
  team: string;
  number: number;
}

const ticketRe = /^([A-Z]+)-(\d+)/i;

/**
 * Parse a ticket identifier from a pull request title.
 * Matches patterns like `TEAM-1234 Something`.
 */
export function parseTicket(title: string): TicketInfo | null {
  const match = ticketRe.exec(title);
  if (!match) return null;
  const [, team, num] = match;
  if (!team || !num) return null;
  return { team: team.toUpperCase(), number: Number(num) };
}

/**
 * Check whether a title contains a ticket identifier.
 */
export function hasTicket(title: string): boolean {
  return ticketRe.test(title);
}

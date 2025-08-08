# Ticket IDs

The library can parse ticket identifiers from pull request titles. Use `parseTicket` to extract the team prefix and ticket number or `hasTicket` to quickly check for a ticket.

```ts
import { parseTicket, hasTicket } from 'pull-request-score'

parseTicket('BOSS-1252 add search')
// => { team: 'BOSS', number: 1252 }

hasTicket('docs update')
// => false
```

When collecting pull requests the `ticket` field will be populated automatically if the title includes an ID.

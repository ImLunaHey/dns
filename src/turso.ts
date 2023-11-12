import { createClient } from '@libsql/client';

export const turso = createClient({
  url: 'file:dbs/dns-ingest.db',
  syncUrl: 'libsql://dns-ingest-gay-fish.turso.io',
  authToken: process.env.TURSO_TOKEN!,
});

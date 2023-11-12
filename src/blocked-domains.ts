import '@total-typescript/ts-reset';
import { turso } from './turso';
import { randomUUID } from 'crypto';

const getList = async (url: string) =>
  fetch(url).then(async (response) => {
    const text = await response.text();
    return text
      .split('\n')
      .map((line) => {
        if (line.startsWith('#')) return null;
        if (line.trim() === '') return null;
        const items = line.split(' ');
        if (items.length === 1) return items[0];
        return items[1];
      })
      .filter(Boolean);
  });

setInterval(async () => {
  const lists = await turso
    .execute({
      sql: 'SELECT url, last_updated FROM remote_lists',
      args: [],
    })
    .then((result) => result.rows as unknown as { url: string; last_updated: number }[]);

  console.info('Checking %d lists for updates', lists.length);
  for (const { url, last_updated } of lists) {
    // Only update once per day
    if (Date.now() - last_updated < 1000 * 60 * 60 * 24) {
      console.info(
        'Skipping %s, last updated %d days ago',
        url,
        Math.floor((Date.now() - last_updated) / 1000 / 60 / 60 / 24),
      );
      continue;
    }

    // Update last updated time
    await turso.execute({
      sql: 'UPDATE remote_lists SET last_updated = ? WHERE url = ?',
      args: [Date.now(), url],
    });

    // Update the list
    try {
      const domains = await getList(url);
      console.info('Loaded %d domains from %s', domains.length, url);
      const queries = domains.map((domain) => ({
        // Check if the domain already exists, if not insert it
        sql: 'INSERT INTO blocked_domains (id, hostname)',
        args: [randomUUID(), domain],
      }));

      // In batches of 500 queries
      for (let i = 0; i < queries.length; i += 500) {
        await turso.batch(queries.slice(i, i + 500), 'write');
      }
    } catch (error) {
      console.error(error);
      console.error('Failed to load domains from %s', url);
    }
  }
}, 5_000);

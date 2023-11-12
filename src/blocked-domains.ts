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
      for (const domain of domains) {
        // Check if the domain is already in the database
        const exists = await turso
          .execute({
            sql: 'SELECT EXISTS(SELECT 1 FROM blocked_domains WHERE hostname = ?)',
            args: [domain],
          })
          .then((result) => Object.values(result.rows[0])[0] === 1)
          .catch((error) => {
            console.error('Failed to check if domain exists in DB', error);
            return false;
          });
        if (exists) continue;
        await turso.execute({
          sql: 'INSERT INTO blocked_domains (id, hostname) VALUES (?, ?)',
          args: [randomUUID(), domain],
        });
      }
    } catch (error) {
      console.error('Failed to load domains from %s', url);
    }
  }
}, 5_000);

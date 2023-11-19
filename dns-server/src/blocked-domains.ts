import '@total-typescript/ts-reset';
import { randomUUID } from 'crypto';
import { database } from './database';
import { readFileSync } from 'fs';

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

const updateLists = () =>
  setTimeout(async () => {
    const lists = await database.execute('SELECT url, last_updated FROM remote_lists').then((results) => {
      return (
        results.rows as {
          url: string;
          last_updated: number;
        }[]
      ).map((row) => {
        return {
          url: row.url,
          last_updated: row.last_updated * 1000,
        };
      });
    });

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
      await database.execute('UPDATE remote_lists SET last_updated = ? WHERE url = ?', [Date.now() / 1000, url]);

      // Update the list
      try {
        const domains = await getList(url);
        console.info('Loaded %d domains from %s', domains.length, url);

        // Update the database
        // Chunks for 20 domains at a time
        for (let count = 0; count < domains.length; count += 1000) {
          if (count % 1000 === 0) console.info('Updated %d/%d domains from %s', count, domains.length, url);
          const chunk = domains.slice(count, count + 1000);
          await database.execute(
            `INSERT IGNORE INTO blocked_domains (id, hostname) VALUES ${chunk.map(() => '(?, ?)').join(', ')}`,
            chunk.flatMap((domain) => [randomUUID(), domain]),
          );
        }

        console.log('Updated %d domains from %s', domains.length, url);
      } catch (error) {
        console.error(error);
        console.error('Failed to load domains from %s', url);
      }
    }
    updateLists();
  }, 5_000);

// Run the migrations
for (const migration of readFileSync('./src/migrations.sql', 'utf-8').split(';').filter(Boolean)) {
  const migrationName = migration.split('\n').filter(Boolean)[0].replace('--', '').trim();
  console.info('Running migration "%s"', migrationName);
  await database.execute(migration);
}

// Udate the lists every 5s
updateLists();

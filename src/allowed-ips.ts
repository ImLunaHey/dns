import { randomUUID } from 'crypto';
import { database } from './database';
import { CachedSet } from './cached-set';

const allowedIps = new CachedSet<string>(100);

export const isClientIpAllowed = async (ip: string) => {
  if (allowedIps.has(ip)) return true;
  const result = await database.execute('SELECT 1 as allowed FROM devices WHERE ip_address = ?', [ip]);
  const row = result.rows[0] as
    | {
        allowed: `${number}`;
      }
    | undefined;
  const allowed = row?.allowed === '1';
  if (allowed) allowedIps.add(ip);
  return allowed;
};

export const addClientIp = async (ip: string) => {
  const result = await database.execute('INSERT INTO devices (id, ip_address) VALUES (?, ?)', [randomUUID(), ip]);
  const success = result.rowsAffected === 1;

  // Cache the IP address
  if (success) allowedIps.add(ip);

  if (success) console.info('Added %s to allowed ips', ip);
  else console.warn('Failed to add %s to allowed ips', ip);
};

import { turso } from './turso';

export const isClientIpAllowed = async (ip: string) => {
  const result = await turso.execute({
    sql: 'SELECT 1 FROM devices WHERE ip = $1',
    args: [ip],
  });

  return result.rows.length >= 1;
};

export const addClientIp = async (ip: string) => {
  const result = await turso.execute({
    sql: 'INSERT INTO devices (ip) VALUES ($1)',
    args: [ip],
  });

  const success = result.rows.length >= 1;

  if (success) console.info('Added %s to allowed ips', ip);
  else console.warn('Failed to add %s to allowed ips', ip);
};

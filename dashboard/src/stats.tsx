import { axiom } from './axiom';
import { createCache } from './cache';
import { database } from './database';

const REFRESH_INTERVAL = 1000 * 60 * 5; // 5 minutes

const getTotalAllowedCount = createCache(async () => {
  const result = await axiom.query('dns | where status == "allowed" | count');
  return result.buckets.totals?.[0].aggregations?.[0].value as number;
}, REFRESH_INTERVAL);

const getTotalBlockedCount = createCache(async () => {
  const result = await axiom.query('dns | where status != "allowed" | count');
  return result.buckets.totals?.[0].aggregations?.[0].value as number;
}, REFRESH_INTERVAL);

const getTotalDeviceCount = createCache(async () => {
  const result = await database.execute('SELECT COUNT(*) as count FROM devices');
  return (result.rows[0] as { count: number }).count;
}, REFRESH_INTERVAL);

export const Stats = async () => {
  const totalDeviceCount = await getTotalDeviceCount();
  const totalAllowedCount = await getTotalAllowedCount();
  const totalBlockedCount = await getTotalBlockedCount();
  return (
    <div className="text-center justify-center items-center flex flex-col h-full w-full absolute top-0 left-0 z-10 pointer-events-none">
      <div className="w-[250px] bg-black border p-2">
        {/* Devices */}
        <div className="text-sm p-1 text-white mb-2 w-fit">Devices: {totalDeviceCount?.toLocaleString()}</div>
        {/* Blocked queries */}
        <div className="text-sm p-1 text-white mb-2 w-fit">Blocked: {totalBlockedCount?.toLocaleString()}</div>
        {/* Allowed queries */}
        <div className="text-sm p-1 text-white mb-2 w-fit">Allowed: {totalAllowedCount?.toLocaleString()}</div>
        {/* IP address of the DNS server */}
        <div className="text-sm p-1 text-white mb-2 w-fit">IP: 45.77.183.140</div>
      </div>
    </div>
  );
};

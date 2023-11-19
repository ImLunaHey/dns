import { axiom } from './axiom';
import { createCache } from './cache';
import { database } from './database';

const REFRESH_INTERVAL = 1000 * 60 * 5; // 5 minutes

const getTotalQueryCount = createCache(async () => {
  const result = await axiom.query('dns | count');
  return result.buckets.totals?.[0].aggregations?.[0].value as number;
}, REFRESH_INTERVAL);

const getTotalDeviceCount = createCache(async () => {
  const result = await database.execute('SELECT COUNT(*) as count FROM devices');
  return (result.rows[0] as { count: number }).count;
}, REFRESH_INTERVAL);

export const Stats = async () => {
  const totalQueryCount = await getTotalQueryCount();
  const totalDeviceCount = await getTotalDeviceCount();
  return (
    <div className="text-center justify-center items-center flex flex-col h-full w-full absolute top-0 left-0 z-10 pointer-events-none">
      <div className="relative z-20 w-[250px]">
        {totalDeviceCount} devices have sent {totalQueryCount?.toLocaleString()} queries
      </div>
      <div className="text-sm p-1 text-white border mt-2 w-fit">IP: 45.77.183.140</div>
    </div>
  );
};

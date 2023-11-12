import { turso } from './turso';

const update = async (): Promise<void> => {
  // Synchronize the embedded replica with the remote database
  await turso.sync();
  console.log('synced');
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  return update();
};

void update();

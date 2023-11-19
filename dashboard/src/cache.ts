export const createCache = <T, R>(func: (...args: T[]) => Promise<R>, refreshInterval: number = 0) => {
  let lastUpdate: number;
  let result: R | null;

  return async (...args: T[]) => {
    const canUpdate = !lastUpdate || Date.now() - lastUpdate > refreshInterval;
    if (!result || canUpdate) {
      result = await func(...args).catch(() => null);
      lastUpdate = Date.now();
    }

    return result;
  };
};

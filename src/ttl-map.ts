export class TTLMap<K, V> extends Map<K, { value: V; delete_at: number; timeout: NodeJS.Timeout }> {
  constructor() {
    super();
  }

  get(key: K) {
    const entry = super.get(key);
    if (!entry) return undefined;
    if (entry.delete_at < Date.now()) {
      this.delete(key);
      return undefined;
    }

    return entry;
  }

  add(key: K, value: V, ttl: number) {
    const timeout = setTimeout(() => {
      this.delete(key);
    }, ttl);
    super.set(key, { value, delete_at: Date.now() + ttl, timeout });
    return this;
  }

  delete(key: K) {
    const entry = super.get(key);
    if (!entry) return false;
    clearTimeout(entry.timeout);
    return super.delete(key);
  }
}

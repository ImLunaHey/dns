// Cache the last n items
export class CachedSet<T> extends Set<T> {
  constructor(private readonly max: number) {
    super();
  }

  add(value: T) {
    if (this.size >= this.max) {
      const first = this.values().next().value;
      this.delete(first);
    }
    return super.add(value);
  }
}

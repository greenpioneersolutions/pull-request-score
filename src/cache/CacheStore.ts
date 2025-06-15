export interface CacheStore {
  get<T = any>(key: string): T | undefined;
  set<T = any>(key: string, value: T, ttlSec?: number): void;
}

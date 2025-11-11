/**
 * SessionStorage provides isolated key-value storage for each MCP connection.
 * This ensures that multiple users connecting to the same server cannot access
 * each other's account data, keys, or configuration.
 */
export class SessionStorage {
  private storage: Map<string, string>;
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.storage = new Map();
  }

  /**
   * Get a value from session storage
   */
  get(key: string): string | undefined {
    return this.storage.get(key);
  }

  /**
   * Set a value in session storage
   */
  set(key: string, value: string): void {
    this.storage.set(key, value);
  }

  /**
   * Delete a value from session storage
   */
  delete(key: string): boolean {
    return this.storage.delete(key);
  }

  /**
   * Check if a key exists in session storage
   */
  has(key: string): boolean {
    return this.storage.has(key);
  }

  /**
   * Clear all data from session storage
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get all keys in session storage
   */
  keys(): IterableIterator<string> {
    return this.storage.keys();
  }

  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the number of items in storage
   */
  size(): number {
    return this.storage.size;
  }
}

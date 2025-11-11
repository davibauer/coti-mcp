import { SessionStorage } from './SessionStorage.js';
import { randomUUID } from 'crypto';

/**
 * SessionManager manages the lifecycle of all active MCP connections.
 * Each connection gets a unique session with isolated storage.
 */
export class SessionManager {
  private sessions: Map<string, SessionStorage>;
  private connectionToSession: Map<string, string>;

  constructor() {
    this.sessions = new Map();
    this.connectionToSession = new Map();
  }

  /**
   * Create a new session for a connection
   * @param sessionId Optional session ID to use (e.g., from MCP transport). If not provided, generates a new UUID.
   * @param connectionId Optional connection identifier for additional mapping
   * @returns The session ID
   */
  createSession(sessionId?: string, connectionId?: string): string {
    const actualSessionId = sessionId || randomUUID();
    const session = new SessionStorage(actualSessionId);
    this.sessions.set(actualSessionId, session);

    if (connectionId) {
      this.connectionToSession.set(connectionId, actualSessionId);
    }

    console.error(`[SessionManager] Created session ${actualSessionId}${connectionId ? ` for connection ${connectionId}` : ''}`);
    return actualSessionId;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SessionStorage | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get a session by connection ID
   */
  getSessionByConnection(connectionId: string): SessionStorage | undefined {
    const sessionId = this.connectionToSession.get(connectionId);
    if (!sessionId) return undefined;
    return this.sessions.get(sessionId);
  }

  /**
   * Destroy a session and clean up its resources
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Clear all data from session
    session.clear();

    // Remove session
    this.sessions.delete(sessionId);

    // Remove connection mapping if exists
    for (const [connId, sessId] of this.connectionToSession.entries()) {
      if (sessId === sessionId) {
        this.connectionToSession.delete(connId);
      }
    }

    console.error(`[SessionManager] Destroyed session ${sessionId}`);
    return true;
  }

  /**
   * Destroy a session by connection ID
   */
  destroySessionByConnection(connectionId: string): boolean {
    const sessionId = this.connectionToSession.get(connectionId);
    if (!sessionId) {
      return false;
    }
    return this.destroySession(sessionId);
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get the number of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (use with caution)
   */
  clearAllSessions(): void {
    for (const sessionId of this.sessions.keys()) {
      this.destroySession(sessionId);
    }
    console.error('[SessionManager] Cleared all sessions');
  }
}

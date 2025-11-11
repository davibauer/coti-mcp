import { SessionStorage } from '../session/SessionStorage.js';

/**
 * Session context passed to all tool handlers
 */
export interface SessionContext {
  storage: SessionStorage;
  sessionId: string;
}

/**
 * Account keys stored in session
 */
export interface SessionAccountKeys {
  publicKey: string;
  privateKey: string;
  aesKey: string;
}

/**
 * Session storage keys used throughout the application
 */
export const SessionKeys = {
  PUBLIC_KEYS: 'COTI_MCP_PUBLIC_KEY',
  PRIVATE_KEYS: 'COTI_MCP_PRIVATE_KEY',
  AES_KEYS: 'COTI_MCP_AES_KEY',
  CURRENT_PUBLIC_KEY: 'COTI_MCP_CURRENT_PUBLIC_KEY',
  NETWORK: 'COTI_MCP_NETWORK',
} as const;

/**
 * Helper type for session storage key names
 */
export type SessionKeyName = typeof SessionKeys[keyof typeof SessionKeys];

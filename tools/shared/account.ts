import { CotiNetwork } from "@coti-io/coti-ethers";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export interface AccountKeys {
    privateKey: string;
    aesKey: string;
}

/**
 * Gets the account keys from session storage
 * @param session The session context
 * @param publicAddress The public address of the account
 * @returns The private key and AES key for the account
 */
export function getAccountKeys(session: SessionContext, publicAddress?: string): AccountKeys {
    const publicKeys = (session.storage.get(SessionKeys.PUBLIC_KEYS) || '').split(',').filter(Boolean);
    const privateKeys = (session.storage.get(SessionKeys.PRIVATE_KEYS) || '').split(',').filter(Boolean);
    const aesKeys = (session.storage.get(SessionKeys.AES_KEYS) || '').split(',').filter(Boolean);

    const address = publicAddress || publicKeys[0];

    if (!address) {
        throw new Error('No account address provided and no default account set');
    }

    const addressIndex = publicKeys.findIndex(key =>
        key.toLowerCase() === address.toLowerCase());

    if (addressIndex === -1 || !privateKeys[addressIndex] || !aesKeys[addressIndex]) {
        throw new Error(`No keys found for account: ${address}`);
    }

    return {
        privateKey: privateKeys[addressIndex],
        aesKey: aesKeys[addressIndex]
    };
}


/**
 * Gets the current account keys from session storage
 * @param session The session context
 * @returns The private key and AES key for the current account
 */
export function getCurrentAccountKeys(session: SessionContext): AccountKeys {
    const currentPublicKey = session.storage.get(SessionKeys.CURRENT_PUBLIC_KEY);
    return getAccountKeys(session, currentPublicKey);
}

/**
 * Masks a sensitive string by showing only the first 4 and last 4 characters
 * @param str The string to mask
 * @returns The masked string
 */
export function maskSensitiveString(str: string): string {
    if (!str || str.length <= 8) {
        return "****";
    }
    return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
}

/**
 * Gets the network from session storage
 * @param session The session context
 * @returns The COTI network (testnet or mainnet)
 */
export function getNetwork(session: SessionContext): CotiNetwork {
    const network = session.storage.get(SessionKeys.NETWORK)?.toLowerCase();

    if (network === 'mainnet') {
        return CotiNetwork.Mainnet;
    }

    return CotiNetwork.Testnet;
}
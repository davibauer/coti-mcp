import { CotiNetwork } from "@coti-io/coti-ethers";

export interface AccountKeys {
    privateKey: string;
    aesKey: string;
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
 * Converts network string to CotiNetwork enum
 * @param network The network string ('testnet' or 'mainnet')
 * @returns The COTI network enum value
 */
export function getNetwork(network: 'testnet' | 'mainnet'): CotiNetwork {
    if (network === 'mainnet') {
        return CotiNetwork.Mainnet;
    }

    return CotiNetwork.Testnet;
}
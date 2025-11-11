import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "@coti-io/coti-ethers";
import { SessionContext, SessionKeys } from "../../src/types/session.js";
import { z } from "zod";

export const IMPORT_ACCOUNT_FROM_PRIVATE_KEY: ToolAnnotations = {
    title: "Import Account From Private Key",
    name: "import_account_from_private_key",
    description: "Import a COTI account using only a private key. The public key will be derived automatically, and the AES key placeholder will be set (fund the account to generate a real AES key).",
    inputSchema: {
        private_key: z.string().describe("The private key of the account to import (with or without 0x prefix)."),
        set_as_default: z.boolean().optional().default(false).describe("Optional, whether to set this account as the default account. Default is false."),
    }
};

/**
 * Validates the arguments for importing an account from private key
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isImportAccountFromPrivateKeyArgs(args: unknown): args is {
    private_key: string;
    set_as_default?: boolean;
} {
    if (typeof args !== "object" || args === null) {
        return false;
    }

    const { private_key, set_as_default } = args as Record<string, unknown>;

    if (typeof private_key !== "string" || private_key.trim() === "") {
        return false;
    }

    if (set_as_default !== undefined && typeof set_as_default !== "boolean") {
        return false;
    }

    return true;
}

/**
 * Imports a COTI account from a private key
 * @param session The session context
 * @param private_key The private key to import
 * @param set_as_default Whether to set as default account
 * @returns Account details and formatted text
 */
export async function performImportAccountFromPrivateKey(
    session: SessionContext,
    private_key: string,
    set_as_default: boolean = false
): Promise<{
    address: string;
    privateKey: string;
    aesKey: string;
    setAsDefault: boolean;
    formattedText: string;
}> {
    try {
        // Normalize private key (add 0x prefix if missing)
        let normalizedPrivateKey = private_key.trim();
        if (!normalizedPrivateKey.startsWith('0x')) {
            normalizedPrivateKey = '0x' + normalizedPrivateKey;
        }

        // Validate and derive public key from private key
        let address: string;
        try {
            address = ethers.computeAddress(normalizedPrivateKey);
        } catch (error) {
            throw new Error(`Invalid private key format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Check if account already exists
        const publicKeys = (session.storage.get(SessionKeys.PUBLIC_KEYS) || '').split(',').filter(Boolean);
        const existingIndex = publicKeys.findIndex(key => key.toLowerCase() === address.toLowerCase());

        if (existingIndex !== -1) {
            throw new Error(`Account ${address} is already imported in this session`);
        }

        // Set AES key placeholder (requires funding to generate real key)
        const aesKey = "Fund this account to generate an AES key. Go to https://discord.com/invite/Z4r8D6ez49";

        // Add to session storage
        const privateKeys = (session.storage.get(SessionKeys.PRIVATE_KEYS) || '').split(',').filter(Boolean);
        const aesKeys = (session.storage.get(SessionKeys.AES_KEYS) || '').split(',').filter(Boolean);

        publicKeys.push(address);
        privateKeys.push(normalizedPrivateKey);
        aesKeys.push(aesKey);

        session.storage.set(SessionKeys.PUBLIC_KEYS, publicKeys.join(','));
        session.storage.set(SessionKeys.PRIVATE_KEYS, privateKeys.join(','));
        session.storage.set(SessionKeys.AES_KEYS, aesKeys.join(','));

        // Set as default if requested or if this is the first account
        if (set_as_default || publicKeys.length === 1) {
            session.storage.set(SessionKeys.CURRENT_PUBLIC_KEY, address);
        }

        const formattedText = `Account imported successfully!\n\n` +
            `Address: ${address}\n\n` +
            `Private Key: ${normalizedPrivateKey}\n\n` +
            `AES Key: ${aesKey}\n\n` +
            `Total Accounts in Session: ${publicKeys.length}\n\n` +
            `${set_as_default || publicKeys.length === 1 ? 'Set as default account.' : 'Not set as default account.'}\n\n` +
            `Note: To generate the actual AES key, fund this account and use the 'generate_aes_key' tool.`;

        return {
            address,
            privateKey: normalizedPrivateKey,
            aesKey,
            setAsDefault: set_as_default || publicKeys.length === 1,
            formattedText
        };
    } catch (error) {
        console.error('Error importing account from private key:', error);
        throw new Error(`Failed to import account: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the import_account_from_private_key tool
 * @param session The session context
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function importAccountFromPrivateKeyHandler(session: SessionContext, args: any): Promise<any> {
    if (!isImportAccountFromPrivateKeyArgs(args)) {
        throw new Error("Invalid arguments for import_account_from_private_key");
    }

    const { private_key, set_as_default } = args;

    const results = await performImportAccountFromPrivateKey(session, private_key, set_as_default || false);

    return {
        structuredContent: {
            address: results.address,
            privateKey: results.privateKey,
            aesKey: results.aesKey,
            setAsDefault: results.setAsDefault
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

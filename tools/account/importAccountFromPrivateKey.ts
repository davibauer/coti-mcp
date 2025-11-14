import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "@coti-io/coti-ethers";
import { z } from "zod";

export const IMPORT_ACCOUNT_FROM_PRIVATE_KEY: ToolAnnotations = {
    title: "Import Account From Private Key",
    name: "import_account_from_private_key",
    description: "Import a COTI account using only a private key. The public key will be derived automatically, and the AES key placeholder will be set (fund the account to generate a real AES key).",
    inputSchema: {
        private_key: z.string().describe("The private key of the account to import (with or without 0x prefix)."),
    }
};

/**
 * Validates the arguments for importing an account from private key
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isImportAccountFromPrivateKeyArgs(args: unknown): args is {
    private_key: string;
} {
    if (typeof args !== "object" || args === null) {
        return false;
    }

    const { private_key } = args as Record<string, unknown>;

    if (typeof private_key !== "string" || private_key.trim() === "") {
        return false;
    }

    return true;
}

/**
 * Imports a COTI account from a private key
 * @param session The session context
 * @param private_key The private key to import
 * @returns Account details and formatted text
 */
export async function performImportAccountFromPrivateKey(
    private_key: string
): Promise<{
    address: string;
    privateKey: string;
    aesKey: string;
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

        // Set AES key placeholder (requires funding to generate real key)
        const aesKey = "Fund this account to generate an AES key. Go to https://discord.com/invite/Z4r8D6ez49";

        const formattedText = `Account imported successfully!\n\n` +
            `Address: ${address}\n\n` +
            `Private Key: ${normalizedPrivateKey}\n\n` +
            `AES Key: ${aesKey}\n\n` +
            `Note: To generate the actual AES key, fund this account and use the 'generate_aes_key' tool.`;

        return {
            address,
            privateKey: normalizedPrivateKey,
            aesKey,
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
export async function importAccountFromPrivateKeyHandler(args: any): Promise<any> {
    if (!isImportAccountFromPrivateKeyArgs(args)) {
        throw new Error("Invalid arguments for import_account_from_private_key");
    }

    const { private_key } = args;

    const results = await performImportAccountFromPrivateKey(private_key);

    return {
        structuredContent: {
            address: results.address,
            privateKey: results.privateKey,
            aesKey: results.aesKey,
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

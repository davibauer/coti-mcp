import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { getAccountKeys, getNetwork } from "../shared/account.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const GENERATE_AES_KEY: ToolAnnotations = {
    title: "Generate AES Key",
    name: "generate_aes_key",
    description: "Generate a new AES key for the current account. Returns the AES key.",
    inputSchema: {
        account_address: z.string().describe("The address of the account to generate the AES key for."),
    }
};

/**
 * Validates the arguments for generating an AES key
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isGenerateAesKeyArgs(args: unknown): args is { account_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        typeof (args as { account_address: string }).account_address === "string"
    );
}

/**
 * Generates a new AES key for the current account.
 * @param account_address The address of the account to generate the AES key for.
 * @returns An object with the generated AES key and formatted text.
 */
export async function performGenerateAesKey(session: SessionContext, account_address: string): Promise<{
    aesKey: string,
    address: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getAccountKeys(session, account_address);
        const provider = getDefaultProvider(getNetwork(session));
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);

        await wallet.generateOrRecoverAes();

        const aesKey = wallet.getUserOnboardInfo()?.aesKey;

        if (aesKey !== null && typeof aesKey !== 'string') {
            throw new Error('AES key is not a string');
        }

        if (!aesKey) {
            throw new Error('Failed to generate AES key');
        }

        // set the aes key for the account
        const publicKeys = (session.storage.get(SessionKeys.PUBLIC_KEYS) || '').split(',').filter(Boolean);
        const privateKeys = (session.storage.get(SessionKeys.PRIVATE_KEYS) || '').split(',').filter(Boolean);
        const aesKeys = (session.storage.get(SessionKeys.AES_KEYS) || '').split(',').filter(Boolean);

        const addressIndex = publicKeys.findIndex(key => key.toLowerCase() === account_address.toLowerCase());

        if (addressIndex === -1 || !privateKeys[addressIndex] || !aesKeys[addressIndex]) {
            throw new Error(`No keys found for account: ${account_address}`);
        }

        aesKeys[addressIndex] = aesKey;

        session.storage.set(SessionKeys.AES_KEYS, aesKeys.join(','));

        const formattedText = "AES key: " + aesKey + "\n\n" +
               "Address: " + wallet.address;
        
        return {
            aesKey,
            address: wallet.address,
            formattedText
        };
    } catch (error) {
        console.error('Error generating AES key:', error);
        throw new Error(`Failed to generate AES key: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the generateAesKey tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function generateAesKeyHandler(session: SessionContext, args: any): Promise<any> {
    if (!isGenerateAesKeyArgs(args)) {
        throw new Error("Invalid arguments for generate_aes_key");
    }
    const { account_address } = args;

    const results = await performGenerateAesKey(session, account_address);
    return {
        structuredContent: {
            aesKey: results.aesKey,
            address: results.address
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, CotiNetwork, Wallet } from "@coti-io/coti-ethers";
import { getAccountKeys } from "../shared/account.js";

export const GENERATE_AES_KEY: Tool = {
    name: "generate_aes_key",
    description: "Generate a new AES key for the current account. Returns the AES key.",
    inputSchema: {
        type: "object",
        properties: {
            account_address: {
                type: "string",
                description: "The address of the account to generate the AES key for."
            }
        }
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
 * @returns The generated AES key.
 */
export async function performGenerateAesKey(account_address: string): Promise<string> {
    try {
        const currentAccountKeys = getAccountKeys(account_address);
        const provider = getDefaultProvider(CotiNetwork.Testnet);
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
        const publicKeys = (process.env.COTI_MCP_PUBLIC_KEY || '').split(',').filter(Boolean);
        const privateKeys = (process.env.COTI_MCP_PRIVATE_KEY || '').split(',').filter(Boolean);
        const aesKeys = (process.env.COTI_MCP_AES_KEY || '').split(',').filter(Boolean);

        const addressIndex = publicKeys.findIndex(key => key.toLowerCase() === account_address.toLowerCase());

        if (addressIndex === -1 || !privateKeys[addressIndex] || !aesKeys[addressIndex]) {
            throw new Error(`No keys found for account: ${account_address}`);
        }

        aesKeys[addressIndex] = aesKey;

        process.env.COTI_MCP_AES_KEY = aesKeys.join(',');

        return "AES key: " + aesKey + "\n\n" +
               "Address: " + wallet.address;
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
export async function generateAesKeyHandler(args: Record<string, unknown> | undefined) {
    if (!isGenerateAesKeyArgs(args)) {
        throw new Error("Invalid arguments for generate_aes_key");
    }
    const { account_address } = args;

    const results = await performGenerateAesKey(account_address);
    return {
        content: [{ type: "text", text: results }],
        isError: false,
    };
}

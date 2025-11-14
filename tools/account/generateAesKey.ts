import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { getNetwork } from "../shared/account.js";
import { z } from "zod";

export const GENERATE_AES_KEY: ToolAnnotations = {
    title: "Generate AES Key",
    name: "generate_aes_key",
    description: "Generate or recover an AES key for a COTI account. Requires the account to be funded. The AI assistant should track the returned AES key for use in private transactions.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
    }
};

/**
 * Validates the arguments for generating an AES key
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isGenerateAesKeyArgs(args: unknown): args is { private_key: string, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as { private_key: string }).private_key === "string"
    );
}

/**
 * Generates or recovers an AES key for a COTI account.
 * @param private_key The private key of the account
 * @param network Required network parameter: 'testnet' or 'mainnet'
 * @returns An object with the generated AES key and formatted text
 */
export async function performGenerateAesKey(
    private_key: string,
    network: 'testnet' | 'mainnet'
): Promise<{
    aesKey: string,
    address: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        await wallet.generateOrRecoverAes();

        const aesKey = wallet.getUserOnboardInfo()?.aesKey;

        if (aesKey !== null && typeof aesKey !== 'string') {
            throw new Error('AES key is not a string');
        }

        if (!aesKey) {
            throw new Error('Failed to generate AES key. Make sure the account is funded.');
        }

        const formattedText = `AES key generated successfully!\n\nAES Key: ${aesKey}\nAddress: ${wallet.address}\n\n⚠️ The AI assistant will remember this AES key during this conversation for use in private transactions.`;

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
export async function generateAesKeyHandler(args: any): Promise<any> {
    if (!isGenerateAesKeyArgs(args)) {
        throw new Error("Invalid arguments for generate_aes_key");
    }
    const { private_key, network } = args;

    const results = await performGenerateAesKey(private_key, network);
    return {
        structuredContent: {
            aesKey: results.aesKey,
            address: results.address
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

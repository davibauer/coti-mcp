import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { getNetwork } from "../shared/account.js";
import { z } from "zod";

export const CREATE_ACCOUNT: ToolAnnotations = {
    title: "Create Account",
    name: "create_account",
    description: "Create a new COTI account with a randomly generated private key and AES key. Returns the new account details for the AI assistant to track in conversation context. The AI should remember these credentials for use in subsequent operations.",
    inputSchema: {
        network: z.enum(['testnet', 'mainnet']).describe("Network to create account for: 'testnet' or 'mainnet' (required)."),
    }
};

/**
 * Creates a new COTI account with a randomly generated private key and AES key.
 * @param network Required network parameter: 'testnet' or 'mainnet'
 * @returns Account details including address, private key, and AES key placeholder
 */
export async function performCreateAccount(network: 'testnet' | 'mainnet'): Promise<{
    address: string,
    privateKey: string,
    aesKey: string,
    network: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const newWallet = Wallet.createRandom(provider);

        const privateKey = newWallet.privateKey;
        const address = newWallet.address;

        const aesKey = "Fund this account to generate an AES key. Go to https://discord.com/invite/Z4r8D6ez49";
        const networkStr = network;

        const formattedText = `New COTI account created successfully!\n\n` +
            `Network: ${networkStr}\n` +
            `Address: ${address}\n\n` +
            `Private Key: ${privateKey}\n\n` +
            `AES Key Placeholder: ${aesKey}\n\n` +
            `⚠️ IMPORTANT: Save these credentials! The AI assistant will remember them during this conversation, but they will be lost when the conversation ends.`;

        return {
            address,
            privateKey,
            aesKey,
            network: networkStr,
            formattedText
        };
    } catch (error) {
        console.error('Error creating new account:', error);
        throw new Error(`Failed to create new account: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the createAccount tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function createAccountHandler(args: any): Promise<any> {
    const network = args?.network as 'testnet' | 'mainnet';

    const results = await performCreateAccount(network);
    return {
        structuredContent: {
            address: results.address,
            privateKey: results.privateKey,
            aesKey: results.aesKey,
            network: results.network
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
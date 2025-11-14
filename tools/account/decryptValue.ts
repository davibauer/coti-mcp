import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { z } from "zod";

export const DECRYPT_VALUE: ToolAnnotations = {
    title: "Decrypt Value",
    name: "decrypt_value",
    description:
        "Decrypt a value using a COTI AES key. " +
        "The AI assistant should pass the private key from context. " +
        "Returns the decrypted value.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        ciphertext: z.string().describe("Ciphertext to decrypt"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
    },
};

/**
 * Checks if the provided arguments are valid for the decrypt_value tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isDecryptValueArgs(args: unknown): args is {
    private_key: string,
    ciphertext: bigint,
    network: 'testnet' | 'mainnet'
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as { private_key: string }).private_key === "string" &&
        "ciphertext" in args &&
        typeof (args as { ciphertext: bigint }).ciphertext === "bigint"
    );
}

/**
 * Decrypts a value using a COTI AES key.
 * @param private_key The private key of the account
 * @param ciphertext The ciphertext to decrypt
 * @param network Optional network parameter
 * @returns An object with the decrypted value and formatted text
 */
export async function performDecryptValue(
    private_key: string,
    ciphertext: bigint,
    network: 'testnet' | 'mainnet'
): Promise<{
    decryptedMessage: string,
    ciphertext: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        const decryptedMessage = await wallet.decryptValue(ciphertext);

        const formattedText = `Decrypted Message: ${decryptedMessage}`;

        return {
            decryptedMessage: decryptedMessage.toString(),
            ciphertext: ciphertext.toString(),
            formattedText
        };
    } catch (error) {
        console.error('Error decrypting message:', error);
        throw new Error(`Failed to decrypt message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the decryptValue tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function decryptValueHandler(args: any): Promise<any> {
    if (!isDecryptValueArgs(args)) {
        throw new Error("Invalid arguments for decrypt_value");
    }
    const { private_key, ciphertext, network } = args;

    const results = await performDecryptValue(private_key, BigInt(ciphertext), network);
    return {
        structuredContent: {
            decryptedMessage: results.decryptedMessage,
            ciphertext: results.ciphertext
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
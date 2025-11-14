import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { z } from "zod";

export const SIGN_MESSAGE: ToolAnnotations = {
    title: "Sign Message",
    name: "sign_message",
    description:
        "Sign a message using a COTI private key. " +
        "This creates a cryptographic signature that proves the message was signed by the owner of the private key. " +
        "The AI assistant should pass the private key from context. " +
        "Returns the signature.",
    inputSchema: {
        private_key: z.string().describe("Private key to sign with (tracked by AI from previous operations)"),
        message: z.string().describe("Message to sign"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
    }
};

/**
 * Checks if the provided arguments are valid for the sign_message tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isSignMessageArgs(args: unknown): args is { private_key: string, message: string, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as { private_key: string }).private_key === "string" &&
        "message" in args &&
        typeof (args as { message: string }).message === "string"
    );
}

/**
 * Signs a message using a COTI private key.
 * @param private_key The private key to sign with
 * @param message The message to sign
 * @param network Required network parameter: 'testnet' or 'mainnet'
 * @returns An object with the signature and formatted text
 */
export async function performSignMessage(
    private_key: string,
    message: string,
    network: 'testnet' | 'mainnet'
): Promise<{
    message: string,
    signature: string,
    signerAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        // Sign the message
        const signature = await wallet.signMessage(message);

        const formattedText = `Message: "${message}"\nSignature: ${signature}\nSigner Address: ${wallet.address}`;

        return {
            message,
            signature,
            signerAddress: wallet.address,
            formattedText
        };
    } catch (error) {
        console.error('Error signing message:', error);
        throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the signMessage tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function signMessageHandler(args: any): Promise<any> {
    if (!isSignMessageArgs(args)) {
        throw new Error("Invalid arguments for sign_message");
    }
    const { private_key, message, network } = args;

    const results = await performSignMessage(private_key, message, network);
    return {
        structuredContent: {
            message: results.message,
            signature: results.signature,
            signerAddress: results.signerAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

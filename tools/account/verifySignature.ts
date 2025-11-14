import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import { z } from "zod";

export const VERIFY_SIGNATURE: ToolAnnotations = {
    title: "Verify Signature",
    name: "verify_signature",
    description:
        "Verify a message signature and recover the address that signed it. " +
        "This is used to determine who signed a specific message. " +
        "Requires the original message and the signature as input. " +
        "Returns the address that created the signature.",
    inputSchema: {
        message: z.string().describe("Original message that was signed"),
        signature: z.string().describe("Signature to verify (hexadecimal string)"),
    },
};

/**
 * Checks if the provided arguments are valid for the verify_signature tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isVerifySignatureArgs(args: unknown): args is { message: string, signature: string , private_key?: string, aes_key?: string, network?: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "message" in args &&
        typeof (args as { message: string }).message === "string" &&
        "signature" in args &&
        typeof (args as { signature: string }).signature === "string"
    );
}

/**
 * Verifies a message signature and recovers the address that signed it.
 * @param message The original message that was signed
 * @param signature The signature to verify
 * @returns An object with verification results and formatted text
 */
export async function performVerifySignature(message: string, signature: string): Promise<{
    message: string,
    signature: string,
    signerAddress: string,
    isValid: boolean,
    formattedText: string
}> {
    try {
        // Recover the address from the signature
        const signerAddress = ethers.verifyMessage(message, signature);

        const formattedText = `Message: "${message}"\nSignature: ${signature}\nSigned by address: ${signerAddress}`;

        return {
            message,
            signature,
            signerAddress,
            isValid: true,
            formattedText
        };
    } catch (error) {
        console.error('Error verifying signature:', error);
        throw new Error(`Failed to verify signature: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the verifySignature tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function verifySignatureHandler(args: any): Promise<any> {
    if (!isVerifySignatureArgs(args)) {
        throw new Error("Invalid arguments for verify_signature");
    }
    const { message, signature } = args;

    const results = await performVerifySignature(message, signature);
    return {
        structuredContent: {
            message: results.message,
            signature: results.signature,
            signerAddress: results.signerAddress,
            isValid: results.isValid
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

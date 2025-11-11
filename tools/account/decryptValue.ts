import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const DECRYPT_VALUE: ToolAnnotations = {
    title: "Decrypt Value",
    name: "decrypt_value",
    description:
        "Decrypt a value using the COTI AES key. " +
        "Requires a ciphertext as input. " +
        "Returns the decrypted value.",
    inputSchema: {
        ciphertext: z.string().describe("Ciphertext to decrypt"),
    },
};

/**
 * Checks if the provided arguments are valid for the decrypt_value tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isDecryptValueArgs(args: unknown): args is { ciphertext: bigint } {
    return (
        typeof args === "object" &&
        args !== null &&
        "ciphertext" in args &&
        typeof (args as { ciphertext: bigint }).ciphertext === "bigint"
    );
}

/**
 * Decrypts a value using the COTI AES key.
 * @param ciphertext The ciphertext to decrypt.
 * @returns An object with the decrypted value and formatted text.
 */
export async function performDecryptValue(session: SessionContext, ciphertext: bigint): Promise<{
    decryptedMessage: string,
    ciphertext: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getCurrentAccountKeys(session);
        const provider = getDefaultProvider(getNetwork(session));
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
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
export async function decryptValueHandler(session: SessionContext, args: any): Promise<any> {
    if (!isDecryptValueArgs(args)) {
        throw new Error("Invalid arguments for decrypt_value");
    }
    const { ciphertext } = args;

    const results = await performDecryptValue(session, BigInt(ciphertext));
    return {
        structuredContent: {
            decryptedMessage: results.decryptedMessage,
            ciphertext: results.ciphertext
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
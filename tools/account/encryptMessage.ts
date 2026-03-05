import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { encrypt, encodeKey, encodeString } from "@coti-io/coti-sdk-typescript";
import { z } from "zod";

export const ENCRYPT_MESSAGE = {
    title: "Encrypt Message",
    name: "encrypt_message",
    description:
        "Encrypt a plain text message using a COTI AES key. " +
        "Unlike encrypt_value, this does not require a contract address or function selector. " +
        "Returns the ciphertext and a random factor (r) both as hex strings, which are needed to decrypt the message later.",
    inputSchema: {
        aes_key: z.string().describe("AES key used to encrypt the message (can be obtained from generate_aes_key)"),
        message: z.string().describe("Plain text message to encrypt"),
    },
};

export function isEncryptMessageArgs(args: unknown): args is { aes_key: string, message: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "aes_key" in args &&
        typeof (args as { aes_key: string }).aes_key === "string" &&
        "message" in args &&
        typeof (args as { message: string }).message === "string"
    );
}

export async function performEncryptMessage(
    aes_key: string,
    message: string
): Promise<{
    ciphertext: string,
    r: string,
    originalMessage: string,
    formattedText: string
}> {
    try {
        const key = encodeKey(aes_key);
        const plaintext = encodeString(message);
        const { ciphertext, r } = encrypt(key, plaintext);

        const ciphertextHex = Buffer.from(ciphertext).toString('hex');
        const rHex = Buffer.from(r).toString('hex');

        const formattedText = `Original Message: "${message}"\nCiphertext (hex): ${ciphertextHex}\nR (hex): ${rHex}`;

        return {
            ciphertext: ciphertextHex,
            r: rHex,
            originalMessage: message,
            formattedText
        };
    } catch (error) {
        console.error('Error encrypting message:', error);
        throw new Error(`Failed to encrypt message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function encryptMessageHandler(args: any): Promise<any> {
    if (!isEncryptMessageArgs(args)) {
        throw new Error("Invalid arguments for encrypt_message");
    }
    const { aes_key, message } = args;

    const results = await performEncryptMessage(aes_key, message);
    return {
        structuredContent: {
            ciphertext: results.ciphertext,
            r: results.r,
            originalMessage: results.originalMessage
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

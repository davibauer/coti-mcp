import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { decrypt, encodeKey } from "@coti-io/coti-sdk-typescript";
import { z } from "zod";

export const DECRYPT_MESSAGE = {
    title: "Decrypt Message",
    name: "decrypt_message",
    description:
        "Decrypt a message that was encrypted using encrypt_message. " +
        "Requires the same AES key used to encrypt, the ciphertext, and the random factor (r) — both as hex strings.",
    inputSchema: {
        aes_key: z.string().describe("AES key used to decrypt the message (must match the key used during encryption)"),
        ciphertext: z.string().describe("Ciphertext to decrypt, as a hex string (returned by encrypt_message)"),
        r: z.string().describe("Random factor used during encryption, as a hex string (returned by encrypt_message)"),
    },
};

export function isDecryptMessageArgs(args: unknown): args is { aes_key: string, ciphertext: string, r: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "aes_key" in args &&
        typeof (args as { aes_key: string }).aes_key === "string" &&
        "ciphertext" in args &&
        typeof (args as { ciphertext: string }).ciphertext === "string" &&
        "r" in args &&
        typeof (args as { r: string }).r === "string"
    );
}

export async function performDecryptMessage(
    aes_key: string,
    ciphertextHex: string,
    rHex: string
): Promise<{
    decryptedMessage: string,
    ciphertext: string,
    formattedText: string
}> {
    try {
        const key = encodeKey(aes_key);
        const ciphertext = new Uint8Array(Buffer.from(ciphertextHex, 'hex'));
        const r = new Uint8Array(Buffer.from(rHex, 'hex'));

        const plaintextBytes = decrypt(key, r, ciphertext);
        const decryptedMessage = Buffer.from(plaintextBytes).toString('utf8').replace(/\0+$/, '');

        const formattedText = `Decrypted Message: "${decryptedMessage}"`;

        return {
            decryptedMessage,
            ciphertext: ciphertextHex,
            formattedText
        };
    } catch (error) {
        console.error('Error decrypting message:', error);
        throw new Error(`Failed to decrypt message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function decryptMessageHandler(args: any): Promise<any> {
    if (!isDecryptMessageArgs(args)) {
        throw new Error("Invalid arguments for decrypt_message");
    }
    const { aes_key, ciphertext, r } = args;

    const results = await performDecryptMessage(aes_key, ciphertext, r);
    return {
        structuredContent: {
            decryptedMessage: results.decryptedMessage,
            ciphertext: results.ciphertext
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

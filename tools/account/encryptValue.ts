import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { z } from "zod";

export const ENCRYPT_VALUE: ToolAnnotations = {
    title: "Encrypt Value",
    name: "encrypt_value",
    description:
        "Encrypt a value using the COTI AES key. " +
        "This is used for encrypting values to be sent to another address. " +
        "Requires a value, contract address, and function selector as input. " +
        "Returns the signature.",
    inputSchema: {
        message: z.string().describe("Message to encrypt"),
        contract_address: z.string().describe("Contract address"),
        function_selector: z.string().describe("Function selector. To get the function selector, use the keccak256 hash of the function signature. For instance, for the transfer function of an ERC20 token, the function selector is '0xa9059cbb'."),
    },
};

/**
 * Checks if the provided arguments are valid for the encrypt_value tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isEncryptValueArgs(args: unknown): args is { message: string, contract_address: string, function_selector: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "message" in args &&
        typeof (args as { message: string }).message === "string" &&
        "contract_address" in args &&
        typeof (args as { contract_address: string }).contract_address === "string" &&
        "function_selector" in args &&
        typeof (args as { function_selector: string }).function_selector === "string"
    );
}

/**
 * Encrypts a value using the COTI AES key.
 * @param message The message to encrypt.
 * @param contractAddress The contract address.
 * @param functionSelector The function selector.
 * @returns An object with the encrypted message and formatted text.
 */
export async function performEncryptValue(message: bigint | number | string, contractAddress: string, functionSelector: string): Promise<{
    encryptedMessage: string,
    originalMessage: string,
    contractAddress: string,
    functionSelector: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getCurrentAccountKeys();
        const provider = getDefaultProvider(getNetwork());
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        const encryptedMessage = await wallet.encryptValue(message, contractAddress, functionSelector);
        
        const encryptedMessageString = typeof encryptedMessage === 'object' ? 
            encryptedMessage.toString() : String(encryptedMessage);
        
        const formattedText = `Encrypted Message: ${encryptedMessageString}`;
        
        return {
            encryptedMessage: encryptedMessageString,
            originalMessage: message.toString(),
            contractAddress,
            functionSelector,
            formattedText
        };
    } catch (error) {
        console.error('Error encrypting message:', error);
        throw new Error(`Failed to encrypt message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the encryptValue tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function encryptValueHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isEncryptValueArgs(args)) {
        throw new Error("Invalid arguments for encrypt_value");
    }
    const { message, contract_address, function_selector } = args;

    const results = await performEncryptValue(message, contract_address, function_selector);
    return {
        structuredContent: {
            encryptedMessage: results.encryptedMessage,
            originalMessage: results.originalMessage,
            contractAddress: results.contractAddress,
            functionSelector: results.functionSelector
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { z } from "zod";

export const ENCRYPT_VALUE: ToolAnnotations = {
    title: "Encrypt Value",
    name: "encrypt_value",
    description:
        "Encrypt a value using a COTI AES key. " +
        "This is used for encrypting values to be sent to another address for private transactions. " +
        "The AI assistant should pass the private key from context. " +
        "Returns the encrypted value.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        message: z.string().describe("Message to encrypt"),
        contract_address: z.string().describe("Contract address"),
        function_selector: z.string().describe("Function selector. To get the function selector, use the keccak256 hash of the function signature. For instance, for the transfer function of an ERC20 token, the function selector is '0xa9059cbb'."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
    },
};

/**
 * Checks if the provided arguments are valid for the encrypt_value tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isEncryptValueArgs(args: unknown): args is {
    private_key: string,
    message: string,
    contract_address: string,
    function_selector: string,
    network: 'testnet' | 'mainnet'
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as { private_key: string }).private_key === "string" &&
        "message" in args &&
        typeof (args as { message: string }).message === "string" &&
        "contract_address" in args &&
        typeof (args as { contract_address: string }).contract_address === "string" &&
        "function_selector" in args &&
        typeof (args as { function_selector: string }).function_selector === "string"
    );
}

/**
 * Encrypts a value using a COTI AES key.
 * @param private_key The private key of the account
 * @param message The message to encrypt
 * @param contractAddress The contract address
 * @param functionSelector The function selector
 * @param network Required network parameter: 'testnet' or 'mainnet'
 * @returns An object with the encrypted message and formatted text
 */
export async function performEncryptValue(
    private_key: string,
    message: bigint | number | string,
    contractAddress: string,
    functionSelector: string,
    network: 'testnet' | 'mainnet'
): Promise<{
    encryptedMessage: string,
    originalMessage: string,
    contractAddress: string,
    functionSelector: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

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
export async function encryptValueHandler(args: any): Promise<any> {
    if (!isEncryptValueArgs(args)) {
        throw new Error("Invalid arguments for encrypt_value");
    }
    const { private_key, message, contract_address, function_selector, network } = args;

    const results = await performEncryptValue(private_key, message, contract_address, function_selector, network);
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
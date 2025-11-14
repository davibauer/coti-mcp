import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet } from '@coti-io/coti-ethers';
import { getNetwork } from "../shared/account.js";
import { z } from "zod";

export const TRANSFER_NATIVE: ToolAnnotations = {
    title: "Transfer Native",
    name: "transfer_native",
    description:
        "Transfer native COTI tokens to another wallet. " +
        "This is used for sending COTI tokens from your wallet to another address. " +
        "Requires private key, recipient address, and amount in Wei as input. " +
        "The AI assistant should track and pass the account private key from context. " +
        "Returns the transaction hash upon successful transfer.",
    inputSchema: {
        private_key: z.string().describe("Private key of the sender account (tracked by AI from previous import/generate operations)"),
        recipient_address: z.string().describe("Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        amount_wei: z.union([z.string(), z.number()]).transform(val => String(val)).describe("Amount of COTI to transfer (in Wei)"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction"),
    },
};

/**
 * Transfers native COTI tokens to another wallet
 * @param private_key The private key of the sender account
 * @param recipient_address The recipient COTI address
 * @param amount_wei The amount of COTI to transfer (in Wei)
 * @param network Required network parameter: 'testnet' or 'mainnet'
 * @param gas_limit Optional gas limit for the transaction
 * @returns An object with transaction details and formatted text
 */
export async function performTransferNative(
    private_key: string,
    recipient_address: string,
    amount_wei: string,
    network: 'testnet' | 'mainnet',
    gas_limit?: string
): Promise<{
    transactionHash: string,
    token: string,
    amountWei: string,
    recipient: string,
    sender: string,
    network: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }

        const tx = await wallet.sendTransaction({
            to: recipient_address,
            value: amount_wei,
            ...txOptions
        });

        const receipt = await tx.wait();

        const networkStr = network;
        const formattedText = `Transaction successful!\nToken: COTI\nNetwork: ${networkStr}\nTransaction Hash: ${receipt?.hash}\nAmount in Wei: ${amount_wei}\nRecipient: ${recipient_address}`;

        return {
            transactionHash: receipt?.hash || '',
            token: 'COTI',
            amountWei: amount_wei,
            recipient: recipient_address,
            sender: wallet.address,
            network: networkStr,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error transferring COTI tokens:', error);
        throw new Error(`Failed to transfer COTI tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Checks if the provided arguments are valid for the transferNative tool
 * @param args The arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isTransferNativeArgs(args: unknown): args is {
    private_key: string,
    recipient_address: string,
    amount_wei: string | number,
    network: 'testnet' | 'mainnet',
    gas_limit?: string
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as { private_key: string }).private_key === "string" &&
        "recipient_address" in args &&
        typeof (args as { recipient_address: string }).recipient_address === "string" &&
        "amount_wei" in args &&
        (typeof (args as { amount_wei: string | number }).amount_wei === "string" || typeof (args as { amount_wei: string | number }).amount_wei === "number") &&
        (!("network" in args) || typeof (args as { network: string }).network === "string") &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string")
    );
}

/**
 * Handler for the transferNative tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function transferNativeHandler(args: any): Promise<any> {
    if (!isTransferNativeArgs(args)) {
        throw new Error("Invalid arguments for transfer_native");
    }
    const { private_key, recipient_address, amount_wei, network, gas_limit } = args;

    const amount_wei_string = String(amount_wei);
    const results = await performTransferNative(private_key, recipient_address, amount_wei_string, network, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            token: results.token,
            amountWei: results.amountWei,
            recipient: results.recipient,
            sender: results.sender,
            network: results.network,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
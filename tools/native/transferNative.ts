import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet } from '@coti-io/coti-ethers';
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { z } from "zod";

export const TRANSFER_NATIVE: ToolAnnotations = {
    title: "Transfer Native",
    name: "transfer_native",
    description:
        "Transfer native COTI tokens to another wallet. " +
        "This is used for sending COTI tokens from your wallet to another address. " +
        "Requires recipient address and amount in Wei as input. " +
        "Returns the transaction hash upon successful transfer.",
    inputSchema: {
        recipient_address: z.string().describe("Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        amount_wei: z.string().describe("Amount of COTI to transfer (in Wei)"),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction"),
    },
};

/**
 * Transfers native COTI tokens to another wallet
 * @param recipient_address The recipient COTI address
 * @param amount_wei The amount of COTI to transfer (in Wei)
 * @param gas_limit Optional gas limit for the transaction
 * @returns An object with transaction details and formatted text
 */
export async function performTransferNative(recipient_address: string, amount_wei: string, gas_limit?: string): Promise<{
    transactionHash: string,
    token: string,
    amountWei: string,
    recipient: string,
    sender: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getCurrentAccountKeys();
        const provider = getDefaultProvider(getNetwork());
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
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
        
        const formattedText = `Transaction successful!\nToken: COTI\nTransaction Hash: ${receipt?.hash}\nAmount in Wei: ${amount_wei}\nRecipient: ${recipient_address}`;
        
        return {
            transactionHash: receipt?.hash || '',
            token: 'COTI',
            amountWei: amount_wei,
            recipient: recipient_address,
            sender: wallet.address,
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
export function isTransferNativeArgs(args: unknown): args is { recipient_address: string, amount_wei: string, gas_limit?: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "recipient_address" in args &&
        typeof (args as { recipient_address: string }).recipient_address === "string" &&
        "amount_wei" in args &&
        typeof (args as { amount_wei: string }).amount_wei === "string" &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string")
    );
}

/**
 * Handler for the transferNative tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function transferNativeHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isTransferNativeArgs(args)) {
        throw new Error("Invalid arguments for transfer_native");
    }
    const { recipient_address, amount_wei, gas_limit } = args;

    const results = await performTransferNative(recipient_address, amount_wei, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            token: results.token,
            amountWei: results.amountWei,
            recipient: results.recipient,
            sender: results.sender,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
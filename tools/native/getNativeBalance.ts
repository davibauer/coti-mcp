import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, ethers } from '@coti-io/coti-ethers';
import { getNetwork } from "../shared/account.js";
import { z } from "zod";

export const GET_NATIVE_BALANCE: ToolAnnotations = {
    title: "Get Native Balance",
    name: "get_native_balance",
    description:
        "Get the native COTI token balance of a COTI blockchain account. This is used for checking the current balance of a COTI account. Requires a COTI account address as input. Returns the account balance in COTI tokens.",
    inputSchema: {
        account_address: z.string().describe("COTI account address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
    },
};

/**
 * Gets the native COTI token balance of a COTI blockchain account
 * @param args The arguments to get the balance for
 * @returns The native COTI token balance of the account
 */
export async function getNativeBalanceHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isGetNativeBalanceArgs(args)) {
        throw new Error("Invalid arguments for get_native_balance");
    }
    const { account_address } = args;

    const results = await performGetNativeBalance(account_address);
    return {
        structuredContent: {
            account: results.account,
            balanceWei: results.balanceWei,
            balanceCoti: results.balanceCoti
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Gets the native COTI token balance of a COTI blockchain account
 * @param account_address The COTI account address to get the balance for
 * @returns An object with the account balance and formatted text
 */
export async function performGetNativeBalance(account_address: string): Promise<{
    account: string,
    balanceWei: string,
    balanceCoti: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork());
        const balance = await provider.getBalance(account_address);
        const balanceWei = balance.toString();
        const balanceCoti = ethers.formatEther(balance);
        
        const formattedText = `Account: ${account_address}\nBalance: ${balanceWei} wei (${balanceCoti} COTI)`;
        
        return {
            account: account_address,
            balanceWei,
            balanceCoti,
            formattedText
        };
    } catch (error) {
        console.error('Error getting native balance:', error);
        throw new Error(`Failed to get native balance: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Checks if the provided arguments are valid for the getNativeBalance tool
 * @param args The arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetNativeBalanceArgs(args: unknown): args is { account_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "account_address" in args &&
        typeof (args as any).account_address === "string"
    );
}
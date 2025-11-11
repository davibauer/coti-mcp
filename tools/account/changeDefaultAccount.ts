import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getAccountKeys } from "../shared/account.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const CHANGE_DEFAULT_ACCOUNT: ToolAnnotations = {
    title: "Change Default Account",
    name: "change_default_account",
    description: "Change the default account used for COTI blockchain operations. This allows switching between different accounts configured in the environment. The account must be configured in the environment variables with corresponding private and AES keys. Returns the new default account address upon successful change.",
    inputSchema: {
        account_address: z.string().describe("COTI account address to set as default, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
    }
};

/**
 * Validates the arguments for changing the default account
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isChangeDefaultAccountArgs(args: unknown): args is { account_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "account_address" in args &&
        typeof (args as { account_address: string }).account_address === "string"
    );
}

/**
 * Changes the default account used for COTI blockchain operations.
 * @param account_address The COTI account address to set as default
 * @returns An object with the new default account address and formatted text
 */
export async function performChangeDefaultAccount(session: SessionContext, account_address: string): Promise<{
    newDefaultAccount: string,
    formattedText: string
}> {
    try {
        const accountKeys = getAccountKeys(session, account_address);
        
        if (!accountKeys) {
            throw new Error(`Account ${account_address} not found`);
        }
        
        session.storage.set(SessionKeys.CURRENT_PUBLIC_KEY, account_address);
        
        const formattedText = `Default account successfully changed to: ${account_address}`;
        
        return {
            newDefaultAccount: account_address,
            formattedText
        };
    } catch (error) {
        console.error('Error changing default account:', error);
        throw new Error(`Failed to change default account: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the changeDefaultAccount tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function changeDefaultAccountHandler(session: SessionContext, args: any) {
    if (!isChangeDefaultAccountArgs(args)) {
        throw new Error("Invalid arguments for change_default_account");
    }
    const { account_address } = args;

    const results = await performChangeDefaultAccount(session, account_address);
    return {
        structuredContent: {
            newDefaultAccount: results.newDefaultAccount
        },
        content: [{ type: "text" as const, text: results.formattedText }],
        isError: false,
    };
}
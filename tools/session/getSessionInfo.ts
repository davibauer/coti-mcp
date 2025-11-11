import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { SessionContext } from "../../src/types/session.js";
import { z } from "zod";

export const GET_SESSION_INFO: ToolAnnotations = {
    title: "Get Session Info",
    name: "get_session_info",
    description: "Get information about the current session including session ID, account count, and session storage details. Useful for debugging and understanding session state.",
    inputSchema: {}
};

/**
 * Gets information about the current session
 * @param session The session context
 * @returns Session information and formatted text
 */
export async function performGetSessionInfo(
    session: SessionContext
): Promise<{
    sessionId: string;
    accountCount: number;
    hasAccounts: boolean;
    hasDefaultAccount: boolean;
    defaultAccount: string | null;
    network: string | null;
    storageKeys: string[];
    formattedText: string;
}> {
    try {
        const sessionId = session.sessionId;

        // Get account information
        const publicKeys = (session.storage.get('COTI_MCP_PUBLIC_KEY') || '').split(',').filter(Boolean);
        const accountCount = publicKeys.length;
        const hasAccounts = accountCount > 0;

        // Get default account
        const defaultAccount = session.storage.get('COTI_MCP_CURRENT_PUBLIC_KEY') || null;
        const hasDefaultAccount = defaultAccount !== null && defaultAccount !== '';

        // Get network
        const network = session.storage.get('COTI_MCP_NETWORK') || null;

        // Get all storage keys
        const storageKeys = Array.from(session.storage.keys());

        let formattedText = `Session Information\n`;
        formattedText += `${'='.repeat(50)}\n\n`;
        formattedText += `Session ID: ${sessionId}\n\n`;
        formattedText += `Account Count: ${accountCount}\n`;
        formattedText += `Has Accounts: ${hasAccounts ? 'Yes' : 'No'}\n\n`;

        if (hasAccounts) {
            formattedText += `Accounts in Session:\n`;
            publicKeys.forEach((key, index) => {
                const isDefault = key === defaultAccount;
                formattedText += `  ${index + 1}. ${key}${isDefault ? ' (default)' : ''}\n`;
            });
            formattedText += `\n`;
        }

        formattedText += `Default Account: ${defaultAccount || 'Not set'}\n`;
        formattedText += `Network: ${network || 'Not set'}\n\n`;

        formattedText += `Storage Keys (${storageKeys.length}):\n`;
        if (storageKeys.length > 0) {
            storageKeys.forEach(key => {
                formattedText += `  - ${key}\n`;
            });
        } else {
            formattedText += `  (no keys stored)\n`;
        }

        formattedText += `\n${'='.repeat(50)}\n\n`;
        formattedText += `Note: This session is managed by the MCP client.\n`;
        formattedText += `Sessions persist while the connection is active and are destroyed on disconnect.\n`;
        formattedText += `To preserve accounts across sessions, use 'export_accounts' before disconnecting.\n`;

        return {
            sessionId,
            accountCount,
            hasAccounts,
            hasDefaultAccount,
            defaultAccount,
            network,
            storageKeys,
            formattedText
        };
    } catch (error) {
        console.error('Error getting session info:', error);
        throw new Error(`Failed to get session info: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the get_session_info tool
 * @param session The session context
 * @param args The arguments for the tool (none required)
 * @returns The tool response
 */
export async function getSessionInfoHandler(session: SessionContext, args: any): Promise<any> {
    const results = await performGetSessionInfo(session);

    return {
        structuredContent: {
            sessionId: results.sessionId,
            accountCount: results.accountCount,
            hasAccounts: results.hasAccounts,
            hasDefaultAccount: results.hasDefaultAccount,
            defaultAccount: results.defaultAccount,
            network: results.network,
            storageKeys: results.storageKeys
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

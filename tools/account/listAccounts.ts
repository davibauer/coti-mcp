import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { maskSensitiveString } from "../shared/account.js";
import { getNetwork } from "../shared/account.js";

export const LIST_ACCOUNTS: ToolAnnotations = {
    title: "List Accounts",
    name: "list_accounts",
    description: "List all available COTI accounts configured in the environment. Returns the account addresses, current default account, and masked versions of the private and AES keys.",
    inputSchema: {}
};

/**
 * Lists all available COTI accounts configured in the environment.
 * @returns An object with account information and formatted text.
 */
export async function performListAccounts(): Promise<{
    accounts: Array<{
        address: string,
        privateKey: string,
        aesKey: string,
        isDefault: boolean,
        index: number
    }>,
    defaultAccount: string,
    network: string,
    totalAccounts: number,
    formattedText: string
}> {
    try {
        const publicKeys = (process.env.COTI_MCP_PUBLIC_KEY || '').split(',').filter(Boolean);
        const privateKeys = (process.env.COTI_MCP_PRIVATE_KEY || '').split(',').filter(Boolean);
        const aesKeys = (process.env.COTI_MCP_AES_KEY || '').split(',').filter(Boolean);
        const currentAccount = process.env.COTI_MCP_CURRENT_PUBLIC_KEY || publicKeys[0] || '';
        const network = getNetwork();
        
        if (publicKeys.length === 0) {
            const formattedText = "No COTI accounts configured in the environment.";
            return {
                accounts: [],
                defaultAccount: '',
                network,
                totalAccounts: 0,
                formattedText
            };
        }
        
        const accounts = [];
        let formattedText = "Available COTI Accounts on " + network + ":\n\n";
        formattedText += "======================\n\n";
        
        for (let i = 0; i < publicKeys.length; i++) {
            const publicKey = publicKeys[i];
            const privateKey = privateKeys[i] ? maskSensitiveString(privateKeys[i]) : "Not available";
            const aesKey = aesKeys[i] ? maskSensitiveString(aesKeys[i]) : "Not available";
            const isDefault = publicKey === currentAccount;
            const defaultText = isDefault ? " (DEFAULT)" : "";
            
            accounts.push({
                address: publicKey,
                privateKey,
                aesKey,
                isDefault,
                index: i + 1
            });
            
            formattedText += `Account ${i + 1}${defaultText}:\n\n`;
            formattedText += `Address: ${publicKey}\n\n`;
            formattedText += `Private Key: ${privateKey}\n\n`;
            formattedText += `AES Key: ${aesKey}\n\n`;
        }
        
        return {
            accounts,
            defaultAccount: currentAccount,
            network,
            totalAccounts: publicKeys.length,
            formattedText
        };
    } catch (error) {
        console.error('Error listing accounts:', error);
        throw new Error(`Failed to list accounts: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the listAccounts tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function listAccountsHandler(args: Record<string, unknown> | undefined): Promise<any> {
    const results = await performListAccounts();
    return {
        structuredContent: {
            accounts: results.accounts,
            defaultAccount: results.defaultAccount,
            network: results.network,
            totalAccounts: results.totalAccounts
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const EXPORT_ACCOUNTS: ToolAnnotations = {
    title: "Export accounts",
    description: "Backup all available COTI accounts and export them as a JSON string for future import. Returns a JSON string that can be copied and used for importing later.",
    inputSchema: {
        include_sensitive_data: z.boolean().optional().default(true).describe("Optional, whether to include sensitive data (private keys and AES keys) in the output. Default is true."),
        account_addresses: z.array(z.string()).optional().describe("Optional list of account addresses to export. If not provided, all accounts will be exported."),
    }
};

interface ExportAccountsArgs {
    include_sensitive_data?: boolean;
    account_addresses?: string[];
}

/**
 * Type guard for ExportAccountsArgs
 * @param args The arguments to check
 * @returns Whether the arguments match the expected type
 */
function isExportAccountsArgs(args: Record<string, unknown> | undefined): args is Record<string, unknown> & ExportAccountsArgs {
    if (!args) return true;
    
    if ('include_sensitive_data' in args && typeof args.include_sensitive_data !== 'boolean' && args.include_sensitive_data !== undefined) {
        return false;
    }
    
    if ('account_addresses' in args) {
        const accountAddresses = args.account_addresses;
        if (!Array.isArray(accountAddresses)) {
            return false;
        }
        
        if (accountAddresses.some(addr => typeof addr !== 'string')) {
            return false;
        }
    }
    
    return true;
}

/**
 * Exports COTI accounts to a JSON string
 * @param args The arguments for the export
 * @returns An object with the exported accounts data and formatted text
 */
export async function performExportAccounts(session: SessionContext, args: ExportAccountsArgs): Promise<{
    timestamp: string,
    accounts: Array<{
        address: string,
        private_key: string,
        aes_key: string,
        is_default: boolean
    }>,
    includeSensitiveData: boolean,
    totalAccounts: number,
    exportedAccounts: number,
    formattedText: string
}> {
    try {
        const includeSensitiveData = args.include_sensitive_data !== false; // Default to true if not specified
        const specificAddresses = args.account_addresses || [];
        
        const publicKeys = (session.storage.get(SessionKeys.PUBLIC_KEYS) || '').split(',').filter(Boolean);
        const privateKeys = (session.storage.get(SessionKeys.PRIVATE_KEYS) || '').split(',').filter(Boolean);
        const aesKeys = (session.storage.get(SessionKeys.AES_KEYS) || '').split(',').filter(Boolean);
        const currentAccount = session.storage.get(SessionKeys.CURRENT_PUBLIC_KEY) || publicKeys[0] || '';
        
        if (publicKeys.length === 0) {
            const formattedText = "No COTI accounts configured in the environment. Nothing to export.";
            return {
                timestamp: new Date().toISOString(),
                accounts: [],
                includeSensitiveData,
                totalAccounts: 0,
                exportedAccounts: 0,
                formattedText
            };
        }
        
        let filteredIndices: number[] = [];
        
        if (specificAddresses.length > 0) {
            const normalizedSpecificAddresses = specificAddresses.map(addr => addr.toLowerCase());
            filteredIndices = publicKeys
                .map((addr, index) => ({ addr: addr.toLowerCase(), index }))
                .filter(item => normalizedSpecificAddresses.includes(item.addr))
                .map(item => item.index)
        }

        if (filteredIndices.length === 0) {
            filteredIndices = publicKeys.map((_, index) => index);
        }

        const accounts = filteredIndices.map(i => {
            let privateKey: string;
            if (!includeSensitiveData) {
                privateKey = "[REDACTED]";
            } else {
                privateKey = privateKeys[i] || "";
            }
            
            const aesKey = includeSensitiveData ? (aesKeys[i] || "") : "[REDACTED]";
            const isDefault = publicKeys[i] === currentAccount;
            
            return {
                address: publicKeys[i],
                private_key: privateKey,
                aes_key: aesKey,
                is_default: isDefault
            };
        });
        
        const timestamp = new Date().toISOString();
        const backupData = {
            timestamp,
            accounts: accounts
        };
        
        const jsonString = JSON.stringify(backupData, null, 2);
        
        let header = "=== COTI ACCOUNTS BACKUP (JSON FORMAT) ===\n\n";
        if (specificAddresses.length > 0) {
            header = `=== COTI ACCOUNTS BACKUP (${accounts.length} of ${publicKeys.length} accounts) ===\n\n`;
        }
        
        let footer = "";
        if (includeSensitiveData) {
            footer = "\nWARNING: This backup contains sensitive information. Keep it secure and do not share it.";
        }
        
        const formattedText = `${header}${jsonString}${footer}`;
        
        return {
            timestamp,
            accounts,
            includeSensitiveData,
            totalAccounts: publicKeys.length,
            exportedAccounts: accounts.length,
            formattedText
        };
    } catch (error) {
        console.error('Error exporting accounts:', error);
        throw new Error(`Failed to export accounts: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the exportAccounts tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function exportAccountsHandler(session: SessionContext, args: any): Promise<any> {
    if (!isExportAccountsArgs(args)) {
        return {
            content: [{ type: "text", text: "Invalid arguments provided." }],
            isError: true,
        };
    }
    
    try {
        const results = await performExportAccounts(session, args || {});
        return {
            structuredContent: {
                timestamp: results.timestamp,
                accounts: results.accounts,
                includeSensitiveData: results.includeSensitiveData,
                totalAccounts: results.totalAccounts,
                exportedAccounts: results.exportedAccounts
            },
            content: [{ type: "text", text: results.formattedText }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
}

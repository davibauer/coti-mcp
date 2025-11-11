import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const IMPORT_ACCOUNTS: ToolAnnotations = {
    title: "Import Accounts",
    name: "import_accounts",
    description: "Import COTI accounts from a JSON backup string previously created with the export_accounts tool.",
    inputSchema: {
        backup_data: z.string().describe("The JSON backup string containing the accounts to import. Example:\n\n{\n    \"timestamp\": \"2025-06-03T17:18:55.123Z\",\n    \"accounts\": [\n        {\n            \"address\": \"0x123...\",\n            \"private_key\": \"0x456...\",\n            \"aes_key\": \"0x789...\",\n            \"is_default\": true\n        },\n        ...\n    ]\n}\n"),
        merge_with_existing: z.boolean().describe("Whether to merge with existing accounts or replace them. Default is true (merge)."),
        set_default_account: z.string().describe("Optional address to set as the default account after import. If not provided, will use the default from the backup."),
    }
};

interface ImportAccountsArgs {
    backup_data: string;
    merge_with_existing?: boolean;
    set_default_account?: string;
}

interface AccountData {
    address: string;
    private_key: string;
    aes_key: string;
    is_default: boolean;
}

interface BackupData {
    timestamp: string;
    accounts: AccountData[];
}

/**
 * Type guard for ImportAccountsArgs
 * @param args The arguments to check
 * @returns Whether the arguments match the expected type
 */
function isImportAccountsArgs(args: Record<string, unknown> | undefined): args is Record<string, unknown> & ImportAccountsArgs {
    if (!args) return false; // Args are required
    
    if (!('backup_data' in args) || typeof args.backup_data !== 'string' || !args.backup_data) {
        return false;
    }
    
    if ('merge_with_existing' in args && typeof args.merge_with_existing !== 'boolean' && args.merge_with_existing !== undefined) {
        return false;
    }
    
    if ('set_default_account' in args && typeof args.set_default_account !== 'string' && args.set_default_account !== undefined) {
        return false;
    }
    
    return true;
}

/**
 * Parses a backup data string
 * @param backupData The backup data string
 * @returns The parsed backup data
 */
function parseBackupData(backupData: string): BackupData {
    // First, try to extract JSON from the string if it contains formatting
    const jsonMatch = backupData.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Invalid backup data: Could not find JSON object in the provided string");
    }
    
    try {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Validate the structure
        if (!parsedData.accounts || !Array.isArray(parsedData.accounts)) {
            throw new Error("Invalid backup data: Missing or invalid 'accounts' array");
        }
        
        // Validate each account
        for (const account of parsedData.accounts) {
            if (!account.address || typeof account.address !== 'string') {
                throw new Error("Invalid backup data: Account missing valid address");
            }
            
            if (!account.private_key || typeof account.private_key !== 'string' || account.private_key === '[REDACTED]') {
                throw new Error("Invalid backup data: Account missing valid private key or contains redacted data");
            }
            
            if (!account.aes_key || typeof account.aes_key !== 'string' || account.aes_key === '[REDACTED]') {
                throw new Error("Invalid backup data: Account missing valid AES key or contains redacted data");
            }
        }
        
        return parsedData;
    } catch (error) {
        throw new Error(`Failed to parse backup data: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Imports COTI accounts from a backup
 * @param args The arguments for the import
 * @returns An object with the import results and formatted text
 */
export async function performImportAccounts(session: SessionContext, args: ImportAccountsArgs): Promise<{
    importedAccounts: number,
    totalAccounts: number,
    mergedWithExisting: boolean,
    defaultAccount: string,
    accountAddresses: string[],
    formattedText: string
}> {
    try {
        const mergeWithExisting = args.merge_with_existing !== false; // Default to true if not specified
        
        // Parse the backup data
        const backupData = parseBackupData(args.backup_data);
        
        // Get existing account data
        const existingPublicKeys = (session.storage.get(SessionKeys.PUBLIC_KEYS) || '').split(',').filter(Boolean);
        const existingPrivateKeys = (session.storage.get(SessionKeys.PRIVATE_KEYS) || '').split(',').filter(Boolean);
        const existingAesKeys = (session.storage.get(SessionKeys.AES_KEYS) || '').split(',').filter(Boolean);
        const currentAccount = session.storage.get(SessionKeys.CURRENT_PUBLIC_KEY) || existingPublicKeys[0] || '';
        
        // Prepare new account data
        let newPublicKeys: string[] = [];
        let newPrivateKeys: string[] = [];
        let newAesKeys: string[] = [];
        let newDefaultAccount = args.set_default_account || '';
        
        if (mergeWithExisting) {
            // Start with existing accounts
            newPublicKeys = [...existingPublicKeys];
            newPrivateKeys = [...existingPrivateKeys];
            newAesKeys = [...existingAesKeys];
            
            // If no default account specified, use the current one
            if (!newDefaultAccount) {
                newDefaultAccount = currentAccount;
            }
            
            // Add new accounts, avoiding duplicates
            for (const account of backupData.accounts) {
                const existingIndex = newPublicKeys.findIndex(key => key.toLowerCase() === account.address.toLowerCase());
                
                if (existingIndex >= 0) {
                    // Update existing account
                    newPrivateKeys[existingIndex] = account.private_key;
                    newAesKeys[existingIndex] = account.aes_key;
                } else {
                    // Add new account
                    newPublicKeys.push(account.address);
                    newPrivateKeys.push(account.private_key);
                    newAesKeys.push(account.aes_key);
                }
                
                // Set as default if it's marked as default in the backup and no specific default was requested
                if (account.is_default && !args.set_default_account && !newDefaultAccount) {
                    newDefaultAccount = account.address;
                }
            }
        } else {
            // Replace with imported accounts
            newPublicKeys = backupData.accounts.map(account => account.address);
            newPrivateKeys = backupData.accounts.map(account => account.private_key);
            newAesKeys = backupData.accounts.map(account => account.aes_key);
            
            // Set default account
            if (!newDefaultAccount) {
                // Find the default account in the backup
                const defaultAccount = backupData.accounts.find(account => account.is_default);
                newDefaultAccount = defaultAccount ? defaultAccount.address : backupData.accounts[0]?.address || '';
            }
        }
        
        // Update environment variables
        session.storage.set(SessionKeys.PUBLIC_KEYS, newPublicKeys.join(','));
        session.storage.set(SessionKeys.PRIVATE_KEYS, newPrivateKeys.join(','));
        session.storage.set(SessionKeys.AES_KEYS, newAesKeys.join(','));
        
        // Set default account if specified
        if (newDefaultAccount) {
            session.storage.set(SessionKeys.CURRENT_PUBLIC_KEY, newDefaultAccount);
        }
        
        // Generate result message
        let formattedText = `Successfully imported ${backupData.accounts.length} account(s).\n\n`;
        
        if (mergeWithExisting) {
            formattedText += `Merged with existing accounts. Total accounts now: ${newPublicKeys.length}.\n\n`;
        } else {
            formattedText += `Replaced existing accounts. Total accounts now: ${newPublicKeys.length}.\n\n`;
        }
        
        formattedText += `Default account set to: ${session.storage.get(SessionKeys.CURRENT_PUBLIC_KEY)}\n\n`;
        formattedText += `Note: These changes are only active for the current session. To make them permanent, you need to update your environment variables.`;
        
        return {
            importedAccounts: backupData.accounts.length,
            totalAccounts: newPublicKeys.length,
            mergedWithExisting: mergeWithExisting,
            defaultAccount: session.storage.get(SessionKeys.CURRENT_PUBLIC_KEY) || '',
            accountAddresses: newPublicKeys,
            formattedText
        };
    } catch (error) {
        console.error('Error importing accounts:', error);
        throw new Error(`Failed to import accounts: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the importAccounts tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function importAccountsHandler(session: SessionContext, args: any): Promise<any> {
    if (!isImportAccountsArgs(args)) {
        return {
            content: [{ type: "text", text: "Invalid arguments provided. The 'backup_data' parameter is required and must be a valid JSON string." }],
            isError: true,
        };
    }
    
    try {
        const results = await performImportAccounts(session, args);
        return {
            structuredContent: {
                importedAccounts: results.importedAccounts,
                totalAccounts: results.totalAccounts,
                mergedWithExisting: results.mergedWithExisting,
                defaultAccount: results.defaultAccount,
                accountAddresses: results.accountAddresses
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

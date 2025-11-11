import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { getNetwork } from "../shared/account.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const CREATE_ACCOUNT: ToolAnnotations = {
    title: "Create Account",
    name: "create_account",
    description: "Create a new COTI account with a randomly generated private key and AES key. Returns the new account address, private key, and AES key.",
    inputSchema: {
        set_as_default: z.boolean().optional().default(false).describe("Optional, whether to set the new account as the default account. Default is false."),
    }
};

/**
 * Validates the arguments for creating a new account
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isCreateAccountArgs(args: unknown): args is { set_as_default?: boolean } {
    return (
        typeof args === "object" &&
        args !== null &&
        (!('set_as_default' in args) || typeof (args as { set_as_default?: boolean }).set_as_default === 'boolean')
    );
}

/**
 * Creates a new COTI account with a randomly generated private key and AES key.
 * @param session The session context
 * @param set_as_default Optional, whether to set the new account as the default account. Default is false.
 * @returns A formatted string with the new account address, private key, and AES key.
 */
export async function performCreateAccount(session: SessionContext, set_as_default: boolean = false): Promise<{
    address: string,
    privateKey: string,
    aesKey: string,
    setAsDefault: boolean,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(session));
        const newWallet = Wallet.createRandom(provider);

        const privateKey = newWallet.privateKey;
        const address = newWallet.address;

        const aesKey = "Fund this account to generate an AES key. Go to https://discord.com/invite/Z4r8D6ez49";

        const publicKeys = (session.storage.get(SessionKeys.PUBLIC_KEYS) || '').split(',').filter(Boolean);
        const privateKeys = (session.storage.get(SessionKeys.PRIVATE_KEYS) || '').split(',').filter(Boolean);
        const aesKeys = (session.storage.get(SessionKeys.AES_KEYS) || '').split(',').filter(Boolean);

        publicKeys.push(address);
        privateKeys.push(privateKey);
        aesKeys.push(aesKey);

        session.storage.set(SessionKeys.PUBLIC_KEYS, publicKeys.join(','));
        session.storage.set(SessionKeys.PRIVATE_KEYS, privateKeys.join(','));
        session.storage.set(SessionKeys.AES_KEYS, aesKeys.join(','));

        if (set_as_default) {
            session.storage.set(SessionKeys.CURRENT_PUBLIC_KEY, address);
        }

        const formattedText = `New COTI account created successfully!\n\n` +
            `Address: ${address}\n\n` +
            `Private Key: ${privateKey}\n\n` +
            `AES Key: ${aesKey}\n\n` +
            `${set_as_default ? 'Set as default account.' : 'Not set as default account.'}`;

        return {
            address,
            privateKey,
            aesKey,
            setAsDefault: set_as_default,
            formattedText
        };
    } catch (error) {
        console.error('Error creating new account:', error);
        throw new Error(`Failed to create new account: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the createAccount tool
 * @param session The session context
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function createAccountHandler(session: SessionContext, args: any): Promise<any> {
    if (!isCreateAccountArgs(args)) {
        throw new Error("Invalid arguments for create_account");
    }
    const set_as_default = args?.set_as_default as boolean | undefined;

    const results = await performCreateAccount(session, set_as_default || false);
    return {
        structuredContent: {
            address: results.address,
            privateKey: results.privateKey,
            aesKey: results.aesKey,
            setAsDefault: results.setAsDefault
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
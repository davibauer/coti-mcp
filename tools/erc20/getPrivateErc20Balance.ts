import { getDefaultProvider, Wallet, Contract, ethers } from '@coti-io/coti-ethers';
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { decryptUint } from '@coti-io/coti-sdk-typescript';
import { getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { z } from "zod";
export const GET_PRIVATE_ERC20_TOKEN_BALANCE: ToolAnnotations = {
    title: "Get Private ERC20 Token Balance",
    name: "get_private_erc20_balance",
    description: "Get the balance of a private ERC20 token on the COTI blockchain. This is used for checking the current balance of a private token for a COTI account. Requires a COTI account address and token contract address as input. Returns the decrypted token balance.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        account_address: z.string().describe("COTI account address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
    },
};

/**
 * Checks if the provided arguments are valid for the getPrivateERC20TokenBalance tool
 * @param args The arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetPrivateERC20TokenBalanceArgs(args: unknown): args is {
    account_address: string;
    token_address: string;
    private_key?: string;
    aes_key?: string;
    network: 'testnet' | 'mainnet';
} {
    if (typeof args !== "object" || args === null) {
        return false;
    }

    const { account_address, token_address } = args as Record<string, unknown>;

    if (typeof account_address !== "string" || typeof token_address !== "string") {
        return false;
    }

    return true;
}

/**
 * Handler for the getPrivateERC20Balance tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC20BalanceHandler(args: any): Promise<any> {
    if (!isGetPrivateERC20TokenBalanceArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc20_balance");
    }
    const { account_address, token_address, network, private_key, aes_key } = args;

    if (!private_key || !aes_key) {
        throw new Error("private_key and aes_key are required");
    }

    try {
        const results = await performGetPrivateERC20TokenBalance(private_key, aes_key, account_address, token_address, network);
        return {
            structuredContent: {
                balance: results.balance,
                decimals: Number(results.decimals),
                symbol: results.symbol,
                name: results.name,
                accountAddress: results.accountAddress,
                tokenAddress: results.tokenAddress
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

/**
 * Gets the balance of a private ERC20 token on the COTI blockchain
 * @param account_address The COTI account address to get the balance for
 * @param token_address The ERC20 token contract address on COTI blockchain
 * @returns An object with the token balance details and formatted text
 */
export async function performGetPrivateERC20TokenBalance(private_key: string, aes_key: string, account_address: string, token_address: string, network: 'testnet' | 'mainnet'): Promise<{
    balance: string,
    decimals: number,
    symbol: string,
    name: string,
    accountAddress: string,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        wallet.setAesKey(aes_key);
        
        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const [nameResult, decimalsResult, symbolResult] = await Promise.all([
            tokenContract.name(),
            tokenContract.decimals(),
            tokenContract.symbol()
        ]);
        
        const encryptedBalance = await tokenContract.balanceOf(account_address);
        
        try {
            const decryptedBalance = decryptUint(encryptedBalance, aes_key);
            const formattedBalance = decryptedBalance ? ethers.formatUnits(decryptedBalance, decimalsResult) : "Unable to decrypt";
            
            const formattedText = `Balance: ${formattedBalance}\nDecimals: ${Number(decimalsResult)}\nSymbol: ${symbolResult}\nName: ${nameResult}`;
            
            return {
                balance: formattedBalance,
                decimals: Number(decimalsResult),
                symbol: symbolResult,
                name: nameResult,
                accountAddress: account_address,
                tokenAddress: token_address,
                formattedText
            };
        } catch (decryptError) {
            console.error('Error decrypting private token balance:', decryptError);
            throw new Error(`Failed to decrypt private token balance: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`);
        }
    } catch (error) {
        console.error('Error fetching private token balance:', error);
        throw new Error(`Failed to get private token balance: ${error instanceof Error ? error.message : String(error)}`);
    }
}
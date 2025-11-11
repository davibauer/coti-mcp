import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const GET_PRIVATE_ERC721_BALANCE: ToolAnnotations = {
    title: "Get Private ERC721 Balance",
    name: "get_private_erc721_balance",
    description:
        "Get the balance of a private ERC721 NFT collection on the COTI blockchain. " +
        "This is used for checking how many NFTs an address owns in a collection. " +
        "Requires token contract address and account address as input. " +
        "Returns the number of NFTs owned by the specified address.",
    inputSchema: {
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        account_address: z.string().describe("COTI account address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
    },
};

/**
 * Checks if the provided arguments are valid for the get_private_erc721_balance tool.
 * @param args The arguments to validate
 * @returns true if the arguments are valid, false otherwise
 */
export function isGetPrivateERC721BalanceArgs(args: unknown): args is { token_address: string, account_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "account_address" in args &&
        typeof (args as { account_address: string }).account_address === "string"
    );
}

/**
 * Handler for the getPrivateERC721Balance tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC721BalanceHandler(session: SessionContext, args: any): Promise<any> {
    if (!isGetPrivateERC721BalanceArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_balance");
    }
    const { token_address, account_address } = args;

    const results = await performGetPrivateERC721Balance(session, token_address, account_address);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            tokenAddress: results.tokenAddress,
            accountAddress: results.accountAddress,
            balance: results.balance
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Gets the balance of a private ERC721 NFT collection for a specific address
 * @param token_address The address of the ERC721 token contract
 * @param account_address The address to check the balance for
 * @returns An object with token balance information and formatted text
 */
export async function performGetPrivateERC721Balance(session: SessionContext, token_address: string, account_address: string): Promise<{
    name: string,
    symbol: string,
    tokenAddress: string,
    accountAddress: string,
    balance: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(session));
        const currentAccountKeys = getCurrentAccountKeys(session);
        
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC721_ABI, wallet);
        
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        
        const balance = await tokenContract.balanceOf(account_address);
        
        const formattedText = `Token: ${name} (${symbol})\nAccount Address: ${account_address}\nBalance: ${balance.toString()} NFT(s)`;
        
        return {
            name,
            symbol,
            tokenAddress: token_address,
            accountAddress: account_address,
            balance: balance.toString(),
            formattedText
        };
    } catch (error) {
        console.error('Error getting private ERC721 balance:', error);
        throw new Error(`Failed to get private ERC721 balance: ${error instanceof Error ? error.message : String(error)}`);
    }
}

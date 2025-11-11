import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Contract, ethers, Wallet } from "@coti-io/coti-ethers";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const GET_PRIVATE_ERC20_TOTAL_SUPPLY: ToolAnnotations = {
    title: "Get Private ERC20 Total Supply",
    name: "get_private_erc20_total_supply",
    description:
        "Get the total supply of tokens for a private ERC20 token on the COTI blockchain. " +
        "This is used for checking how many tokens have been minted in this token. " +
        "Requires token contract address as input. " +
        "Returns the total number of tokens in this contract.",
    inputSchema: {
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
    },
};

/**
 * Checks if the input arguments are valid for the get_private_erc20_total_supply tool
 * @param args The input arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetPrivateERC20TotalSupplyArgs(args: unknown): args is { token_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string"
    );
}

/**
 * Handler for the getPrivateERC20TotalSupply tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC20TotalSupplyHandler(session: SessionContext, args: any): Promise<any> {
    if (!isGetPrivateERC20TotalSupplyArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc20_total_supply");
    }
    const { token_address } = args;

    const results = await performGetPrivateERC20TotalSupply(session, token_address);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            decimals: results.decimals,
            totalSupplyWei: results.totalSupplyWei,
            totalSupplyFormatted: results.totalSupplyFormatted,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Gets the total supply of a private ERC20 token on the COTI blockchain
 * @param token_address The ERC20 token contract address on COTI blockchain
 * @returns An object with total supply details and formatted text
 */
export async function performGetPrivateERC20TotalSupply(session: SessionContext, token_address: string): Promise<{
    name: string,
    symbol: string,
    decimals: number,
    totalSupplyWei: string,
    totalSupplyFormatted: string,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(session));
        const currentAccountKeys = getCurrentAccountKeys(session);
        
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        
        const totalSupply = await tokenContract.totalSupply();
        const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals);
        
        const formattedText = `Collection: ${name} (${symbol})\nTotal Supply (in Wei): ${totalSupply}\nTotal Supply (formatted): ${formattedTotalSupply} (${decimals} decimals)\nToken Address: ${token_address}`;
        
        return {
            name,
            symbol,
            decimals: Number(decimals),
            totalSupplyWei: totalSupply.toString(),
            totalSupplyFormatted: formattedTotalSupply,
            tokenAddress: token_address,
            formattedText
        };
    } catch (error) {
        console.error('Error getting private ERC20 total supply:', error);
        throw new Error(`Failed to get private ERC20 total supply: ${error instanceof Error ? error.message : String(error)}`);
    }
}
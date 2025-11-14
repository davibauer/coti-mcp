import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Contract, ethers } from "@coti-io/coti-ethers";
import { getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { z } from "zod";
export const GET_PRIVATE_ERC20_TOTAL_SUPPLY: ToolAnnotations = {
    title: "Get Private ERC20 Total Supply",
    name: "get_private_erc20_total_supply",
    description:
        "Get the total supply of tokens for a private ERC20 token on the COTI blockchain. " +
        "This is used for checking how many tokens have been minted in this token. " +
        "Requires token contract address as input. " +
        "Returns the total number of tokens in this contract.",
    inputSchema: {
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
    },
};

/**
 * Checks if the input arguments are valid for the get_private_erc20_total_supply tool
 * @param args The input arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetPrivateERC20TotalSupplyArgs(args: unknown): args is { token_address: string, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "network" in args &&
        typeof (args as { network: string }).network === "string"
    );
}

/**
 * Handler for the getPrivateERC20TotalSupply tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC20TotalSupplyHandler(args: any): Promise<any> {
    if (!isGetPrivateERC20TotalSupplyArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc20_total_supply");
    }
    const { token_address, network } = args;

    const results = await performGetPrivateERC20TotalSupply(token_address, network);
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
 * @param network The network to use ('testnet' or 'mainnet')
 * @returns An object with total supply details and formatted text
 */
export async function performGetPrivateERC20TotalSupply(token_address: string, network: 'testnet' | 'mainnet'): Promise<{
    name: string,
    symbol: string,
    decimals: number,
    totalSupplyWei: string,
    totalSupplyFormatted: string,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));

        const tokenContract = new Contract(token_address, ERC20_ABI, provider);

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
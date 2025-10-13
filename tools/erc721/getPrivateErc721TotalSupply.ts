import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { z } from "zod";

export const GET_PRIVATE_ERC721_TOTAL_SUPPLY: ToolAnnotations = {
    title: "Get Private ERC721 Total Supply",
    name: "get_private_erc721_total_supply",
    description:
        "Get the total supply of tokens for a private ERC721 NFT collection on the COTI blockchain. " +
        "This is used for checking how many NFTs have been minted in a collection. " +
        "Requires token contract address as input. " +
        "Returns the total number of tokens in the collection.",
    inputSchema: {
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
    },
};

/**
 * Checks if the input arguments are valid for the get_private_erc721_total_supply tool
 * @param args The input arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetPrivateERC721TotalSupplyArgs(args: unknown): args is { token_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string"
    );
}

/**
 * Handler for the getPrivateERC721TotalSupply tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC721TotalSupplyHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isGetPrivateERC721TotalSupplyArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_total_supply");
    }
    const { token_address } = args;

    const results = await performGetPrivateERC721TotalSupply(token_address);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            totalSupply: results.totalSupply,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Gets the total supply of tokens for a private ERC721 NFT collection
 * @param token_address The address of the ERC721 token contract
 * @returns An object with total supply information and formatted text
 */
export async function performGetPrivateERC721TotalSupply(token_address: string): Promise<{
    name: string,
    symbol: string,
    totalSupply: string,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork());
        const currentAccountKeys = getCurrentAccountKeys();
        
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC721_ABI, wallet);
        
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        
        const totalSupply = await tokenContract.totalSupply();
        
        const formattedText = `Collection: ${name} (${symbol})\nTotal Supply: ${totalSupply.toString()} tokens`;
        
        return {
            name,
            symbol,
            totalSupply: totalSupply.toString(),
            tokenAddress: token_address,
            formattedText
        };
    } catch (error) {
        console.error('Error getting private ERC721 total supply:', error);
        throw new Error(`Failed to get private ERC721 total supply: ${error instanceof Error ? error.message : String(error)}`);
    }
}
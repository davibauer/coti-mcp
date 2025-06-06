import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, CotiNetwork, Wallet, Contract } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { getCurrentAccountKeys } from "../shared/account.js";

export const GET_PRIVATE_ERC721_TOTAL_SUPPLY: Tool = {
    name: "get_private_erc721_total_supply",
    description:
        "Get the total supply of tokens for a private ERC721 NFT collection on the COTI blockchain. " +
        "This is used for checking how many NFTs have been minted in a collection. " +
        "Requires token contract address as input. " +
        "Returns the total number of tokens in the collection.",
    inputSchema: {
        type: "object",
        properties: {
            token_address: {
                type: "string",
                description: "ERC721 token contract address on COTI blockchain",
            },
        },
        required: ["token_address"],
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
export async function getPrivateERC721TotalSupplyHandler(args: Record<string, unknown> | undefined) {
    if (!isGetPrivateERC721TotalSupplyArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_total_supply");
    }
    const { token_address } = args;

    const results = await performGetPrivateERC721TotalSupply(token_address);
    return {
        content: [{ type: "text", text: results }],
        isError: false,
    };
}

/**
 * Gets the total supply of tokens for a private ERC721 NFT collection
 * @param token_address The address of the ERC721 token contract
 * @returns A formatted string with the total supply information
 */
export async function performGetPrivateERC721TotalSupply(token_address: string) {
    try {
        const provider = getDefaultProvider(CotiNetwork.Testnet);
        const currentAccountKeys = getCurrentAccountKeys();
        
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC721_ABI, wallet);
        
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        
        const totalSupply = await tokenContract.totalSupply();
        
        return `Collection: ${name} (${symbol})\nTotal Supply: ${totalSupply.toString()} tokens`;
    } catch (error) {
        console.error('Error getting private ERC721 total supply:', error);
        throw new Error(`Failed to get private ERC721 total supply: ${error instanceof Error ? error.message : String(error)}`);
    }
}
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";
export const GET_PRIVATE_ERC721_TOKEN_OWNER: ToolAnnotations = {
    title: "Get Private ERC721 Token Owner",
    name: "get_private_erc721_token_owner",
    description:
        "Get the owner address of a private ERC721 NFT token on the COTI blockchain. " +
        "This is used for checking who currently owns a specific NFT. " +
        "Requires token contract address and token ID as input. " +
        "Returns the owner's address of the specified NFT.",
    inputSchema: {
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        token_id: z.number().describe("ID of the NFT token to check ownership for"),
    },
};

/**
 * Checks if the provided arguments are valid for the get_private_erc721_token_owner tool.
 * @param args The arguments to validate
 * @returns true if the arguments are valid, false otherwise
 */
export function isGetPrivateERC721TokenOwnerArgs(args: unknown): args is { token_address: string, token_id: number, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "token_id" in args &&
        typeof (args as { token_id: number }).token_id === "number" &&
        "network" in args &&
        typeof (args as { network: string }).network === "string"
    );
}

/**
 * Handler for the getPrivateERC721TokenOwner tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC721TokenOwnerHandler(args: any): Promise<any> {
    if (!isGetPrivateERC721TokenOwnerArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_token_owner");
    }
    const { token_address, token_id, network } = args;

    const results = await performGetPrivateERC721TokenOwner(token_address, token_id, network);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            tokenId: results.tokenId,
            ownerAddress: results.ownerAddress,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Gets the owner address of a private ERC721 NFT token
 * @param token_address The address of the ERC721 token contract
 * @param token_id The ID of the token to check ownership for
 * @returns An object with token owner information and formatted text
 */
export async function performGetPrivateERC721TokenOwner(token_address: string, token_id: number, network: 'testnet' | 'mainnet'): Promise<{
    name: string,
    symbol: string,
    tokenId: number,
    ownerAddress: string,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));

        const tokenContract = new Contract(token_address, ERC721_ABI, provider);

        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();

        const ownerAddress = await tokenContract.ownerOf(token_id);

        const formattedText = `Token: ${name} (${symbol})\nToken ID: ${token_id}\nOwner Address: ${ownerAddress}`;

        return {
            name,
            symbol,
            tokenId: token_id,
            ownerAddress,
            tokenAddress: token_address,
            formattedText
        };
    } catch (error) {
        console.error('Error getting private ERC721 token owner:', error);
        throw new Error(`Failed to get private ERC721 token owner: ${error instanceof Error ? error.message : String(error)}`);
    }
}
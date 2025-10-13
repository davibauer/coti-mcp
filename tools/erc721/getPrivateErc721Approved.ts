import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";

export const GET_PRIVATE_ERC721_APPROVED: ToolAnnotations = {
    title: "Get Private ERC721 Approved",
    name: "get_private_erc721_approved",
    description:
        "Get the approved address for a private ERC721 NFT token on the COTI blockchain. " +
        "This is used for checking which address is currently approved to transfer a specific NFT. " +
        "Requires token contract address and token ID as input. " +
        "Returns the address that is approved to transfer the specified NFT.",
    inputSchema: {
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        token_id: z.string().describe("ID of the NFT token to check approval for"),
    },
};

/**
 * Checks if the provided arguments are valid for the get_private_erc721_approved tool.
 * @param args The arguments to validate
 * @returns true if the arguments are valid, false otherwise
 */
export function isGetPrivateERC721ApprovedArgs(args: unknown): args is { token_address: string, token_id: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "token_id" in args &&
        typeof (args as { token_id: string }).token_id === "string"
    );
}

/**
 * Handler for the getPrivateERC721Approved tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC721ApprovedHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isGetPrivateERC721ApprovedArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_approved");
    }
    const { token_address, token_id } = args;

    const results = await performGetPrivateERC721Approved(token_address, token_id);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            tokenId: results.tokenId,
            owner: results.owner,
            approvedAddress: results.approvedAddress,
            hasApproval: results.hasApproval,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Gets the approved address for a private ERC721 NFT token
 * @param token_address The address of the ERC721 token contract
 * @param token_id The ID of the token to check approval for
 * @returns An object with approval information and formatted text
 */
export async function performGetPrivateERC721Approved(token_address: string, token_id: string): Promise<{
    name: string,
    symbol: string,
    tokenId: string,
    owner: string,
    approvedAddress: string,
    hasApproval: boolean,
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
        
        // Check that the token exists by getting its owner
        const owner = await tokenContract.ownerOf(token_id);
        
        // Get the approved address for the token
        const approved = await tokenContract.getApproved(token_id);
        
        const hasApproval = approved && approved !== "0x0000000000000000000000000000000000000000";
        let approvalStatus = "No address is currently approved to transfer this token.";
        if (hasApproval) {
            approvalStatus = `Approved address: ${approved}`;
        }
        
        const formattedText = `Token: ${name} (${symbol})\nToken ID: ${token_id}\nOwner: ${owner}\n${approvalStatus}`;
        
        return {
            name,
            symbol,
            tokenId: token_id,
            owner,
            approvedAddress: approved || '',
            hasApproval: !!hasApproval,
            tokenAddress: token_address,
            formattedText
        };
    } catch (error) {
        console.error('Error getting private ERC721 approved address:', error);
        throw new Error(`Failed to get private ERC721 approved address: ${error instanceof Error ? error.message : String(error)}`);
    }
}

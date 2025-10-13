import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";

export const GET_PRIVATE_ERC721_IS_APPROVED_FOR_ALL: ToolAnnotations = {
    title: "Get Private ERC721 Is Approved For All",
    name: "get_private_erc721_is_approved_for_all",
    description:
        "Check if an operator is approved to transfer all private ERC721 NFT tokens on the COTI blockchain. " +
        "This is used for checking if an operator has been granted approval to manage all NFTs owned by an address. " +
        "Requires token contract address, owner address, and operator address as input. " +
        "Returns whether the operator is approved for all NFTs.",
    inputSchema: {
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        owner_address: z.string().describe("Address of the token owner"),
        operator_address: z.string().describe("Address of the operator to check approval for"),
    },
};

/**
 * Checks if the provided arguments are valid for the get_private_erc721_is_approved_for_all tool.
 * @param args The arguments to validate
 * @returns true if the arguments are valid, false otherwise
 */
export function isGetPrivateERC721IsApprovedForAllArgs(
    args: unknown
): args is { token_address: string; owner_address: string; operator_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "owner_address" in args &&
        typeof (args as { owner_address: string }).owner_address === "string" &&
        "operator_address" in args &&
        typeof (args as { operator_address: string }).operator_address === "string"
    );
}

/**
 * Handler for the getPrivateERC721IsApprovedForAll tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC721IsApprovedForAllHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isGetPrivateERC721IsApprovedForAllArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_is_approved_for_all");
    }
    const { token_address, owner_address, operator_address } = args;

    const results = await performGetPrivateERC721IsApprovedForAll(token_address, owner_address, operator_address);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            ownerAddress: results.ownerAddress,
            operatorAddress: results.operatorAddress,
            isApprovedForAll: results.isApprovedForAll,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Checks if an operator is approved to transfer all private ERC721 NFT tokens
 * @param token_address The address of the ERC721 token contract
 * @param owner_address The address of the token owner
 * @param operator_address The address of the operator to check approval for
 * @returns An object with approval information and formatted text
 */
export async function performGetPrivateERC721IsApprovedForAll(
    token_address: string,
    owner_address: string,
    operator_address: string
): Promise<{
    name: string,
    symbol: string,
    ownerAddress: string,
    operatorAddress: string,
    isApprovedForAll: boolean,
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
        
        // Check if the operator is approved for all
        const isApproved = await tokenContract.isApprovedForAll(owner_address, operator_address);
        
        const approvalStatus = isApproved
            ? `${operator_address} IS approved to manage all NFTs owned by ${owner_address}.`
            : `${operator_address} is NOT approved to manage all NFTs owned by ${owner_address}.`;
        
        const formattedText = `Token: ${name} (${symbol})\nOwner: ${owner_address}\nOperator: ${operator_address}\nApproval Status: ${approvalStatus}`;
        
        return {
            name,
            symbol,
            ownerAddress: owner_address,
            operatorAddress: operator_address,
            isApprovedForAll: isApproved,
            tokenAddress: token_address,
            formattedText
        };
    } catch (error) {
        console.error('Error checking private ERC721 approval for all:', error);
        throw new Error(`Failed to check private ERC721 approval for all: ${error instanceof Error ? error.message : String(error)}`);
    }
}

import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const SET_PRIVATE_ERC721_APPROVAL_FOR_ALL: ToolAnnotations = {
    title: "Set Private ERC721 Approval For All",
    name: "set_private_erc721_approval_for_all",
    description:
        "Approve or revoke an operator to transfer all private ERC721 NFT tokens on the COTI blockchain. " +
        "This allows the operator to transfer any NFT owned by the caller in this collection. " +
        "Requires token contract address, operator address, and approval status as input. " +
        "Returns the transaction hash upon successful approval setting.",
    inputSchema: {
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        operator_address: z.string().describe("Address to approve as operator, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        approved: z.boolean().describe("Whether to approve (true) or revoke (false) the operator"),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction"),
    },
};

/**
 * Checks if the provided arguments are valid for the set_private_erc721_approval_for_all tool.
 * @param args The arguments to validate
 * @returns true if the arguments are valid, false otherwise
 */
export function isSetPrivateERC721ApprovalForAllArgs(
    args: unknown
): args is { token_address: string; operator_address: string; approved: boolean; gas_limit?: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "operator_address" in args &&
        typeof (args as { operator_address: string }).operator_address === "string" &&
        "approved" in args &&
        typeof (args as { approved: boolean }).approved === "boolean" &&
        (!("gas_limit" in args) || typeof (args as { gas_limit?: string }).gas_limit === "string" || (args as { gas_limit?: string }).gas_limit === undefined)
    );
}

/**
 * Handler for the setPrivateERC721ApprovalForAll tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function setPrivateERC721ApprovalForAllHandler(session: SessionContext, args: any): Promise<any> {
    if (!isSetPrivateERC721ApprovalForAllArgs(args)) {
        throw new Error("Invalid arguments for set_private_erc721_approval_for_all");
    }
    const { token_address, operator_address, approved, gas_limit } = args;

    const results = await performSetPrivateERC721ApprovalForAll(session, token_address, operator_address, approved, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            tokenAddress: results.tokenAddress,
            tokenName: results.tokenName,
            tokenSymbol: results.tokenSymbol,
            operatorAddress: results.operatorAddress,
            approved: results.approved,
            action: results.action,
            owner: results.owner,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Sets approval for an operator to transfer all private ERC721 NFT tokens
 * @param token_address The address of the ERC721 token contract
 * @param operator_address The address to approve as operator
 * @param approved Whether to approve or revoke the operator
 * @param gas_limit Optional gas limit for the transaction
 * @returns An object with transaction information and formatted text
 */
export async function performSetPrivateERC721ApprovalForAll(session: SessionContext, token_address: string,
    operator_address: string,
    approved: boolean,
    gas_limit?: string): Promise<{
    transactionHash: string,
    tokenAddress: string,
    tokenName: string,
    tokenSymbol: string,
    operatorAddress: string,
    approved: boolean,
    action: string,
    owner: string,
    gasLimit?: string,
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
        
        // Prepare transaction options
        const options: { gasLimit?: number } = {};
        if (gas_limit) {
            options.gasLimit = parseInt(gas_limit);
        }
        
        // Execute the setApprovalForAll transaction
        const tx = await tokenContract.setApprovalForAll(operator_address, approved, options);
        const receipt = await tx.wait();
        
        const action = approved ? "approved" : "revoked approval for";
        
        const formattedText = `Successfully ${action} ${operator_address} to manage all your NFTs from ${name} (${symbol}).\nTransaction hash: ${receipt.hash}`;
        
        return {
            transactionHash: receipt.hash,
            tokenAddress: token_address,
            tokenName: name,
            tokenSymbol: symbol,
            operatorAddress: operator_address,
            approved,
            action,
            owner: wallet.address,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error setting private ERC721 approval for all:', error);
        throw new Error(`Failed to set private ERC721 approval for all: ${error instanceof Error ? error.message : String(error)}`);
    }
}

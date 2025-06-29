import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet, CotiNetwork } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";

export const SET_PRIVATE_ERC721_APPROVAL_FOR_ALL: Tool = {
    name: "set_private_erc721_approval_for_all",
    description:
        "Approve or revoke an operator to transfer all private ERC721 NFT tokens on the COTI blockchain. " +
        "This allows the operator to transfer any NFT owned by the caller in this collection. " +
        "Requires token contract address, operator address, and approval status as input. " +
        "Returns the transaction hash upon successful approval setting.",
    inputSchema: {
        type: "object",
        properties: {
            token_address: {
                type: "string",
                description: "ERC721 token contract address on COTI blockchain",
            },
            operator_address: {
                type: "string",
                description: "Address to approve as operator, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273",
            },
            approved: {
                type: "boolean",
                description: "Whether to approve (true) or revoke (false) the operator",
            },
            gas_limit: {
                type: "string",
                description: "Optional gas limit for the transaction",
            },
        },
        required: ["token_address", "operator_address", "approved"],
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
export async function setPrivateERC721ApprovalForAllHandler(args: Record<string, unknown> | undefined) {
    if (!isSetPrivateERC721ApprovalForAllArgs(args)) {
        throw new Error("Invalid arguments for set_private_erc721_approval_for_all");
    }
    const { token_address, operator_address, approved, gas_limit } = args;

    const results = await performSetPrivateERC721ApprovalForAll(token_address, operator_address, approved, gas_limit);
    return {
        content: [{ type: "text", text: results }],
        isError: false,
    };
}

/**
 * Sets approval for an operator to transfer all private ERC721 NFT tokens
 * @param token_address The address of the ERC721 token contract
 * @param operator_address The address to approve as operator
 * @param approved Whether to approve or revoke the operator
 * @param gas_limit Optional gas limit for the transaction
 * @returns A formatted string with the transaction information
 */
export async function performSetPrivateERC721ApprovalForAll(
    token_address: string,
    operator_address: string,
    approved: boolean,
    gas_limit?: string
) {
    try {
        const provider = getDefaultProvider(CotiNetwork.Testnet);
        const currentAccountKeys = getCurrentAccountKeys();
        
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
        
        return `Successfully ${action} ${operator_address} to manage all your NFTs from ${name} (${symbol}).\nTransaction hash: ${receipt.hash}`;
    } catch (error) {
        console.error('Error setting private ERC721 approval for all:', error);
        throw new Error(`Failed to set private ERC721 approval for all: ${error instanceof Error ? error.message : String(error)}`);
    }
}

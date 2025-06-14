import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet, CotiNetwork } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";

export const APPROVE_PRIVATE_ERC721: Tool = {
    name: "approve_private_erc721",
    description:
        "Approve an address to transfer a specific private ERC721 NFT token on the COTI blockchain. " +
        "This allows the approved address to transfer the specified NFT on behalf of the owner. " +
        "Requires token contract address, token ID, and spender address as input. " +
        "Returns the transaction hash upon successful approval.",
    inputSchema: {
        type: "object",
        properties: {
            token_address: {
                type: "string",
                description: "ERC721 token contract address on COTI blockchain",
            },
            token_id: {
                type: "string",
                description: "ID of the NFT token to approve for transfer",
            },
            spender_address: {
                type: "string",
                description: "Address to approve as spender, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273",
            },
            gas_limit: {
                type: "string",
                description: "Optional gas limit for the transaction",
            },
        },
        required: ["token_address", "token_id", "spender_address"],
    },
};

/**
 * Checks if the provided arguments are valid for the approve_private_erc721 tool.
 * @param args The arguments to validate
 * @returns true if the arguments are valid, false otherwise
 */
export function isApprovePrivateERC721Args(
    args: unknown
): args is { token_address: string; token_id: string; spender_address: string; gas_limit?: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "token_id" in args &&
        typeof (args as { token_id: string }).token_id === "string" &&
        "spender_address" in args &&
        typeof (args as { spender_address: string }).spender_address === "string" &&
        (!("gas_limit" in args) || typeof (args as { gas_limit?: string }).gas_limit === "string" || (args as { gas_limit?: string }).gas_limit === undefined)
    );
}

/**
 * Handler for the approvePrivateERC721 tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function approvePrivateERC721Handler(args: Record<string, unknown> | undefined) {
    if (!isApprovePrivateERC721Args(args)) {
        throw new Error("Invalid arguments for approve_private_erc721");
    }
    const { token_address, token_id, spender_address, gas_limit } = args;

    const results = await performApprovePrivateERC721(token_address, token_id, spender_address, gas_limit);
    return {
        content: [{ type: "text", text: results }],
        isError: false,
    };
}

/**
 * Approves an address to transfer a specific private ERC721 NFT token
 * @param token_address The address of the ERC721 token contract
 * @param token_id The ID of the token to approve for transfer
 * @param spender_address The address to approve as spender
 * @param gas_limit Optional gas limit for the transaction
 * @returns A formatted string with the transaction information
 */
export async function performApprovePrivateERC721(
    token_address: string,
    token_id: string,
    spender_address: string,
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
        
        // Check if the current account is the owner of the token
        const owner = await tokenContract.ownerOf(token_id);
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error(`You are not the owner of token ID ${token_id}. The owner is ${owner}.`);
        }
        
        // Prepare transaction options
        const options: { gasLimit?: number } = {};
        if (gas_limit) {
            options.gasLimit = parseInt(gas_limit);
        }
        
        // Execute the approve transaction
        const tx = await tokenContract.approve(spender_address, token_id, options);
        const receipt = await tx.wait();
        
        return `Successfully approved ${spender_address} to transfer NFT token ID ${token_id} from ${name} (${symbol}).\nTransaction hash: ${receipt.hash}`;
    } catch (error) {
        console.error('Error approving private ERC721 token transfer:', error);
        throw new Error(`Failed to approve private ERC721 token transfer: ${error instanceof Error ? error.message : String(error)}`);
    }
}

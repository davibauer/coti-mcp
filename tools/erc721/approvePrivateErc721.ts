import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";
export const APPROVE_PRIVATE_ERC721: ToolAnnotations = {
    title: "Approve Private ERC721",
    name: "approve_private_erc721",
    description:
        "Approve an address to transfer a specific private ERC721 NFT token on the COTI blockchain. " +
        "This allows the approved address to transfer the specified NFT on behalf of the owner. " +
        "Requires token contract address, token ID, and spender address as input. " +
        "Returns the transaction hash upon successful approval.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        token_id: z.number().describe("ID of the NFT token to approve for transfer"),
        spender_address: z.string().describe("Address to approve as spender, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction")
    },
};

/**
 * Checks if the provided arguments are valid for the approve_private_erc721 tool.
 * @param args The arguments to validate
 * @returns true if the arguments are valid, false otherwise
 */
export function isApprovePrivateERC721Args(
    args: unknown
): args is { token_address: string; token_id: number; spender_address: string; gas_limit?: string; private_key?: string; aes_key?: string; network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "token_id" in args &&
        typeof (args as { token_id: number }).token_id === "number" &&
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
export async function approvePrivateERC721Handler(args: any): Promise<any> {
    if (!isApprovePrivateERC721Args(args)) {
        throw new Error("Invalid arguments for approve_private_erc721");
    }
    const { token_address, token_id, spender_address, gas_limit, network, private_key, aes_key } = args;

    if (!private_key || !aes_key) {
        throw new Error("private_key and aes_key are required");
    }

    const results = await performApprovePrivateERC721(private_key, aes_key, token_address, token_id, spender_address, network, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            tokenAddress: results.tokenAddress,
            tokenName: results.tokenName,
            tokenSymbol: results.tokenSymbol,
            tokenId: results.tokenId,
            spenderAddress: results.spenderAddress,
            owner: results.owner,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Approves an address to transfer a specific private ERC721 NFT token
 * @param token_address The address of the ERC721 token contract
 * @param token_id The ID of the token to approve for transfer
 * @param spender_address The address to approve as spender
 * @param gas_limit Optional gas limit for the transaction
 * @returns An object with transaction information and formatted text
 */
export async function performApprovePrivateERC721(private_key: string, aes_key: string, token_address: string,
    token_id: number,
    spender_address: string,
    network: 'testnet' | 'mainnet',
    gas_limit?: string): Promise<{
    transactionHash: string,
    tokenAddress: string,
    tokenName: string,
    tokenSymbol: string,
    tokenId: number,
    spenderAddress: string,
    owner: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);
        wallet.setAesKey(aes_key);
        
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
        
        const formattedText = `Successfully approved ${spender_address} to transfer NFT token ID ${token_id} from ${name} (${symbol}).\nTransaction hash: ${receipt.hash}`;
        
        return {
            transactionHash: receipt.hash,
            tokenAddress: token_address,
            tokenName: name,
            tokenSymbol: symbol,
            tokenId: token_id,
            spenderAddress: spender_address,
            owner: wallet.address,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error approving private ERC721 token transfer:', error);
        throw new Error(`Failed to approve private ERC721 token transfer: ${error instanceof Error ? error.message : String(error)}`);
    }
}

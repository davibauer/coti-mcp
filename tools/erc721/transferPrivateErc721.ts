import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";

export const TRANSFER_PRIVATE_ERC721_TOKEN: ToolAnnotations = {
    title: "Transfer Private ERC721 Token",
    name: "transfer_private_erc721",
    description:
        "Transfer a private ERC721 NFT token on the COTI blockchain. " +
        "This is used for sending a private NFT from your wallet to another address. " +
        "Requires token contract address, recipient address, and token ID as input. " +
        "Returns the transaction hash upon successful transfer.",
    inputSchema: {
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        recipient_address: z.string().describe("Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        token_id: z.string().describe("ID of the NFT token to transfer"),
        from_address: z.string().optional().describe("Optional, address to transfer from. If not provided, the current account will be used."),
        use_safe_transfer: z.boolean().optional().describe("Optional, whether to use safeTransferFrom instead of transferFrom. Default is false."),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction"),
    },
};

/**
 * Checks if the input arguments are valid for the transferPrivateERC721Token tool
 * @param args The input arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isTransferPrivateERC721TokenArgs(args: unknown): args is { token_address: string, recipient_address: string, token_id: string, from_address?: string, use_safe_transfer?: boolean, gas_limit?: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "recipient_address" in args &&
        typeof (args as { recipient_address: string }).recipient_address === "string" &&
        "token_id" in args &&
        typeof (args as { token_id: string }).token_id === "string" &&
        (!("from_address" in args) || typeof (args as { from_address?: string }).from_address === "string" || (args as { from_address?: string }).from_address === undefined) &&
        (!("use_safe_transfer" in args) || typeof (args as { use_safe_transfer?: boolean }).use_safe_transfer === "boolean" || (args as { use_safe_transfer?: boolean }).use_safe_transfer === undefined) &&
        (!("gas_limit" in args) || typeof (args as { gas_limit?: string }).gas_limit === "string" || (args as { gas_limit?: string }).gas_limit === undefined)
    );
}

/**
 * Handler for the transferPrivateERC721 tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function transferPrivateERC721TokenHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isTransferPrivateERC721TokenArgs(args)) {
        throw new Error("Invalid arguments for transfer_private_erc721");
    }
    const { token_address, recipient_address, token_id, from_address, use_safe_transfer = false, gas_limit } = args;

    const results = await performTransferPrivateERC721Token(token_address, recipient_address, token_id, use_safe_transfer, gas_limit, from_address);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            tokenAddress: results.tokenAddress,
            tokenName: results.tokenName,
            tokenSymbol: results.tokenSymbol,
            tokenId: results.tokenId,
            fromAddress: results.fromAddress,
            recipientAddress: results.recipientAddress,
            transferMethod: results.transferMethod,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Transfers a private ERC721 token from the specified account to another address
 * @param token_address The address of the ERC721 token contract
 * @param recipient_address The address of the recipient
 * @param token_id The ID of the token to transfer
 * @param use_safe_transfer Whether to use safeTransferFrom instead of transferFrom
 * @param gas_limit Optional gas limit for the transaction
 * @param from_address Optional address to transfer from. If not provided, the current account will be used
 * @returns An object with transfer details and formatted text
 */
export async function performTransferPrivateERC721Token(token_address: string, recipient_address: string, token_id: string, use_safe_transfer: boolean = false, gas_limit?: string, from_address?: string): Promise<{
    transactionHash: string,
    tokenAddress: string,
    tokenName: string,
    tokenSymbol: string,
    tokenId: string,
    fromAddress: string,
    recipientAddress: string,
    transferMethod: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getCurrentAccountKeys();
        const provider = getDefaultProvider(getNetwork());
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC721_ABI, wallet);
        
        const [symbolResult, nameResult] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name()
        ]);
        
        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }

        // Use the from_address if provided, otherwise use the wallet address
        const fromAddress = from_address || wallet.address;

        let tx;
        if (use_safe_transfer) {
            tx = await tokenContract.safeTransferFrom(fromAddress, recipient_address, token_id, txOptions);
        } else {
            tx = await tokenContract.transferFrom(fromAddress, recipient_address, token_id, txOptions);
        }
        
        const receipt = await tx.wait();
        
        const transferMethod = use_safe_transfer ? 'safeTransferFrom' : 'transferFrom';
        const formattedText = `Private NFT Transfer Successful!\nToken: ${nameResult} (${symbolResult})\nToken ID: ${token_id}\nTransaction Hash: ${receipt?.hash}\nTransfer Method: ${transferMethod}\nFrom: ${fromAddress}\nRecipient: ${recipient_address}`;
        
        return {
            transactionHash: receipt?.hash || '',
            tokenAddress: token_address,
            tokenName: nameResult,
            tokenSymbol: symbolResult,
            tokenId: token_id,
            fromAddress,
            recipientAddress: recipient_address,
            transferMethod,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error transferring private ERC721 token:', error);
        throw new Error(`Failed to transfer private ERC721 token: ${error instanceof Error ? error.message : String(error)}`);
    }
}
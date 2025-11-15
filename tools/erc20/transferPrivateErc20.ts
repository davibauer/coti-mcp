import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet, Contract } from '@coti-io/coti-ethers';
import { buildInputText } from '@coti-io/coti-sdk-typescript';
import { getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { z } from "zod";
/**
 * Tool definition for transferring private ERC20 tokens on the COTI blockchain
 */
export const TRANSFER_PRIVATE_ERC20_TOKEN: ToolAnnotations = {
    name: "transfer_private_erc20",
    description:
        "Transfer private ERC20 tokens on the COTI blockchain. " +
        "This is used for sending private tokens from your wallet to another address. " +
        "Requires token contract address, recipient address, and amount as input. " +
        "Returns the transaction hash upon successful transfer.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
        recipient_address: z.string().describe("Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        amount_wei: z.string().describe("Amount of tokens to transfer (in Wei)"),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction"),
    },
};

/**
 * Type guard for validating transfer private ERC20 token arguments
 * @param args - Arguments to validate
 * @returns True if arguments are valid for transfer private ERC20 token operation
 */
export function isTransferPrivateERC20TokenArgs(args: unknown): args is { token_address: string, recipient_address: string, amount_wei: string, gas_limit?: string , private_key?: string, aes_key?: string, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "recipient_address" in args &&
        typeof (args as { recipient_address: string }).recipient_address === "string" &&
        "amount_wei" in args &&
        (typeof (args as { amount_wei: string }).amount_wei === "string") &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string")
    );
}

/**
 * Handler for the transferPrivateERC20 tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function transferPrivateERC20TokenHandler(args: any): Promise<any> {
    if (!isTransferPrivateERC20TokenArgs(args)) {
        throw new Error("Invalid arguments for transfer_private_erc20");
    }
    const { token_address, recipient_address, amount_wei, gas_limit, network, private_key, aes_key } = args;

    if (!private_key || !aes_key) {
        throw new Error("private_key and aes_key are required");
    }

    const results = await performTransferPrivateERC20Token(private_key, aes_key, token_address, recipient_address, amount_wei, network, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            tokenSymbol: results.tokenSymbol,
            tokenAddress: results.tokenAddress,
            recipientAddress: results.recipientAddress,
            amountWei: results.amountWei,
            transferFunctionSelector: results.transferFunctionSelector,
            sender: results.sender,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Performs a private ERC20 token transfer on the COTI blockchain
 * @param token_address - Address of the ERC20 token contract
 * @param recipient_address - Address of the recipient
 * @param amount_wei - Amount to transfer in Wei
 * @param gas_limit - Optional gas limit for the transaction
 * @returns An object with transfer details and formatted text
 */
export async function performTransferPrivateERC20Token(private_key: string, aes_key: string, token_address: string, recipient_address: string, amount_wei: string, network: 'testnet' | 'mainnet', gas_limit?: string): Promise<{
    transactionHash: string,
    tokenSymbol: string,
    tokenAddress: string,
    recipientAddress: string,
    amountWei: string,
    transferFunctionSelector: string,
    sender: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);
        
        wallet.setAesKey(aes_key);

        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const symbolResult = await tokenContract.symbol();
        
        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }

        const transferSelector = tokenContract.transfer.fragment.selector;

        const encryptedInputText = buildInputText(BigInt(amount_wei), 
        { wallet: wallet, userKey: aes_key }, token_address, transferSelector);

        const tx = await tokenContract.transfer(recipient_address, encryptedInputText, txOptions);
        
        const receipt = await tx.wait();

        const formattedText = `Private Token Transfer Successful!\nToken: ${symbolResult}\nTransaction Hash: ${receipt?.hash}\nAmount in Wei: ${amount_wei}\nRecipient: ${recipient_address}\nTransfer Function Selector: ${transferSelector}`;
        
        return {
            transactionHash: receipt?.hash || '',
            tokenSymbol: symbolResult,
            tokenAddress: token_address,
            recipientAddress: recipient_address,
            amountWei: amount_wei,
            transferFunctionSelector: transferSelector,
            sender: wallet.address,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error transferring private ERC20 tokens:', error);
        throw new Error(`Failed to transfer private ERC20 tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
}

import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet, Contract } from '@coti-io/coti-ethers';
import { buildInputText } from '@coti-io/coti-sdk-typescript';
import { getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { z } from "zod";
/**
 * Tool definition for approving a spender to use ERC20 tokens on the COTI blockchain
 */
export const APPROVE_ERC20_SPENDER: ToolAnnotations = {
    title: "Approve ERC20 Spender",
    name: "approve_erc20_spender",
    description:
        "Approve another address to spend tokens on behalf of the owner. " +
        "This is used for allowing another address (like a contract) to transfer your tokens. " +
        "Requires token contract address, spender address, and amount as input. " +
        "Returns the transaction hash upon successful approval.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
        spender_address: z.string().describe("Address to approve as spender, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273"),
        amount_wei: z.string().describe("Amount of tokens to approve (in Wei)"),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction"),
    },
};

/**
 * Type guard for validating approve ERC20 spender arguments
 * @param args - Arguments to validate
 * @returns True if arguments are valid for approve ERC20 spender operation
 */
export function isApproveERC20SpenderArgs(args: unknown): args is { token_address: string, spender_address: string, amount_wei: string, gas_limit?: string , private_key?: string, aes_key?: string, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "spender_address" in args &&
        typeof (args as { spender_address: string }).spender_address === "string" &&
        "amount_wei" in args &&
        (typeof (args as { amount_wei: string }).amount_wei === "string") &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string")
    );
}

/**
 * Handler for the approveERC20Spender tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function approveERC20SpenderHandler(args: any): Promise<any> {
    if (!isApproveERC20SpenderArgs(args)) {
        throw new Error("Invalid arguments for approve_erc20_spender");
    }
    const { token_address, spender_address, amount_wei, gas_limit, network, private_key, aes_key } = args;

    if (!private_key || !aes_key) {
        throw new Error("private_key and aes_key are required");
    }

    const amount_wei_string = String(amount_wei);
    const results = await performApproveERC20Spender(private_key, aes_key, token_address, spender_address, amount_wei_string, network, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            tokenSymbol: results.tokenSymbol,
            tokenAddress: results.tokenAddress,
            spenderAddress: results.spenderAddress,
            amountWei: results.amountWei,
            approveFunctionSelector: results.approveFunctionSelector,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Performs an approval for an ERC20 token spender on the COTI blockchain
 * @param token_address - Address of the ERC20 token contract
 * @param spender_address - Address of the spender to approve
 * @param amount_wei - Amount to approve in Wei
 * @param gas_limit - Optional gas limit for the transaction
 * @returns An object with approval details and formatted text
 */
export async function performApproveERC20Spender(private_key: string, aes_key: string, token_address: string, spender_address: string, amount_wei: string, network: 'testnet' | 'mainnet', gas_limit?: string): Promise<{
    transactionHash: string,
    tokenSymbol: string,
    tokenAddress: string,
    spenderAddress: string,
    amountWei: string,
    approveFunctionSelector: string,
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

        const approveSelector = tokenContract.approve.fragment.selector;

        const encryptedInputText = buildInputText(BigInt(amount_wei), 
        { wallet: wallet, userKey: aes_key }, token_address, approveSelector);

        const tx = await tokenContract.approve(spender_address, encryptedInputText, txOptions);
        
        const receipt = await tx.wait();

        const formattedText = `ERC20 Approval Successful!\nToken: ${symbolResult}\nTransaction Hash: ${receipt?.hash}\nAmount in Wei: ${amount_wei}\nSpender: ${spender_address}\nApprove Function Selector: ${approveSelector}`;
        
        return {
            transactionHash: receipt?.hash || '',
            tokenSymbol: symbolResult,
            tokenAddress: token_address,
            spenderAddress: spender_address,
            amountWei: amount_wei,
            approveFunctionSelector: approveSelector,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error approving ERC20 spender:', error);
        throw new Error(`Failed to approve ERC20 spender: ${error instanceof Error ? error.message : String(error)}`);
    }
}

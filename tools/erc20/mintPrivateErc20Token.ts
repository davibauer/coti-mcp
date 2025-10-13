import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Contract, Wallet } from "@coti-io/coti-ethers";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { z } from "zod";

export const MINT_PRIVATE_ERC20_TOKEN: ToolAnnotations = {
    title: "Mint Private ERC20 Token",
    name: "mint_private_erc20_token",
    description:
        "Mint additional private ERC20 tokens on the COTI blockchain. " +
        "This adds new tokens to the specified recipient address. " +
        "Returns the transaction hash upon successful minting.",
    inputSchema: {
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
        recipient_address: z.string().describe("Address to receive the minted tokens"),
        amount_wei: z.string().describe("Amount of tokens to mint in wei (smallest unit)"),
        gas_limit: z.string().optional().describe("Optional gas limit for the minting transaction"),
    },
};

/**
 * Checks if the provided arguments are valid for minting private ERC20 tokens.
 * @param args The arguments to validate.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isMintPrivateERC20TokenArgs(args: unknown): args is { token_address: string, recipient_address: string, amount_wei: string, gas_limit?: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "recipient_address" in args &&
        typeof (args as { recipient_address: string }).recipient_address === "string" &&
        "amount_wei" in args &&
        typeof (args as { amount_wei: string }).amount_wei === "string" &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string")
    );
}

/**
 * Handler for the mintPrivateERC20Token tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function mintPrivateERC20TokenHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isMintPrivateERC20TokenArgs(args)) {
        throw new Error("Invalid arguments for mint_private_erc20_token");
    }
    const { token_address, recipient_address, amount_wei, gas_limit } = args;

    const results = await performMintPrivateERC20Token(token_address, recipient_address, amount_wei, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            tokenAddress: results.tokenAddress,
            recipientAddress: results.recipientAddress,
            amountWei: results.amountWei,
            minter: results.minter,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Performs the minting of private ERC20 tokens.
 * @param token_address The address of the ERC20 token contract.
 * @param recipient_address The address of the recipient.
 * @param amount_wei The amount of tokens to mint in wei.
 * @param gas_limit The gas limit for the transaction.
 * @returns An object with minting details and formatted text.
 */
export async function performMintPrivateERC20Token(token_address: string, recipient_address: string, amount_wei: string, gas_limit?: string): Promise<{
    transactionHash: string,
    tokenAddress: string,
    recipientAddress: string,
    amountWei: string,
    minter: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getCurrentAccountKeys();
        const provider = getDefaultProvider(getNetwork());
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }
        
        const mintTx = await tokenContract.mint(recipient_address, BigInt(amount_wei), txOptions);

        const receipt = await mintTx.wait();
        
        const formattedText = `ERC20 Token Minting Successful!\nToken Address: ${token_address}\nRecipient: ${recipient_address}\nAmount: ${amount_wei}\nTransaction Hash: ${receipt.hash}`;
        
        return {
            transactionHash: receipt.hash,
            tokenAddress: token_address,
            recipientAddress: recipient_address,
            amountWei: amount_wei,
            minter: wallet.address,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error minting private ERC20 token:', error);
        throw new Error(`Failed to mint private ERC20 token: ${error instanceof Error ? error.message : String(error)}`);
    }
}
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet, Contract, ethers } from '@coti-io/coti-ethers';
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { decryptUint } from "@coti-io/coti-sdk-typescript";
import { z } from "zod";

/**
 * Tool definition for checking ERC20 token allowance on the COTI blockchain
 */
export const GET_ERC20_ALLOWANCE: ToolAnnotations = {
    title: "Get ERC20 Allowance",
    name: "get_erc20_allowance",
    description:
        "Check how many tokens a spender is allowed to use. " +
        "This is used for checking the current allowance a spender has for an owner's tokens. " +
        "Requires token contract address, owner address, and spender address as input. " +
        "Returns the allowance amount.",
    inputSchema: {
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
        owner_address: z.string().describe("Address of the token owner"),
        spender_address: z.string().describe("Address of the spender to check allowance for"),
    },
};

/**
 * Type guard for validating get ERC20 allowance arguments
 * @param args - Arguments to validate
 * @returns True if arguments are valid for get ERC20 allowance operation
 */
export function isGetERC20AllowanceArgs(args: unknown): args is { token_address: string, owner_address: string, spender_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "owner_address" in args &&
        typeof (args as { owner_address: string }).owner_address === "string" &&
        "spender_address" in args &&
        typeof (args as { spender_address: string }).spender_address === "string"
    );
}

/**
 * Handler for the getERC20Allowance tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getERC20AllowanceHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isGetERC20AllowanceArgs(args)) {
        throw new Error("Invalid arguments for get_erc20_allowance");
    }
    const { token_address, owner_address, spender_address } = args;

    const results = await performGetERC20Allowance(token_address, owner_address, spender_address);
    return {
        structuredContent: {
            tokenSymbol: results.tokenSymbol,
            decimals: results.decimals,
            ownerAddress: results.ownerAddress,
            spenderAddress: results.spenderAddress,
            allowance: results.allowance,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Retrieves the allowance for an ERC20 token spender on the COTI blockchain
 * @param token_address - Address of the ERC20 token contract
 * @param owner_address - Address of the token owner
 * @param spender_address - Address of the spender to check allowance for
 * @returns An object with allowance details and formatted text
 */
export async function performGetERC20Allowance(token_address: string, owner_address: string, spender_address: string): Promise<{
    tokenSymbol: string,
    decimals: number,
    ownerAddress: string,
    spenderAddress: string,
    allowance: string,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getCurrentAccountKeys();
        const provider = getDefaultProvider(getNetwork());
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        wallet.setAesKey(currentAccountKeys.aesKey);

        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const symbolResult = await tokenContract.symbol();
        const decimalsResult = await tokenContract.decimals();
        
        const allowanceResult = await tokenContract.allowance(owner_address, spender_address);
        const decryptedAllowance = decryptUint(allowanceResult, currentAccountKeys.aesKey);
        const formattedAllowance = decryptedAllowance ? ethers.formatUnits(decryptedAllowance, decimalsResult) : "Unable to decrypt";
        
        const formattedText = `ERC20 Token Allowance:\nToken: ${symbolResult}\nOwner: ${owner_address}\nSpender: ${spender_address}\nAllowance: ${formattedAllowance}`;
        
        return {
            tokenSymbol: symbolResult,
            decimals: Number(decimalsResult),
            ownerAddress: owner_address,
            spenderAddress: spender_address,
            allowance: formattedAllowance,
            tokenAddress: token_address,    
            formattedText
        };
    } catch (error) {
        console.error('Error getting ERC20 allowance:', error);
        throw new Error(`Failed to get ERC20 allowance: ${error instanceof Error ? error.message : String(error)}`);
    }
}

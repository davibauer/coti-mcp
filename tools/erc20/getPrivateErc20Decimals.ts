import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { z } from "zod";

export const GET_PRIVATE_ERC20_DECIMALS: ToolAnnotations = {
    title: "Get Private ERC20 Decimals",
    name: "get_private_erc20_decimals",
    description:
        "Get the number of decimals for a private ERC20 token on the COTI blockchain. " +
        "This is used for checking the number of decimals in this token. " +
        "Requires token contract address as input. " +
        "Returns the number of decimals in this contract.",
    inputSchema: {
        token_address: z.string().describe("ERC20 token contract address on COTI blockchain"),
    },
};

/**
 * Checks if the provided arguments are valid for the getPrivateERC20Decimals tool
 * @param args The arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetPrivateERC20DecimalsArgs(args: unknown): args is { token_address: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string"
    );
}

/**
 * Handler for the getPrivateERC20Decimals tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC20DecimalsHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isGetPrivateERC20DecimalsArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc20_decimals");
    }
    const { token_address } = args;

    const results = await performGetPrivateERC20Decimals(token_address);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            decimals: results.decimals,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Performs the getPrivateERC20Decimals tool
 * @param token_address The token contract address
 * @returns An object with decimals information and formatted text
 */
export async function performGetPrivateERC20Decimals(token_address: string): Promise<{
    name: string,
    symbol: string,
    decimals: number,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork());
        const currentAccountKeys = getCurrentAccountKeys();
        
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const decimals = await tokenContract.decimals();
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        
        const formattedText = `Collection: ${name} (${symbol})\nDecimals: ${decimals}\nToken Address: ${token_address}`;
        
        return {
            name,
            symbol,
           decimals: Number(decimals),
            tokenAddress: token_address,
            formattedText
        };
    } catch (error) {
        console.error('Error getting private ERC20 decimals:', error);
        throw new Error(`Failed to get private ERC20 decimals: ${error instanceof Error ? error.message : String(error)}`);
    }
}
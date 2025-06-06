import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { CotiNetwork, getDefaultProvider, Wallet, Contract, ethers } from '@coti-io/coti-ethers';
import { getCurrentAccountKeys } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";
import { decryptUint } from "@coti-io/coti-sdk-typescript";

/**
 * Tool definition for checking ERC20 token allowance on the COTI blockchain
 */
export const GET_ERC20_ALLOWANCE: Tool = {
    name: "get_erc20_allowance",
    description:
        "Check how many tokens a spender is allowed to use. " +
        "This is used for checking the current allowance a spender has for an owner's tokens. " +
        "Requires token contract address, owner address, and spender address as input. " +
        "Returns the allowance amount.",
    inputSchema: {
        type: "object",
        properties: {
            token_address: {
                type: "string",
                description: "ERC20 token contract address on COTI blockchain",
            },
            owner_address: {
                type: "string",
                description: "Address of the token owner",
            },
            spender_address: {
                type: "string",
                description: "Address of the spender to check allowance for",
            },
        },
        required: ["token_address", "owner_address", "spender_address"],
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
export async function getERC20AllowanceHandler(args: Record<string, unknown> | undefined) {
    if (!isGetERC20AllowanceArgs(args)) {
        throw new Error("Invalid arguments for get_erc20_allowance");
    }
    const { token_address, owner_address, spender_address } = args;

    const results = await performGetERC20Allowance(token_address, owner_address, spender_address);
    return {
        content: [{ type: "text", text: results }],
        isError: false,
    };
}

/**
 * Retrieves the allowance for an ERC20 token spender on the COTI blockchain
 * @param token_address - Address of the ERC20 token contract
 * @param owner_address - Address of the token owner
 * @param spender_address - Address of the spender to check allowance for
 * @returns A formatted message with the allowance details
 */
export async function performGetERC20Allowance(token_address: string, owner_address: string, spender_address: string) {
    try {
        const currentAccountKeys = getCurrentAccountKeys();
        const provider = getDefaultProvider(CotiNetwork.Testnet);
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        wallet.setAesKey(currentAccountKeys.aesKey);

        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const symbolResult = await tokenContract.symbol();
        const decimalsResult = await tokenContract.decimals();
        
        const allowanceResult = await tokenContract.allowance(owner_address, spender_address);
        const decryptedAllowance = decryptUint(allowanceResult, currentAccountKeys.aesKey);
        const formattedAllowance = decryptedAllowance ? ethers.formatUnits(decryptedAllowance, decimalsResult) : "Unable to decrypt";
        
        return `ERC20 Token Allowance:\nToken: ${symbolResult}\nOwner: ${owner_address}\nSpender: ${spender_address}\nAllowance: ${formattedAllowance}`;
    } catch (error) {
        console.error('Error getting ERC20 allowance:', error);
        throw new Error(`Failed to get ERC20 allowance: ${error instanceof Error ? error.message : String(error)}`);
    }
}

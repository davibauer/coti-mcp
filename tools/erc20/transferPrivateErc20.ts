import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { CotiNetwork, getDefaultProvider, Wallet, Contract } from '@coti-io/coti-ethers';
import { buildInputText } from '@coti-io/coti-sdk-typescript';
import { getCurrentAccountKeys } from "../shared/account.js";
import { ERC20_ABI } from "../constants/abis.js";

/**
 * Tool definition for transferring private ERC20 tokens on the COTI blockchain
 */
export const TRANSFER_PRIVATE_ERC20_TOKEN: Tool = {
    name: "transfer_private_erc20",
    description:
        "Transfer private ERC20 tokens on the COTI blockchain. " +
        "This is used for sending private tokens from your wallet to another address. " +
        "Requires token contract address, recipient address, and amount as input. " +
        "Returns the transaction hash upon successful transfer.",
    inputSchema: {
        type: "object",
        properties: {
            token_address: {
                type: "string",
                description: "ERC20 token contract address on COTI blockchain",
            },
            recipient_address: {
                type: "string",
                description: "Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273",
            },
            amount_wei: {
                type: "string",
                description: "Amount of tokens to transfer (in Wei)",
            },
            gas_limit: {
                type: "string",
                description: "Optional gas limit for the transaction",
            },
        },
        required: ["token_address", "recipient_address", "amount_wei"],
    },
};

/**
 * Type guard for validating transfer private ERC20 token arguments
 * @param args - Arguments to validate
 * @returns True if arguments are valid for transfer private ERC20 token operation
 */
export function isTransferPrivateERC20TokenArgs(args: unknown): args is { token_address: string, recipient_address: string, amount_wei: string, gas_limit?: string } {
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
 * Handler for the transferPrivateERC20 tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function transferPrivateERC20TokenHandler(args: Record<string, unknown> | undefined) {
    if (!isTransferPrivateERC20TokenArgs(args)) {
        throw new Error("Invalid arguments for transfer_private_erc20");
    }
    const { token_address, recipient_address, amount_wei, gas_limit } = args;

    const results = await performTransferPrivateERC20Token(token_address, recipient_address, amount_wei, gas_limit);
    return {
        content: [{ type: "text", text: results }],
        isError: false,
    };
}

/**
 * Performs a private ERC20 token transfer on the COTI blockchain
 * @param token_address - Address of the ERC20 token contract
 * @param recipient_address - Address of the recipient
 * @param amount_wei - Amount to transfer in Wei
 * @param gas_limit - Optional gas limit for the transaction
 * @returns A formatted success message with transaction details
 */
export async function performTransferPrivateERC20Token(token_address: string, recipient_address: string, amount_wei: string, gas_limit?: string) {
    try {
        const currentAccountKeys = getCurrentAccountKeys();
        const provider = getDefaultProvider(CotiNetwork.Testnet);
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        wallet.setAesKey(currentAccountKeys.aesKey);

        const tokenContract = new Contract(token_address, ERC20_ABI, wallet);
        
        const symbolResult = await tokenContract.symbol();
        
        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }

        const transferSelector = tokenContract.transfer.fragment.selector;

        const encryptedInputText = buildInputText(BigInt(amount_wei), 
        { wallet: wallet, userKey: currentAccountKeys.aesKey }, token_address, transferSelector);

        const tx = await tokenContract.transfer(recipient_address, encryptedInputText, txOptions);
        
        const receipt = await tx.wait();

        return `Private Token Transfer Successful!\nToken: ${symbolResult}\nTransaction Hash: ${receipt?.hash}\nAmount in Wei: ${amount_wei}\nRecipient: ${recipient_address}\nTransfer Function Selector: ${transferSelector}`;
    } catch (error) {
        console.error('Error transferring private ERC20 tokens:', error);
        throw new Error(`Failed to transfer private ERC20 tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
}

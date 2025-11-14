import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { buildStringInputText } from "@coti-io/coti-sdk-typescript";
import { ERC721_ABI } from "../constants/abis.js";
import { getNetwork } from "../shared/account.js";
import { z } from "zod";
export const MINT_PRIVATE_ERC721_TOKEN: ToolAnnotations = {
    title: "Mint Private ERC721 Token",
    name: "mint_private_erc721_token",
    description:
        "Mint a new private ERC721 NFT token on the COTI blockchain. " +
        "This creates a new NFT in the specified collection with the provided token URI. " +
        "Returns the transaction hash and token ID upon successful minting.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        to_address: z.string().describe("Address to receive the minted NFT"),
        token_uri: z.string().describe("URI for the token metadata (can be IPFS URI or any other URI), Example: \"https://example.com/token/0\""),
        gas_limit: z.string().optional().describe("Optional gas limit for the minting transaction"),
    },
};

/**
 * Checks if the provided arguments are valid for minting a private ERC721 token.
 * @param args The arguments to validate.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isMintPrivateERC721TokenArgs(args: unknown): args is { token_address: string, to_address: string, token_uri: string, gas_limit?: string , private_key?: string, aes_key?: string, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "to_address" in args &&
        typeof (args as { to_address: string }).to_address === "string" &&
        "token_uri" in args &&
        typeof (args as { token_uri: string }).token_uri === "string" &&
        (!("gas_limit" in args) || ("gas_limit" in args && typeof (args as { gas_limit: string }).gas_limit === "string"))
    );
}

/**
 * Handler for the mintPrivateERC721Token tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function mintPrivateERC721TokenHandler(args: any): Promise<any> {
    if (!isMintPrivateERC721TokenArgs(args)) {
        throw new Error("Invalid arguments for mint_private_erc721_token");
    }
    const { token_address, to_address, token_uri, gas_limit, network, private_key, aes_key } = args;

    if (!private_key || !aes_key) {
        throw new Error("private_key and aes_key are required");
    }

    const results = await performMintPrivateERC721Token(private_key, aes_key, token_address, to_address, token_uri, network, gas_limit);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            tokenAddress: results.tokenAddress,
            toAddress: results.toAddress,
            tokenUri: results.tokenUri,
            tokenId: results.tokenId,
            minter: results.minter,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Performs the minting of a private ERC721 token.
 * @param token_address The address of the ERC721 token contract.
 * @param to_address The address to receive the minted NFT.
 * @param token_uri The URI for the token metadata (can be IPFS URI or any other URI).
 * @param gas_limit Optional gas limit for the minting transaction.
 * @returns An object with minting details and formatted text.
 */
export async function performMintPrivateERC721Token(private_key: string, aes_key: string, token_address: string, to_address: string, token_uri: string, network: 'testnet' | 'mainnet', gas_limit?: string): Promise<{
    transactionHash: string,
    tokenAddress: string,
    toAddress: string,
    tokenUri: string,
    tokenId: string,
    minter: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);
        
        wallet.setAesKey(aes_key);
        
        const tokenContract = new Contract(token_address, ERC721_ABI, wallet);
        
        const mintSelector = tokenContract.mint.fragment.selector;
        
        const encryptedInputText = buildStringInputText(token_uri, { wallet: wallet, userKey: aes_key }, token_address, mintSelector);
        
        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }
        
        const mintTx = await tokenContract.mint(to_address, encryptedInputText, txOptions);
        const receipt = await mintTx.wait();
        
        let tokenId = "Unknown";
        if (receipt && receipt.logs && receipt.logs.length > 0) {
            const transferEvent = receipt.logs[0];
            if (transferEvent && transferEvent.topics && transferEvent.topics.length > 3) {
                tokenId = BigInt(transferEvent.topics[3]).toString();
            }
        }
        
        const formattedText = `NFT Minting Successful!\nTo Address: ${to_address}\nToken Address: ${token_address}\nToken URI: ${token_uri}\nToken ID: ${tokenId}\nTransaction Hash: ${receipt.hash}`;
        
        return {
            transactionHash: receipt.hash,
            tokenAddress: token_address,
            toAddress: to_address,
            tokenUri: token_uri,
            tokenId,
            minter: wallet.address,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error minting private ERC721 token:', error);
        throw new Error(`Failed to mint private ERC721 token: ${error instanceof Error ? error.message : String(error)}`);
    }
}
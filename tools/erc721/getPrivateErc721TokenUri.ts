import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";
export const GET_PRIVATE_ERC721_TOKEN_URI: ToolAnnotations = {
    title: "Get Private ERC721 Token URI",
    name: "get_private_erc721_token_uri",
    description:
        "Get the tokenURI for a private ERC721 NFT token on the COTI blockchain. " +
        "This is used for retrieving the metadata URI of a private NFT. " +
        "Requires token contract address and token ID as input. " +
        "Returns the decrypted tokenURI.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        token_id: z.number().describe("ID of the NFT token to get the URI for"),
    },
};

/**
 * Type guard for validating get private ERC721 token URI arguments
 * @param args - Arguments to validate
 * @returns True if arguments are valid for get private ERC721 token URI operation
 */
export function isGetPrivateERC721TokenURIArgs(args: unknown): args is { private_key: string, token_address: string, token_id: number, aes_key: string, network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "token_id" in args &&
        typeof (args as { token_id: number }).token_id === "number"
    );
}

/**
 * Handler for the getPrivateERC721TokenURI tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC721TokenURIHandler(args: any): Promise<any> {
    if (!isGetPrivateERC721TokenURIArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_token_uri");
    }
    const { private_key, token_address, token_id, network, aes_key } = args;

    const results = await performGetPrivateERC721TokenURI(private_key, aes_key, token_address, token_id, network);
    return {
        structuredContent: {
            name: results.name,
            symbol: results.symbol,
            tokenId: results.tokenId,
            tokenURI: results.tokenURI,
            decryptionSuccess: results.decryptionSuccess,
            tokenAddress: results.tokenAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Gets the tokenURI for a private ERC721 NFT token on the COTI blockchain
 * @param token_address The address of the ERC721 token contract
 * @param token_id The ID of the token to get the URI for
 * @returns An object with token URI information and formatted text
 */
export async function performGetPrivateERC721TokenURI(private_key: string, aes_key: string, token_address: string, token_id: number, network: 'testnet' | 'mainnet'): Promise<{
    name: string,
    symbol: string,
    tokenId: number,
    tokenURI: string,
    decryptionSuccess: boolean,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);
        
        wallet.setAesKey(aes_key);
        
        const tokenContract = new Contract(token_address, ERC721_ABI, wallet);
        
        const [symbolResult, nameResult] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name()
        ]);
        
        const encryptedTokenURI = await tokenContract.tokenURI(BigInt(token_id));

        let tokenURI;
        let decryptionSuccess = false;
        try {
            tokenURI = await wallet.decryptValue(encryptedTokenURI);
            decryptionSuccess = true;
        } catch (decryptError) {
            tokenURI = `Decryption failed: ${decryptError}`;
        }
        
        const formattedText = `Token: ${nameResult} (${symbolResult})\nToken ID: ${token_id}\nDecrypted Token URI: ${tokenURI}`;
        
        return {
            name: nameResult,
            symbol: symbolResult,
            tokenId: token_id,
            tokenURI: tokenURI.toString(),
            decryptionSuccess,
            tokenAddress: token_address,
            formattedText
        };
    } catch (error) {
        throw new Error(`Failed to get private ERC721 token URI: ${error instanceof Error ? error.message : String(error)}`);
    }
}

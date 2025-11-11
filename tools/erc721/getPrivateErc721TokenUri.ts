import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { Contract, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const GET_PRIVATE_ERC721_TOKEN_URI: ToolAnnotations = {
    title: "Get Private ERC721 Token URI",
    name: "get_private_erc721_token_uri",
    description:
        "Get the tokenURI for a private ERC721 NFT token on the COTI blockchain. " +
        "This is used for retrieving the metadata URI of a private NFT. " +
        "Requires token contract address and token ID as input. " +
        "Returns the decrypted tokenURI.",
    inputSchema: {
        token_address: z.string().describe("ERC721 token contract address on COTI blockchain"),
        token_id: z.string().describe("ID of the NFT token to get the URI for"),
    },
};

/**
 * Type guard for validating get private ERC721 token URI arguments
 * @param args - Arguments to validate
 * @returns True if arguments are valid for get private ERC721 token URI operation
 */
export function isGetPrivateERC721TokenURIArgs(args: unknown): args is { token_address: string, token_id: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "token_address" in args &&
        typeof (args as { token_address: string }).token_address === "string" &&
        "token_id" in args &&
        typeof (args as { token_id: string }).token_id === "string"
    );
}

/**
 * Handler for the getPrivateERC721TokenURI tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getPrivateERC721TokenURIHandler(session: SessionContext, args: any): Promise<any> {
    if (!isGetPrivateERC721TokenURIArgs(args)) {
        throw new Error("Invalid arguments for get_private_erc721_token_uri");
    }
    const { token_address, token_id } = args;

    const results = await performGetPrivateERC721TokenURI(session, token_address, token_id);
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
export async function performGetPrivateERC721TokenURI(session: SessionContext, token_address: string, token_id: string): Promise<{
    name: string,
    symbol: string,
    tokenId: string,
    tokenURI: string,
    decryptionSuccess: boolean,
    tokenAddress: string,
    formattedText: string
}> {
    try {
        const currentAccountKeys = getCurrentAccountKeys(session);
        const provider = getDefaultProvider(getNetwork(session));
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        wallet.setAesKey(currentAccountKeys.aesKey);
        
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

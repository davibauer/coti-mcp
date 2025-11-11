import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { buildStringInputText } from "@coti-io/coti-sdk-typescript";
import { ERC721_ABI } from "../constants/abis.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const MINT_PRIVATE_ERC721_TOKEN: ToolAnnotations = {
    title: "Mint Private ERC721 Token",
    name: "mint_private_erc721_token",
    description:
        "Mint a new private ERC721 NFT token on the COTI blockchain. " +
        "This creates a new NFT in the specified collection with the provided token URI. " +
        "Returns the transaction hash and token ID upon successful minting.",
    inputSchema: {
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
export function isMintPrivateERC721TokenArgs(args: unknown): args is { token_address: string, to_address: string, token_uri: string, gas_limit?: string } {
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
export async function mintPrivateERC721TokenHandler(session: SessionContext, args: any): Promise<any> {
    if (!isMintPrivateERC721TokenArgs(args)) {
        throw new Error("Invalid arguments for mint_private_erc721_token");
    }
    const { token_address, to_address, token_uri, gas_limit } = args;

    const results = await performMintPrivateERC721Token(session, token_address, to_address, token_uri, gas_limit);
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
export async function performMintPrivateERC721Token(session: SessionContext, token_address: string, to_address: string, token_uri: string, gas_limit?: string): Promise<{
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
        const currentAccountKeys = getCurrentAccountKeys(session);
        const provider = getDefaultProvider(getNetwork(session));
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        
        wallet.setAesKey(currentAccountKeys.aesKey);
        
        const tokenContract = new Contract(token_address, ERC721_ABI, wallet);
        
        const mintSelector = tokenContract.mint.fragment.selector;
        
        const encryptedInputText = buildStringInputText(token_uri, { wallet: wallet, userKey: currentAccountKeys.aesKey }, token_address, mintSelector);
        
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
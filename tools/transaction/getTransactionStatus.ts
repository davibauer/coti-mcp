import { ethers, getDefaultProvider } from "@coti-io/coti-ethers";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const GET_TRANSACTION_STATUS: ToolAnnotations = {
    title: "Get Transaction Status",
    name: "get_transaction_status",
    description:
        "Get the status of a transaction on the COTI blockchain. " +
        "This is used for checking if a transaction has been confirmed, pending, or failed. " +
        "Requires a transaction hash as input. " +
        "Returns detailed information about the transaction status.",
    inputSchema: {
        transaction_hash: z.string().describe("Transaction hash to check status for"),
    },
};

/**
 * Checks if the provided arguments are valid for the get_transaction_status tool.
 * @param args The arguments to validate.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isGetTransactionStatusArgs(args: unknown): args is { transaction_hash: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "transaction_hash" in args &&
        typeof (args as any).transaction_hash === "string"
    );
}

/**
 * Performs the get_transaction_status tool.
 * @param transaction_hash The transaction hash to check status for.
 * @returns An object with transaction status details and formatted text.
 */
export async function performGetTransactionStatus(session: SessionContext, transaction_hash: string): Promise<{
    transactionHash: string,
    status: string,
    from: string,
    to: string,
    valueEther: string,
    gasPriceGwei: string,
    gasLimit: string,
    gasUsed: string,
    nonce: number,
    blockNumber: string,
    confirmations: string,
    explorerUrl: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(session));
        const receipt = await provider.getTransactionReceipt(transaction_hash);
        const tx = await provider.getTransaction(transaction_hash);
        
        if (!tx) {
            const formattedText = `Transaction Not Found\nTransaction Hash: ${transaction_hash}\nStatus: Unknown (Transaction not found on the blockchain)`;
            return {
                transactionHash: transaction_hash,
                status: 'Not Found',
                from: '',
                to: '',
                valueEther: '0',
                gasPriceGwei: '0',
                gasLimit: '0',
                gasUsed: 'N/A',
                nonce: 0,
                blockNumber: 'N/A',
                confirmations: '0',
                explorerUrl: '',
                formattedText
            };
        }
        
        let status = 'Pending';
        let gasUsed = 'N/A';
        let blockNumber = 'N/A';
        let confirmations = '0';
        
        if (receipt) {
            status = receipt.status ? 'Success' : 'Failed';
            gasUsed = receipt.gasUsed.toString();
            blockNumber = receipt.blockNumber.toString();
            
            const currentBlock = await provider.getBlockNumber();
            confirmations = (currentBlock - receipt.blockNumber).toString();
        }
        
        const valueEther = ethers.formatEther(tx.value);
        const gasPriceGwei = ethers.formatUnits(tx.gasPrice || 0, 'gwei');
        const network = await provider.getNetwork();
        const explorerUrl = `https://${network.name === 'mainnet' ? 'mainnet' : 'testnet'}.cotiscan.io/tx/${transaction_hash}`;
        
        let formattedText = `Transaction Hash: ${transaction_hash}\n\n`;
        formattedText += `Status: ${status}\n\n`;
        formattedText += `From: ${tx.from}\n\n`;
        formattedText += `To: ${tx.to || 'Contract Creation'}\n\n`;
        formattedText += `Value: ${valueEther} COTI\n\n`;
        formattedText += `Gas Price: ${gasPriceGwei} Gwei\n\n`;
        formattedText += `Gas Limit: ${tx.gasLimit.toString()}\n\n`;
        formattedText += `Gas Used: ${gasUsed}\n\n`;
        formattedText += `Nonce: ${tx.nonce}\n\n`;
        formattedText += `Block Number: ${blockNumber}\n\n`;
        formattedText += `Confirmations: ${confirmations}\n\n`;
        formattedText += `${explorerUrl}\n\n`;
        
        return {
            transactionHash: transaction_hash,
            status,
            from: tx.from,
            to: tx.to || 'Contract Creation',
            valueEther,
            gasPriceGwei,
            gasLimit: tx.gasLimit.toString(),
            gasUsed,
            nonce: tx.nonce,
            blockNumber,
            confirmations,
            explorerUrl,
            formattedText
        };
    } catch (error) {
        console.error('Error getting transaction status:', error);
        throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the getTransactionStatus tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getTransactionStatusHandler(session: SessionContext, args: any): Promise<any> {
    if (!isGetTransactionStatusArgs(args)) {
        throw new Error("Invalid arguments for get_transaction_status");
    }
    const { transaction_hash } = args;

    const results = await performGetTransactionStatus(session, transaction_hash);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            status: results.status,
            from: results.from,
            to: results.to,
            valueEther: results.valueEther,
            gasPriceGwei: results.gasPriceGwei,
            gasLimit: results.gasLimit,
            gasUsed: results.gasUsed,
            nonce: results.nonce,
            blockNumber: results.blockNumber,
            confirmations: results.confirmations,
            explorerUrl: results.explorerUrl
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
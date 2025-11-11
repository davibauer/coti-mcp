import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getDefaultProvider } from "@coti-io/coti-ethers";
import { getNetwork } from "../shared/account.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const GET_TRANSACTION_LOGS: ToolAnnotations = {
    title: "Get Transaction Logs",
    name: "get_transaction_logs",
    description:
        "Get the logs from a transaction on the COTI blockchain. " +
        "This is used for retrieving event logs emitted during transaction execution. " +
        "Requires a transaction hash as input. " +
        "Returns detailed information about the transaction logs including event names, topics, and data.",
    inputSchema: {
        transaction_hash: z.string().describe("Transaction hash to get logs for"),
    },
};

/**
 * Checks if the input arguments are valid for the get_transaction_logs tool
 * @param args The input arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetTransactionLogsArgs(args: unknown): args is { transaction_hash: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "transaction_hash" in args &&
        typeof (args as any).transaction_hash === "string"
    );
}

/**
 * Gets the logs from a transaction on the COTI blockchain
 * @param transaction_hash The hash of the transaction to get logs for
 * @returns An object with transaction logs and formatted text
 */
export async function performGetTransactionLogs(session: SessionContext, transaction_hash: string): Promise<{
    transactionHash: string,
    totalLogs: number,
    logs: Array<{
        address: string,
        blockNumber: number,
        transactionIndex: number,
        logIndex: number | string,
        removed: boolean,
        topics: string[],
        data: string,
        eventSignature?: string
    }>,
    explorerUrl?: string,
    status: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(session));
        let receipt;
        try {
            receipt = await provider.getTransactionReceipt(transaction_hash);
        } catch (error) {
            const formattedText = `Transaction Not Found or Pending\nTransaction Hash: ${transaction_hash}\nStatus: No logs available (Transaction may be pending or not found)`;
            return {
                transactionHash: transaction_hash,
                totalLogs: 0,
                logs: [],
                status: 'Not Found or Pending',
                formattedText
            };
        }

        if (!receipt) {
            const formattedText = `Transaction Not Found or Pending\nTransaction Hash: ${transaction_hash}\nStatus: No logs available (Transaction may be pending or not found)`;
            return {
                transactionHash: transaction_hash,
                totalLogs: 0,
                logs: [],
                status: 'Not Found or Pending',
                formattedText
            };
        }

        const logs = receipt.logs;
        
        if (!logs || logs.length === 0) {
            const formattedText = `Transaction Hash: ${transaction_hash}\n\nNo logs found for this transaction.`;
            return {
                transactionHash: transaction_hash,
                totalLogs: 0,
                logs: [],
                status: 'No Logs',
                formattedText
            };
        }
        
        const network = await provider.getNetwork();
        const explorerUrl = `https://${network.name === 'mainnet' ? 'mainnet' : 'testnet'}.cotiscan.io/tx/${transaction_hash}`;
        
        let formattedText = `Transaction Hash: ${transaction_hash}\n\n`;
        formattedText += `Total Logs: ${logs.length}\n\n`;
        
        const logsData = logs.map((log, index) => {
            formattedText += `Log #${index + 1}:\n`;
            formattedText += `  Address: ${log.address}\n`;
            formattedText += `  Block Number: ${log.blockNumber}\n`;
            formattedText += `  Transaction Index: ${log.transactionIndex}\n`;
            formattedText += `  Log Index: ${log.index !== undefined ? log.index : 'N/A'}\n`;
            formattedText += `  Removed: ${log.removed !== undefined ? log.removed : 'false'}\n`;
            
            formattedText += `  Topics (${log.topics.length}):\n`;
            log.topics.forEach((topic, topicIndex) => {
                formattedText += `    Topic ${topicIndex}: ${topic}\n`;
            });

            formattedText += `  Data: ${log.data}\n\n`;
            
            let eventSignature: string | undefined;
            if (log.topics.length > 0) {
                eventSignature = log.topics[0];
                formattedText += `  Event Signature: ${eventSignature}\n\n`;
            }
            
            return {
                address: log.address,
                blockNumber: log.blockNumber,
                transactionIndex: log.transactionIndex,
                logIndex: log.index !== undefined ? log.index : 'N/A',
                removed: log.removed !== undefined ? log.removed : false,
                topics: [...log.topics],
                data: log.data,
                eventSignature
            };
        });
        
        formattedText += `View on Explorer: ${explorerUrl}\n`;
        
        return {
            transactionHash: transaction_hash,
            totalLogs: logs.length,
            logs: logsData,
            explorerUrl,
            status: 'Success',
            formattedText
        };
    } catch (error) {
        console.error('Error getting transaction logs:', error);
        throw new Error(`Failed to get transaction logs: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the getTransactionLogs tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getTransactionLogsHandler(session: SessionContext, args: any): Promise<any> {
    if (!isGetTransactionLogsArgs(args)) {
        throw new Error("Invalid arguments for get_transaction_logs");
    }
    const { transaction_hash } = args;

    const results = await performGetTransactionLogs(session, transaction_hash);
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            totalLogs: results.totalLogs,
            logs: results.logs,
            explorerUrl: results.explorerUrl,
            status: results.status
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
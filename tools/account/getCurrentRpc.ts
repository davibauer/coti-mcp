import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { CotiNetwork } from "@coti-io/coti-ethers";
import { getNetwork } from "../shared/account.js";
import { z } from "zod";

export const GET_CURRENT_RPC: ToolAnnotations = {
    title: "Get Current RPC",
    name: "get_current_rpc",
    description: "Get the RPC URL for the specified COTI network (testnet or mainnet). Returns the RPC endpoint currently being used for blockchain interactions.",
    inputSchema: {
        network: z.enum(['testnet', 'mainnet']).describe("Network to get RPC URL for: 'testnet' or 'mainnet' (required)."),
    }
};

/**
 * Checks if the provided arguments are valid for the getCurrentRpc tool
 * @param args The arguments to check
 * @returns True if the arguments are valid, false otherwise
 */
export function isGetCurrentRpcArgs(args: unknown): args is { network: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "network" in args &&
        typeof (args as { network: string }).network === "string" &&
        ((args as { network: string }).network === 'testnet' || (args as { network: string }).network === 'mainnet')
    );
}

/**
 * Gets the RPC URL for the specified COTI network.
 * @param network The network to get RPC URL for ('testnet' or 'mainnet')
 * @returns An object with the network, RPC URL, and formatted text
 */
export async function performGetCurrentRpc(network: 'testnet' | 'mainnet'): Promise<{
    network: string,
    rpcUrl: string,
    formattedText: string
}> {
    try {
        const cotiNetwork = getNetwork(network);
        const rpcUrl = cotiNetwork as string; // CotiNetwork enum values are the RPC URLs

        const formattedText = `Network: ${network}\nRPC URL: ${rpcUrl}`;

        return {
            network,
            rpcUrl,
            formattedText
        };
    } catch (error) {
        console.error('Error getting current RPC:', error);
        throw new Error(`Failed to get current RPC: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the getCurrentRpc tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getCurrentRpcHandler(args: any) {
    if (!isGetCurrentRpcArgs(args)) {
        throw new Error("Invalid arguments for get_current_rpc. Network parameter is required and must be 'testnet' or 'mainnet'.");
    }

    const { network } = args;
    const results = await performGetCurrentRpc(network);
    return {
        structuredContent: {
            network: results.network,
            rpcUrl: results.rpcUrl
        },
        content: [{ type: "text" as const, text: results.formattedText }],
        isError: false,
    };
}

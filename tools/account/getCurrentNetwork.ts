import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const GET_CURRENT_NETWORK: ToolAnnotations = {
    title: "Get Current Network",
    name: "get_current_network",
    description: "Get the currently configured COTI network (testnet or mainnet). The AI assistant should track and pass the current network context. If no network is provided, defaults to testnet.",
    inputSchema: {
        network: z.enum(['testnet', 'mainnet']).optional().describe("The current network context (tracked by AI assistant). Defaults to 'testnet' if not provided."),
    }
};

/**
 * Gets the currently configured COTI network.
 * @param network Optional network parameter (from AI context)
 * @returns An object with the current network and formatted text
 */
export async function performGetCurrentNetwork(network?: 'testnet' | 'mainnet'): Promise<{
    network: string,
    formattedText: string
}> {
    try {
        const currentNetwork = network || 'testnet';

        const formattedText = `Current network: ${currentNetwork}`;

        return {
            network: currentNetwork,
            formattedText
        };
    } catch (error) {
        console.error('Error getting current network:', error);
        throw new Error(`Failed to get current network: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the getCurrentNetwork tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function getCurrentNetworkHandler(args: any) {
    const network = args?.network as 'testnet' | 'mainnet' | undefined;
    const results = await performGetCurrentNetwork(network);
    return {
        structuredContent: {
            network: results.network
        },
        content: [{ type: "text" as const, text: results.formattedText }],
        isError: false,
    };
}
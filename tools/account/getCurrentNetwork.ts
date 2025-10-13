import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export const GET_CURRENT_NETWORK: ToolAnnotations = {
    title: "Get Current Network",
    name: "get_current_network",
    description: "Get the currently configured COTI network (testnet or mainnet). Returns the network that all blockchain operations will use.",
    inputSchema: {}
};

/**
 * Gets the currently configured COTI network.
 * @returns An object with the current network and formatted text
 */
export async function performGetCurrentNetwork(): Promise<{
    network: string,
    formattedText: string
}> {
    try {
        const network = process.env.COTI_MCP_NETWORK?.toLowerCase() || 'testnet';
        
        const formattedText = `Current network: ${network}`;
        
        return {
            network,
            formattedText
        };
    } catch (error) {
        console.error('Error getting current network:', error);
        throw new Error(`Failed to get current network: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the getCurrentNetwork tool
 * @param args The arguments for the tool (none required)
 * @returns The tool response
 */
export async function getCurrentNetworkHandler(args: Record<string, unknown> | undefined) {
    const results = await performGetCurrentNetwork();
    return {
        structuredContent: {
            network: results.network
        },
        content: [{ type: "text" as const, text: results.formattedText }],
        isError: false,
    };
}
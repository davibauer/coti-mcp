import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const SWITCH_NETWORK: ToolAnnotations = {
    title: "Switch Network",
    name: "switch_network",
    description: "Switch between COTI testnet and mainnet networks. The AI assistant should remember this network selection and pass it to subsequent blockchain operations. Returns the new network to be tracked by the AI.",
    inputSchema: {
        previous_network: z.enum(['testnet', 'mainnet']).optional().describe("The previous network (from AI context). Defaults to 'testnet' if not provided."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to switch to - either 'testnet' or 'mainnet'"),
    }
};

/**
 * Validates the arguments for switching networks
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isSwitchNetworkArgs(args: unknown): args is { network: 'testnet' | 'mainnet', previous_network?: 'testnet' | 'mainnet' } {
    return (
        typeof args === "object" &&
        args !== null &&
        "network" in args &&
        typeof (args as { network: string }).network === "string" &&
        ['testnet', 'mainnet'].includes((args as { network: string }).network)
    );
}

/**
 * Switches the COTI network for blockchain operations.
 * @param network The network to switch to ('testnet' or 'mainnet')
 * @param previousNetwork The previous network (optional, defaults to 'testnet')
 * @returns An object with network switch information and formatted text
 */
export async function performSwitchNetwork(network: 'testnet' | 'mainnet', previousNetwork?: 'testnet' | 'mainnet'): Promise<{
    previousNetwork: string,
    newNetwork: string,
    wasAlreadySet: boolean,
    formattedText: string
}> {
    try {
        const prevNetwork = previousNetwork || 'testnet';

        const wasAlreadySet = prevNetwork === network;

        let formattedText: string;
        if (wasAlreadySet) {
            formattedText = `Network is already set to: ${network}`;
        } else {
            formattedText = `Network successfully switched from ${prevNetwork} to: ${network}`;
        }

        return {
            previousNetwork: prevNetwork,
            newNetwork: network,
            wasAlreadySet,
            formattedText
        };
    } catch (error) {
        console.error('Error switching network:', error);
        throw new Error(`Failed to switch network: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the switchNetwork tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function switchNetworkHandler(args: any) {
    if (!isSwitchNetworkArgs(args)) {
        throw new Error("Invalid arguments for switch_network. Expected 'network' to be either 'testnet' or 'mainnet'");
    }
    const { network, previous_network } = args;

    const results = await performSwitchNetwork(network, previous_network);
    return {
        structuredContent: {
            previousNetwork: results.previousNetwork,
            newNetwork: results.newNetwork,
            wasAlreadySet: results.wasAlreadySet
        },
        content: [{ type: "text" as const, text: results.formattedText }],
        isError: false,
    };
}
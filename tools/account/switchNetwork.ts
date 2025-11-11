import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SessionContext, SessionKeys } from "../../src/types/session.js";

export const SWITCH_NETWORK: ToolAnnotations = {
    title: "Switch Network",
    name: "switch_network",
    description: "Switch between COTI testnet and mainnet networks. This changes the network for all subsequent blockchain operations. Valid networks are 'testnet' and 'mainnet'. Returns confirmation of the network switch.",
    inputSchema: {
        network: z.enum(['testnet', 'mainnet']).describe("Network to switch to - either 'testnet' or 'mainnet'"),
    }
};

/**
 * Validates the arguments for switching networks
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isSwitchNetworkArgs(args: unknown): args is { network: 'testnet' | 'mainnet' } {
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
 * @returns An object with network switch information and formatted text
 */
export async function performSwitchNetwork(session: SessionContext, network: 'testnet' | 'mainnet'): Promise<{
    previousNetwork: string,
    newNetwork: string,
    wasAlreadySet: boolean,
    formattedText: string
}> {
    try {
        const previousNetwork = session.storage.get(SessionKeys.NETWORK)?.toLowerCase() || 'testnet';
        
        session.storage.set(SessionKeys.NETWORK, network);
        
        const wasAlreadySet = previousNetwork === network;
        
        let formattedText: string;
        if (wasAlreadySet) {
            formattedText = `Network is already set to: ${network}`;
        } else {
            formattedText = `Network successfully switched from ${previousNetwork} to: ${network}`;
        }
        
        return {
            previousNetwork,
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
export async function switchNetworkHandler(session: SessionContext, args: any) {
    if (!isSwitchNetworkArgs(args)) {
        throw new Error("Invalid arguments for switch_network. Expected 'network' to be either 'testnet' or 'mainnet'");
    }
    const { network } = args;

    const results = await performSwitchNetwork(session, network);
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
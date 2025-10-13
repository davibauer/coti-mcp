import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentAccountKeys, getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet, ethers } from "@coti-io/coti-ethers";
import { ERC20_ABI, ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";

export const DECODE_EVENT_DATA: ToolAnnotations = {
    title: "Decode Event Data",
    name: "decode_event_data",
    description: "Decode event data from a transaction log based on the event signature. This helps interpret the raw data in transaction logs by matching the event signature to known event types and decoding the parameters. Requires event signature, topics, and data from a transaction log.",
    inputSchema: {
        topics: z.array(z.string()).describe("Array of topics from the transaction log"),
        data: z.string().describe("Data field from the transaction log"),
        abi: z.string().optional().describe("Optional JSON string representation of the contract ABI. If not provided, will attempt to use standard ERC20/ERC721 ABIs."),
    },
};

/**
 * Checks if the provided arguments are valid for the decode_event_data tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isDecodeEventDataArgs(args: unknown): args is { topics: string[]; data: string; abi?: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "topics" in args &&
        Array.isArray((args as { topics: string[] }).topics) &&
        "data" in args &&
        typeof (args as { data: string }).data === "string" &&
        (!("abi" in args) || typeof (args as { abi: string }).abi === "string")
    );
}

/**
 * Decodes event data from a transaction log based on the event signature.
 * @param topics Array of topics from the transaction log.
 * @param data Data field from the transaction log.
 * @param abi Optional JSON string representation of the contract ABI. If not provided, will attempt to use standard ERC20/ERC721 ABIs.
 * @returns An object with decoded event data and formatted text.
 */
export async function performDecodeEventData(topics: string[], data: string, abi?: string): Promise<{
    eventName: string,
    eventSignature: string,
    eventTopic: string,
    decodedInputs: Array<{
        index: number,
        name: string,
        type: string,
        value: any,
        decryptedValue?: string
    }>,
    topics: string[],
    data: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork());
        const currentAccountKeys = getCurrentAccountKeys();
        const wallet = new Wallet(currentAccountKeys.privateKey, provider);
        const standardAbis = [...ERC20_ABI, ...ERC721_ABI];
        
        const iface = new ethers.Interface(abi || standardAbis);
        const decodedData = iface.parseLog({
            topics: topics,
            data: data
        });
        
        let result = "Event Decoding Results:\n\n";
        result += "Decoded Data:\n\n";
        
        if (!decodedData) {
            const formattedText = "No decoded data found.";
            return {
                eventName: '',
                eventSignature: '',
                eventTopic: '',
                decodedInputs: [],
                topics,
                data,
                formattedText
            };
        }

        result += `Event Name: ${decodedData.name}\n\n`;
        result += `Event Signature: ${decodedData.signature}\n\n`;
        result += `Event Topic: ${decodedData.topic}\n\n`;

        const decodedInputs = [];
        for (let index = 0; index < decodedData.fragment.inputs.length; index++) {
            const input = decodedData.fragment.inputs[index];
            const value = decodedData.args[index];
        
            result += `Input ${index}, Name: ${input.name}, Type: ${input.type}, Value: ${value}\n\n`;
        
            let decryptedValue: string | undefined;
            try {
                decryptedValue = await wallet.decryptValue(value);
                result += `Decrypted Value: ${decryptedValue}\n\n`;
            } catch (error) {
                result += `Decrypted Value: [decryption failed or not applicable]\n\n`;
            }
            
            decodedInputs.push({
                index,
                name: input.name,
                type: input.type,
                value,
                decryptedValue
            });
        }
        
        return {
            eventName: decodedData.name,
            eventSignature: decodedData.signature,
            eventTopic: decodedData.topic,
            decodedInputs,
            topics,
            data,
            formattedText: result
        };
    } catch (error) {
        console.error('Error decoding event data:', error);
        throw new Error(`Failed to decode event data: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the decodeEventData tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function decodeEventDataHandler(args: Record<string, unknown> | undefined): Promise<any> {
    if (!isDecodeEventDataArgs(args)) {
        throw new Error("Invalid arguments for decode_event_data");
    }
    const { topics, data, abi } = args;

    const results = await performDecodeEventData(topics, data, abi);
    return {
        structuredContent: {
            eventName: results.eventName,
            eventSignature: results.eventSignature,
            eventTopic: results.eventTopic,
            decodedInputs: results.decodedInputs,
            topics: results.topics,
            data: results.data
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { z } from "zod";

export const GET_PRIVATE_MESSAGE_SENDERS: ToolAnnotations = {
    title: "Get Private Message Senders",
    name: "get_private_message_senders",
    description:
        "Returns the list of all wallet addresses that have sent you at least one private message " +
        "on a deployed PrivateMessage contract. " +
        "Use this to discover who has messaged you, then call read_private_message for each sender.",
    inputSchema: {
        private_key: z.string().describe("Private key of the recipient account (tracked by AI from previous operations)"),
        contract_address: z.string().describe("Address of the deployed PrivateMessage contract"),
        abi: z.string().describe("ABI of the PrivateMessage contract (returned by deploy_private_message_contract)"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
    },
};

export function isGetPrivateMessageSendersArgs(args: unknown): args is {
    private_key: string,
    contract_address: string,
    abi: string,
    network: 'testnet' | 'mainnet'
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as any).private_key === "string" &&
        "contract_address" in args &&
        typeof (args as any).contract_address === "string" &&
        "abi" in args &&
        typeof (args as any).abi === "string"
    );
}

export async function performGetPrivateMessageSenders(
    private_key: string,
    contract_address: string,
    abi: string,
    network: 'testnet' | 'mainnet'
): Promise<{
    senders: string[],
    recipient: string,
    contractAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        const parsedAbi = JSON.parse(abi);
        const contract = new Contract(contract_address, parsedAbi, wallet);

        const senders: string[] = await contract.getSenders();

        const formattedText = senders.length === 0
            ? `No messages received yet on contract ${contract_address}`
            : `Senders (${senders.length}):\n${senders.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`;

        return {
            senders,
            recipient: wallet.address,
            contractAddress: contract_address,
            formattedText
        };
    } catch (error) {
        console.error('Error getting private message senders:', error);
        throw new Error(`Failed to get private message senders: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function getPrivateMessageSendersHandler(args: any): Promise<any> {
    if (!isGetPrivateMessageSendersArgs(args)) {
        throw new Error("Invalid arguments for get_private_message_senders");
    }
    const { private_key, contract_address, abi, network } = args;

    const results = await performGetPrivateMessageSenders(private_key, contract_address, abi, network);
    return {
        structuredContent: {
            senders: results.senders,
            recipient: results.recipient,
            contractAddress: results.contractAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

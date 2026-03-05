import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { z } from "zod";

export const GET_PRIVATE_MESSAGE_COUNT = {
    title: "Get Private Message Count",
    name: "get_private_message_count",
    description:
        "Returns the number of private messages sent to you by a specific sender on a deployed PrivateMessage contract. " +
        "Use this to know how many messages are available before calling read_private_message.",
    inputSchema: {
        private_key: z.string().describe("Private key of the recipient account (tracked by AI from previous operations)"),
        contract_address: z.string().describe("Address of the deployed PrivateMessage contract"),
        abi: z.string().describe("ABI of the PrivateMessage contract (returned by deploy_private_message_contract)"),
        sender_address: z.string().describe("Wallet address of the message sender"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
    },
};

export function isGetPrivateMessageCountArgs(args: unknown): args is {
    private_key: string,
    contract_address: string,
    abi: string,
    sender_address: string,
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
        typeof (args as any).abi === "string" &&
        "sender_address" in args &&
        typeof (args as any).sender_address === "string"
    );
}

export async function performGetPrivateMessageCount(
    private_key: string,
    contract_address: string,
    abi: string,
    sender_address: string,
    network: 'testnet' | 'mainnet'
): Promise<{
    count: number,
    senderAddress: string,
    recipient: string,
    contractAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        const parsedAbi = JSON.parse(abi);
        const contract = new Contract(contract_address, parsedAbi, wallet);

        const count = Number(await contract.getMessageCount(sender_address));

        const formattedText =
            `Message Count: ${count} message${count !== 1 ? 's' : ''} from ${sender_address}`;

        return {
            count,
            senderAddress: sender_address,
            recipient: wallet.address,
            contractAddress: contract_address,
            formattedText
        };
    } catch (error) {
        console.error('Error getting private message count:', error);
        throw new Error(`Failed to get private message count: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function getPrivateMessageCountHandler(args: any): Promise<any> {
    if (!isGetPrivateMessageCountArgs(args)) {
        throw new Error("Invalid arguments for get_private_message_count");
    }
    const { private_key, contract_address, abi, sender_address, network } = args;

    const results = await performGetPrivateMessageCount(
        private_key, contract_address, abi, sender_address, network
    );
    return {
        structuredContent: {
            count: results.count,
            senderAddress: results.senderAddress,
            recipient: results.recipient,
            contractAddress: results.contractAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

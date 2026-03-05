import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { z } from "zod";

export const READ_PRIVATE_MESSAGE = {
    title: "Read Private Message",
    name: "read_private_message",
    description:
        "Read and decrypt a private message sent to you on a deployed PrivateMessage contract. " +
        "The message is decrypted using your own AES key — no one else can read it. " +
        "If message_index is not provided, the latest message is returned. " +
        "Use get_private_message_count to find out how many messages you have from a sender.",
    inputSchema: {
        private_key: z.string().describe("Private key of the recipient account (tracked by AI from previous operations)"),
        aes_key: z.string().describe("AES key of the recipient (tracked by AI from generate_aes_key)"),
        contract_address: z.string().describe("Address of the deployed PrivateMessage contract"),
        abi: z.string().describe("ABI of the PrivateMessage contract (returned by deploy_private_message_contract)"),
        sender_address: z.string().describe("Wallet address of the message sender"),
        message_index: z.number().optional().describe("Index of the message to read (0-based). Defaults to the latest message if not provided."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
    },
};

export function isReadPrivateMessageArgs(args: unknown): args is {
    private_key: string,
    aes_key: string,
    contract_address: string,
    abi: string,
    sender_address: string,
    message_index?: number,
    network: 'testnet' | 'mainnet'
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as any).private_key === "string" &&
        "aes_key" in args &&
        typeof (args as any).aes_key === "string" &&
        "contract_address" in args &&
        typeof (args as any).contract_address === "string" &&
        "abi" in args &&
        typeof (args as any).abi === "string" &&
        "sender_address" in args &&
        typeof (args as any).sender_address === "string" &&
        (!("message_index" in args) || typeof (args as any).message_index === "number")
    );
}

export async function performReadPrivateMessage(
    private_key: string,
    aes_key: string,
    contract_address: string,
    abi: string,
    sender_address: string,
    network: 'testnet' | 'mainnet',
    message_index?: number
): Promise<{
    message: string,
    messageIndex: number,
    totalMessages: number,
    recipient: string,
    senderAddress: string,
    contractAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);
        wallet.setAesKey(aes_key);

        const parsedAbi = JSON.parse(abi);
        const contract = new Contract(contract_address, parsedAbi, wallet);

        const totalMessages = Number(await contract.getMessageCount(sender_address));

        if (totalMessages === 0) {
            throw new Error(`No messages from ${sender_address}`);
        }

        const index = message_index !== undefined ? message_index : totalMessages - 1;

        if (index < 0 || index >= totalMessages) {
            throw new Error(`Invalid message_index ${index}. Valid range: 0–${totalMessages - 1}`);
        }

        const ctString = await contract.readMessage(sender_address, index);
        const decryptedMessage = await wallet.decryptValue(ctString);

        const formattedText =
            `Private Message Read!\n` +
            `From: ${sender_address}\n` +
            `To: ${wallet.address}\n` +
            `Message #${index + 1} of ${totalMessages}: "${decryptedMessage}"`;

        return {
            message: decryptedMessage.toString(),
            messageIndex: index,
            totalMessages,
            recipient: wallet.address,
            senderAddress: sender_address,
            contractAddress: contract_address,
            formattedText
        };
    } catch (error) {
        console.error('Error reading private message:', error);
        throw new Error(`Failed to read private message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function readPrivateMessageHandler(args: any): Promise<any> {
    if (!isReadPrivateMessageArgs(args)) {
        throw new Error("Invalid arguments for read_private_message");
    }
    const { private_key, aes_key, contract_address, abi, sender_address, message_index, network } = args;

    const results = await performReadPrivateMessage(
        private_key, aes_key, contract_address, abi, sender_address, network, message_index
    );
    return {
        structuredContent: {
            message: results.message,
            messageIndex: results.messageIndex,
            totalMessages: results.totalMessages,
            recipient: results.recipient,
            senderAddress: results.senderAddress,
            contractAddress: results.contractAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { buildStringInputText } from "@coti-io/coti-sdk-typescript";
import { z } from "zod";

export const SEND_PRIVATE_MESSAGE = {
    title: "Send Private Message",
    name: "send_private_message",
    description:
        "Send an encrypted message to a specific recipient address on a deployed PrivateMessage contract. " +
        "The message is encrypted using COTI MPC so only the recipient can decrypt it with their own AES key. " +
        "Requires the contract address and ABI returned by deploy_private_message_contract.",
    inputSchema: {
        private_key: z.string().describe("Private key of the sender account (tracked by AI from previous operations)"),
        aes_key: z.string().describe("AES key of the sender (tracked by AI from generate_aes_key)"),
        contract_address: z.string().describe("Address of the deployed PrivateMessage contract"),
        abi: z.string().describe("ABI of the PrivateMessage contract (returned by deploy_private_message_contract)"),
        recipient_address: z.string().describe("Wallet address of the message recipient"),
        message: z.string().describe("Plain text message to encrypt and send"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        gas_limit: z.string().optional().describe("Optional gas limit for the transaction"),
    },
};

export function isSendPrivateMessageArgs(args: unknown): args is {
    private_key: string,
    aes_key: string,
    contract_address: string,
    abi: string,
    recipient_address: string,
    message: string,
    network: 'testnet' | 'mainnet',
    gas_limit?: string
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
        "recipient_address" in args &&
        typeof (args as any).recipient_address === "string" &&
        "message" in args &&
        typeof (args as any).message === "string" &&
        (!("gas_limit" in args) || typeof (args as any).gas_limit === "string")
    );
}

export async function performSendPrivateMessage(
    private_key: string,
    aes_key: string,
    contract_address: string,
    abi: string,
    recipient_address: string,
    message: string,
    network: 'testnet' | 'mainnet',
    gas_limit?: string
): Promise<{
    transactionHash: string,
    sender: string,
    recipientAddress: string,
    contractAddress: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);
        wallet.setAesKey(aes_key);

        const parsedAbi = JSON.parse(abi);
        const contract = new Contract(contract_address, parsedAbi, wallet);

        const sendMessageSelector = contract.sendMessage.fragment.selector;
        const encryptedInput = buildStringInputText(
            message,
            { wallet, userKey: aes_key },
            contract_address,
            sendMessageSelector
        );

        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }

        const tx = await contract.sendMessage(recipient_address, encryptedInput, txOptions);
        const receipt = await tx.wait();

        const formattedText =
            `Private Message Sent!\n` +
            `Transaction Hash: ${receipt?.hash}\n` +
            `From: ${wallet.address}\n` +
            `To: ${recipient_address}\n` +
            `Contract: ${contract_address}`;

        return {
            transactionHash: receipt?.hash || '',
            sender: wallet.address,
            recipientAddress: recipient_address,
            contractAddress: contract_address,
            formattedText
        };
    } catch (error) {
        console.error('Error sending private message:', error);
        throw new Error(`Failed to send private message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function sendPrivateMessageHandler(args: any): Promise<any> {
    if (!isSendPrivateMessageArgs(args)) {
        throw new Error("Invalid arguments for send_private_message");
    }
    const { private_key, aes_key, contract_address, abi, recipient_address, message, network, gas_limit } = args;

    const results = await performSendPrivateMessage(
        private_key, aes_key, contract_address, abi, recipient_address, message, network, gas_limit
    );
    return {
        structuredContent: {
            transactionHash: results.transactionHash,
            sender: results.sender,
            recipientAddress: results.recipientAddress,
            contractAddress: results.contractAddress
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

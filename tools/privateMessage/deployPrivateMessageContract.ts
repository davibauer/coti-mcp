import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { ethers, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { compileSolidity } from "../compiler/solidityCompiler.js";
import { z } from "zod";

const PRIVATE_MESSAGE_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "coti-contracts/contracts/utils/mpc/MpcCore.sol";

contract PrivateMessage {
    mapping(address => mapping(address => mapping(uint256 => utString))) private _messages;
    mapping(address => mapping(address => uint256)) private _messageCount;
    mapping(address => address[]) private _senders;
    mapping(address => mapping(address => bool)) private _hasSent;

    function sendMessage(address recipient, itString calldata value) external {
        if (!_hasSent[msg.sender][recipient]) {
            _senders[recipient].push(msg.sender);
            _hasSent[msg.sender][recipient] = true;
        }
        uint256 index = _messageCount[msg.sender][recipient];
        gtString memory msg_ = MpcCore.validateCiphertext(value);
        _messages[msg.sender][recipient][index] = MpcCore.offBoardCombined(msg_, recipient);
        _messageCount[msg.sender][recipient] = index + 1;
    }

    function readMessage(address sender, uint256 index) public view returns (ctString memory) {
        return _messages[sender][msg.sender][index].userCiphertext;
    }

    function getMessageCount(address sender) public view returns (uint256) {
        return _messageCount[sender][msg.sender];
    }

    function getSenders() public view returns (address[] memory) {
        return _senders[msg.sender];
    }
}`;

export const DEPLOY_PRIVATE_MESSAGE_CONTRACT: ToolAnnotations = {
    title: "Deploy Private Message Contract",
    name: "deploy_private_message_contract",
    description:
        "Deploys the PrivateMessage contract on the COTI blockchain. " +
        "This contract allows sending encrypted messages to specific addresses. " +
        "Only the intended recipient can decrypt a message using their own AES key. " +
        "Returns the contract address and ABI needed for send_private_message and read_private_message.",
    inputSchema: {
        private_key: z.string().describe("Private key of the deployer account (tracked by AI from previous operations)"),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        gas_limit: z.string().optional().describe("Optional gas limit for the deployment transaction"),
    },
};

export function isDeployPrivateMessageContractArgs(args: unknown): args is {
    private_key: string,
    network: 'testnet' | 'mainnet',
    gas_limit?: string
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as { private_key: string }).private_key === "string" &&
        "network" in args &&
        typeof (args as { network: string }).network === "string" &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string")
    );
}

export async function performDeployPrivateMessageContract(
    private_key: string,
    network: 'testnet' | 'mainnet',
    gas_limit?: string
): Promise<{
    contractAddress: string,
    transactionHash: string,
    abi: string,
    deployer: string,
    gasLimit?: string,
    formattedText: string
}> {
    try {
        const compilationResult = await compileSolidity(PRIVATE_MESSAGE_SOURCE, 'PrivateMessage');

        if (!compilationResult.success || !compilationResult.bytecode || !compilationResult.abi) {
            throw new Error(`Compilation failed: ${compilationResult.errors?.join('\n') || 'Unknown error'}`);
        }

        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        const factory = new ethers.ContractFactory(compilationResult.abi, compilationResult.bytecode, wallet);

        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        }

        const contract = await factory.deploy(txOptions);
        const receipt = await contract.deploymentTransaction();
        const contractAddress = await contract.getAddress();
        const abi = JSON.stringify(compilationResult.abi);

        const formattedText =
            `Private Message Contract Deployed!\n` +
            `Contract Address: ${contractAddress}\n` +
            `Transaction Hash: ${receipt?.hash}\n` +
            `Deployer: ${wallet.address}\n` +
            `Network: ${network}\n\n` +
            `Use send_private_message to send an encrypted message.\n` +
            `Use read_private_message to read messages sent to you.`;

        return {
            contractAddress,
            transactionHash: receipt?.hash || '',
            abi,
            deployer: wallet.address,
            gasLimit: gas_limit,
            formattedText
        };
    } catch (error) {
        console.error('Error deploying private message contract:', error);
        throw new Error(`Failed to deploy private message contract: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function deployPrivateMessageContractHandler(args: any): Promise<any> {
    if (!isDeployPrivateMessageContractArgs(args)) {
        throw new Error("Invalid arguments for deploy_private_message_contract");
    }
    const { private_key, network, gas_limit } = args;

    const results = await performDeployPrivateMessageContract(private_key, network, gas_limit);
    return {
        structuredContent: {
            contractAddress: results.contractAddress,
            transactionHash: results.transactionHash,
            abi: results.abi,
            deployer: results.deployer,
            gasLimit: results.gasLimit
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

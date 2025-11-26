import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from "zod";

export const GET_PRIVATE_ERC20_TEMPLATE: ToolAnnotations = {
    title: "Get Private ERC20 Template",
    name: "get_private_erc20_template",
    description:
        "Returns the Solidity source code for the Private ERC20 token template. " +
        "This template is designed for COTI blockchain and includes built-in privacy features. " +
        "The template includes commented markers for easy customization: " +
        "- MAX_SUPPLY: Add maximum token supply cap " +
        "- BURNABLE: Add burn functionality " +
        "- PAUSABLE: Add pause/unpause capability " +
        "Users can modify this template and then use compile_and_deploy_contract to deploy it.",
    inputSchema: {},
};

export const GET_PRIVATE_ERC721_TEMPLATE: ToolAnnotations = {
    title: "Get Private ERC721 Template",
    name: "get_private_erc721_template",
    description:
        "Returns the Solidity source code for the Private ERC721 (NFT) token template. " +
        "This template is designed for COTI blockchain and includes built-in privacy features. " +
        "The template includes commented markers for easy customization: " +
        "- MAX_SUPPLY: Add maximum NFT supply cap " +
        "- BURNABLE: Add burn functionality " +
        "- PAUSABLE: Add pause/unpause capability " +
        "Users can modify this template and then use compile_and_deploy_contract to deploy it.",
    inputSchema: {},
};

export const GET_PRIVATE_MESSAGE_TEMPLATE: ToolAnnotations = {
    title: "Get Private Message Template",
    name: "get_private_message_template",
    description:
        "Returns the Solidity source code for the Private Message storage template. " +
        "This template is designed for COTI blockchain and demonstrates encrypted message storage using COTI's MPC types. " +
        "The contract allows users to write and read encrypted messages that are stored per-user. " +
        "Key features: " +
        "- Uses COTI's MPC (Multi-Party Computation) for encryption " +
        "- Per-user encrypted message storage " +
        "- Simple read/write operations " +
        "Users can modify this template and then use compile_and_deploy_contract to deploy it.",
    inputSchema: {},
};

/**
 * Handler for the getPrivateERC20Template tool
 * @returns The tool response with template source code
 */
export async function getPrivateERC20TemplateHandler(): Promise<any> {
    try {
        // Read template from source directory relative to project root
        const templatePath = join(process.cwd(), 'tools/templates/PrivateERC20.sol');
        const templateSource = readFileSync(templatePath, 'utf-8');

        const formattedText =
            `Private ERC20 Template Retrieved Successfully!\n\n` +
            `This template includes the following customization markers:\n` +
            `- MAX_SUPPLY: Uncomment to add a maximum token supply cap\n` +
            `- BURNABLE: Uncomment to add burn functionality\n` +
            `- PAUSABLE: Uncomment to add pause/unpause capability\n\n` +
            `Key Features:\n` +
            `- COTI-compatible (decimals limited to 0-6)\n` +
            `- Owner-only minting\n` +
            `- Standard ERC20 interface\n` +
            `- Ready for private transactions\n\n` +
            `Constructor Parameters: name (string), symbol (string), decimals (uint8)\n\n` +
            `You can now modify this template and use compile_and_deploy_contract to deploy it.`;

        return {
            structuredContent: {
                templateSource: templateSource,
                templateType: "ERC20",
                features: [
                    "COTI-compatible",
                    "Owner-only minting",
                    "Optional max supply",
                    "Optional burn",
                    "Optional pause"
                ]
            },
            content: [{ type: "text", text: formattedText }],
            isError: false,
        };

    } catch (error) {
        console.error('Error reading ERC20 template:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            structuredContent: {
                error: errorMessage
            },
            content: [{
                type: "text",
                text: `Failed to read ERC20 template: ${errorMessage}`
            }],
            isError: true,
        };
    }
}

/**
 * Handler for the getPrivateERC721Template tool
 * @returns The tool response with template source code
 */
export async function getPrivateERC721TemplateHandler(): Promise<any> {
    try {
        // Read template from source directory relative to project root
        const templatePath = join(process.cwd(), 'tools/templates/PrivateERC721.sol');
        const templateSource = readFileSync(templatePath, 'utf-8');

        const formattedText =
            `Private ERC721 Template Retrieved Successfully!\n\n` +
            `This template includes the following customization markers:\n` +
            `- MAX_SUPPLY: Uncomment to add a maximum NFT supply cap\n` +
            `- BURNABLE: Uncomment to add burn functionality\n` +
            `- PAUSABLE: Uncomment to add pause/unpause capability\n\n` +
            `Key Features:\n` +
            `- COTI-compatible with private token URIs\n` +
            `- Owner-only minting\n` +
            `- Standard ERC721 interface\n` +
            `- Ready for private transactions\n\n` +
            `Constructor Parameters: name (string), symbol (string)\n\n` +
            `You can now modify this template and use compile_and_deploy_contract to deploy it.`;

        return {
            structuredContent: {
                templateSource: templateSource,
                templateType: "ERC721",
                features: [
                    "COTI-compatible",
                    "Owner-only minting",
                    "Optional max supply",
                    "Optional burn",
                    "Optional pause"
                ]
            },
            content: [{ type: "text", text: formattedText }],
            isError: false,
        };

    } catch (error) {
        console.error('Error reading ERC721 template:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            structuredContent: {
                error: errorMessage
            },
            content: [{
                type: "text",
                text: `Failed to read ERC721 template: ${errorMessage}`
            }],
            isError: true,
        };
    }
}

/**
 * Handler for the getPrivateMessageTemplate tool
 * @returns The tool response with template source code
 */
export async function getPrivateMessageTemplateHandler(): Promise<any> {
    try {
        // Read template from source directory relative to project root
        const templatePath = join(process.cwd(), 'tools/templates/PrivateMessage.sol');
        const templateSource = readFileSync(templatePath, 'utf-8');

        const formattedText =
            `Private Message Template Retrieved Successfully!\n\n` +
            `This template demonstrates encrypted message storage using COTI's MPC types.\n\n` +
            `Key Features:\n` +
            `- MPC-based encryption using COTI's confidential types\n` +
            `- Per-user encrypted message storage\n` +
            `- Simple read() and write() operations\n` +
            `- Messages encrypted with user's keys\n\n` +
            `Constructor Parameters: None (no-argument constructor)\n\n` +
            `MPC Types Used:\n` +
            `- utString: User-encrypted string (storage)\n` +
            `- gtString: General encrypted string (processing)\n` +
            `- ctString: Ciphertext string (reading)\n` +
            `- itString: Input ciphertext string (writing)\n\n` +
            `You can now modify this template and use compile_and_deploy_contract to deploy it.`;

        return {
            structuredContent: {
                templateSource: templateSource,
                templateType: "PrivateMessage",
                features: [
                    "MPC-based encryption",
                    "Per-user storage",
                    "Read/write operations",
                    "No constructor arguments"
                ]
            },
            content: [{ type: "text", text: formattedText }],
            isError: false,
        };

    } catch (error) {
        console.error('Error reading Private Message template:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            structuredContent: {
                error: errorMessage
            },
            content: [{
                type: "text",
                text: `Failed to read Private Message template: ${errorMessage}`
            }],
            isError: true,
        };
    }
}

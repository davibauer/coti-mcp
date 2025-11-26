import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ethers } from "@coti-io/coti-ethers";

export const VERIFY_CONTRACT: ToolAnnotations = {
    title: "Verify Contract on CotiScan",
    name: "verify_contract",
    description:
        "Verifies a deployed smart contract's source code on CotiScan (COTI's block explorer). " +
        "Submits the contract source code, compiler settings, and constructor arguments to " +
        "CotiScan's Blockscout verification API. After verification, the contract source will " +
        "be publicly viewable on the block explorer. " +
        "Use the verificationMetadata returned from compile_and_deploy_contract for easy verification.",
    inputSchema: {
        contract_address: z.string().describe("Address of the deployed contract to verify"),
        network: z.enum(['testnet', 'mainnet']).describe("Network where contract is deployed"),
        source_code: z.string().describe("Complete Solidity source code"),
        contract_name: z.string().describe("Name of the main contract (e.g., 'MyToken')"),
        compiler_version: z.string().describe("Compiler version with commit (e.g., 'v0.8.20+commit.a1b2c3d4')"),
        abi: z.string().optional().describe("Contract ABI as JSON string (for encoding constructor args)"),
        evm_version: z.string().optional().describe("EVM version (default: 'paris')"),
        optimization_enabled: z.boolean().optional().describe("Whether optimization was enabled (default: true)"),
        optimization_runs: z.number().optional().describe("Number of optimization runs (default: 200)"),
        constructor_args: z.array(z.any()).optional().describe("Constructor arguments used during deployment"),
        license_type: z.enum([
            'none', 'unlicense', 'mit', 'gnu_gpl_v2', 'gnu_gpl_v3',
            'gnu_lgpl_v2_1', 'gnu_lgpl_v3', 'bsd_2_clause', 'bsd_3_clause',
            'mpl_2_0', 'osl_3_0', 'apache_2_0', 'gnu_agpl_v3', 'bsl_1_1'
        ]).optional().describe("License type (default: 'mit')"),
    },
};

/**
 * Validates the arguments for the verify_contract tool
 * @param args The arguments to validate
 * @returns True if valid, false otherwise
 */
export function isVerifyContractArgs(args: unknown): args is {
    contract_address: string,
    network: 'testnet' | 'mainnet',
    source_code: string,
    contract_name: string,
    compiler_version: string,
    abi?: string,
    evm_version?: string,
    optimization_enabled?: boolean,
    optimization_runs?: number,
    constructor_args?: any[],
    license_type?: string
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "contract_address" in args &&
        typeof (args as { contract_address: string }).contract_address === "string" &&
        "network" in args &&
        typeof (args as { network: string }).network === "string" &&
        "source_code" in args &&
        typeof (args as { source_code: string }).source_code === "string" &&
        "contract_name" in args &&
        typeof (args as { contract_name: string }).contract_name === "string" &&
        "compiler_version" in args &&
        typeof (args as { compiler_version: string }).compiler_version === "string"
    );
}

/**
 * Encodes constructor arguments to hex format (without 0x prefix)
 * @param abi Contract ABI
 * @param args Constructor arguments
 * @returns Hex-encoded constructor args without 0x prefix
 */
function encodeConstructorArgs(abi: any[], args: any[]): string {
    try {
        // Find constructor in ABI
        const constructor = abi.find(item => item.type === 'constructor');
        if (!constructor || !constructor.inputs || constructor.inputs.length === 0) {
            return ''; // No constructor or no inputs
        }

        // Create ABI Coder
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();

        // Encode arguments
        const types = constructor.inputs.map((input: any) => input.type);
        const encoded = abiCoder.encode(types, args);

        // Remove '0x' prefix for Blockscout
        return encoded.slice(2);
    } catch (error) {
        console.error('Error encoding constructor args:', error);
        return ''; // Return empty on error, will fall back to autodetect
    }
}

/**
 * Get CotiScan API base URL for network
 * @param network Network identifier
 * @returns API base URL
 */
function getCotiScanApiUrl(network: 'testnet' | 'mainnet'): string {
    return network === 'mainnet'
        ? 'https://mainnet.cotiscan.io/api/v2/smart-contracts'
        : 'https://testnet.cotiscan.io/api/v2/smart-contracts';
}

/**
 * Submit verification request to Blockscout API
 * @param contract_address Contract address
 * @param network Network identifier
 * @param source_code Solidity source code
 * @param contract_name Contract name
 * @param compiler_version Compiler version with commit
 * @param abi Contract ABI (optional, for constructor encoding)
 * @param evm_version EVM version
 * @param optimization_enabled Optimization flag
 * @param optimization_runs Optimization runs
 * @param constructor_args Constructor arguments
 * @param license_type License type
 * @returns Verification result
 */
export async function performVerifyContract(
    contract_address: string,
    network: 'testnet' | 'mainnet',
    source_code: string,
    contract_name: string,
    compiler_version: string,
    abi?: string,
    evm_version: string = 'paris',
    optimization_enabled: boolean = true,
    optimization_runs: number = 200,
    constructor_args?: any[],
    license_type: string = 'mit'
): Promise<{
    success: boolean,
    verificationUrl?: string,
    message?: string,
    error?: string,
    formattedText: string
}> {
    try {
        const apiUrl = getCotiScanApiUrl(network);
        const endpoint = `${apiUrl}/${contract_address}/verification/via/flattened-code`;

        // Encode constructor args if provided
        let constructorArgsHex = '';
        if (constructor_args && constructor_args.length > 0 && abi) {
            try {
                const parsedAbi = JSON.parse(abi);
                constructorArgsHex = encodeConstructorArgs(parsedAbi, constructor_args);
            } catch (e) {
                console.error('Error parsing ABI:', e);
                // Will fall back to autodetect
            }
        }

        // Prepare request body per Blockscout API spec
        const requestBody = {
            compiler_version: compiler_version,
            source_code: source_code,
            contract_name: contract_name,
            license_type: license_type,
            is_optimization_enabled: optimization_enabled,
            optimization_runs: optimization_runs,
            evm_version: evm_version,
            constructor_args: constructorArgsHex || undefined,
            autodetect_constructor_args: !constructorArgsHex
        };

        // Make POST request
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const explorerUrl = `https://${network === 'mainnet' ? 'mainnet' : 'testnet'}.cotiscan.io/address/${contract_address}`;

        if (response.ok) {
            const successMessage =
                `Contract Verification Submitted Successfully!\n\n` +
                `Contract Address: ${contract_address}\n` +
                `Network: ${network}\n` +
                `Explorer URL: ${explorerUrl}\n\n` +
                `Status: Verification request submitted to CotiScan.\n` +
                `The contract source code will be publicly viewable once verification completes.\n` +
                `Check the explorer URL above to see the verification status.`;

            return {
                success: true,
                verificationUrl: explorerUrl,
                message: 'Contract verification submitted successfully.',
                formattedText: successMessage
            };
        } else {
            const errorText = await response.text();
            const errorMessage =
                `Contract Verification Failed!\n\n` +
                `Contract Address: ${contract_address}\n` +
                `Network: ${network}\n` +
                `Status Code: ${response.status}\n\n` +
                `Error: ${errorText}\n\n` +
                `Troubleshooting:\n` +
                `- Verify the contract address is correct\n` +
                `- Ensure the source code matches the deployed bytecode\n` +
                `- Check that compiler version and settings match deployment\n` +
                `- Constructor arguments must be exactly as used in deployment\n\n` +
                `You can also try manual verification at: ${explorerUrl}`;

            return {
                success: false,
                error: `Verification failed: ${response.status} - ${errorText}`,
                formattedText: errorMessage
            };
        }
    } catch (error) {
        const explorerUrl = `https://${network === 'mainnet' ? 'mainnet' : 'testnet'}.cotiscan.io/address/${contract_address}`;
        const errorMsg = error instanceof Error ? error.message : String(error);

        const errorMessage =
            `Contract Verification Error!\n\n` +
            `Contract Address: ${contract_address}\n` +
            `Network: ${network}\n\n` +
            `Error: ${errorMsg}\n\n` +
            `This may be a network or API issue. You can try:\n` +
            `1. Retry the verification request\n` +
            `2. Verify manually at: ${explorerUrl}`;

        return {
            success: false,
            error: `Verification error: ${errorMsg}`,
            formattedText: errorMessage
        };
    }
}

/**
 * Handler for the verify_contract tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function verifyContractHandler(args: any): Promise<any> {
    if (!isVerifyContractArgs(args)) {
        throw new Error("Invalid arguments for verify_contract");
    }

    const {
        contract_address,
        network,
        source_code,
        contract_name,
        compiler_version,
        abi,
        evm_version,
        optimization_enabled,
        optimization_runs,
        constructor_args,
        license_type
    } = args;

    const results = await performVerifyContract(
        contract_address,
        network,
        source_code,
        contract_name,
        compiler_version,
        abi,
        evm_version,
        optimization_enabled,
        optimization_runs,
        constructor_args,
        license_type
    );

    if (!results.success) {
        return {
            structuredContent: {
                success: false,
                error: results.error
            },
            content: [{
                type: "text",
                text: results.formattedText
            }],
            isError: true,
        };
    }

    return {
        structuredContent: {
            success: true,
            verificationUrl: results.verificationUrl,
            message: results.message
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

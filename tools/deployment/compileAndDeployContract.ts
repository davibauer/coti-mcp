import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { ethers, getDefaultProvider, Wallet } from "@coti-io/coti-ethers";
import { z } from "zod";
import { compileSolidity } from "../compiler/solidityCompiler.js";
import { performVerifyContract } from "../verification/verifyContract.js";

export const COMPILE_AND_DEPLOY_CONTRACT: ToolAnnotations = {
    title: "Compile and Deploy Contract",
    name: "compile_and_deploy_contract",
    description:
        "Compiles Solidity source code and immediately deploys it to the COTI blockchain in a single operation. " +
        "This tool avoids bytecode truncation issues that can occur when passing large bytecode strings between tools. " +
        "Accepts full Solidity source code, compiles it, and deploys the result. " +
        "Returns the contract address, transaction hash, and ABI (for future interactions). " +
        "This is the recommended tool for most deployment scenarios.",
    inputSchema: {
        private_key: z.string().describe("Private key of the deployer account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        solidity_source: z.string().describe("Complete Solidity source code to compile and deploy"),
        contract_name: z.string().optional().describe("Name of the contract to compile (auto-detected if not provided)"),
        constructor_params: z.array(z.any()).optional().describe("Array of constructor parameters in order (e.g., [\"TokenName\", \"TKN\", 18]). Leave empty if no constructor parameters."),
        gas_limit: z.string().optional().describe("Optional gas limit for the deployment transaction"),
        solc_version: z.string().optional().describe("Solidity compiler version to use (default: 0.8.20)"),
        auto_verify: z.boolean().optional().describe("Automatically verify contract on CotiScan after deployment (default: false)"),
        license_type: z.enum([
            'none', 'unlicense', 'mit', 'gnu_gpl_v2', 'gnu_gpl_v3',
            'gnu_lgpl_v2_1', 'gnu_lgpl_v3', 'bsd_2_clause', 'bsd_3_clause',
            'mpl_2_0', 'osl_3_0', 'apache_2_0', 'gnu_agpl_v3', 'bsl_1_1'
        ]).optional().describe("License type for verification (default: 'mit', only used if auto_verify is true)"),
    },
};

/**
 * Validates the arguments for compiling and deploying a contract
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isCompileAndDeployContractArgs(args: unknown): args is {
    private_key: string,
    network: 'testnet' | 'mainnet',
    solidity_source: string,
    contract_name?: string,
    constructor_params?: any[],
    gas_limit?: string,
    solc_version?: string,
    auto_verify?: boolean,
    license_type?: string
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "private_key" in args &&
        typeof (args as { private_key: string }).private_key === "string" &&
        "network" in args &&
        (typeof (args as { network: string }).network === "string") &&
        "solidity_source" in args &&
        typeof (args as { solidity_source: string }).solidity_source === "string" &&
        (!("contract_name" in args) || typeof (args as { contract_name: string }).contract_name === "string") &&
        (!("constructor_params" in args) || Array.isArray((args as { constructor_params: any[] }).constructor_params)) &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string") &&
        (!("solc_version" in args) || typeof (args as { solc_version: string }).solc_version === "string") &&
        (!("auto_verify" in args) || typeof (args as { auto_verify: boolean }).auto_verify === "boolean") &&
        (!("license_type" in args) || typeof (args as { license_type: string }).license_type === "string")
    );
}

/**
 * Handler for the compileAndDeployContract tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function compileAndDeployContractHandler(args: any): Promise<any> {
    if (!isCompileAndDeployContractArgs(args)) {
        throw new Error("Invalid arguments for compile_and_deploy_contract");
    }

    const {
        private_key,
        network,
        solidity_source,
        contract_name,
        constructor_params,
        gas_limit,
        solc_version,
        auto_verify,
        license_type
    } = args;

    const results = await performCompileAndDeployContract(
        private_key,
        network,
        solidity_source,
        contract_name,
        constructor_params,
        gas_limit,
        solc_version,
        auto_verify,
        license_type
    );

    if (!results.success) {
        return {
            structuredContent: {
                success: false,
                errors: results.errors,
                warnings: results.warnings
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
            contractAddress: results.contractAddress,
            transactionHash: results.transactionHash,
            transactionStatus: results.transactionStatus,
            blockNumber: results.blockNumber,
            gasUsed: results.gasUsed,
            abi: results.abi,
            deployer: results.deployer,
            network: results.network,
            constructorParams: results.constructorParams,
            compilationWarnings: results.compilationWarnings,
            gasLimit: results.gasLimit,
            verificationMetadata: results.verificationMetadata,
            verificationStatus: results.verificationStatus,
            verificationUrl: results.verificationUrl,
            verificationError: results.verificationError
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}

/**
 * Compiles and deploys a Solidity contract in one operation
 * @param private_key The private key of the deployer
 * @param network The network to deploy to
 * @param solidity_source The Solidity source code
 * @param contract_name Optional contract name
 * @param constructor_params Constructor parameters array
 * @param gas_limit Optional gas limit
 * @param solc_version Optional Solidity compiler version
 * @returns Compilation and deployment details
 */
export async function performCompileAndDeployContract(
    private_key: string,
    network: 'testnet' | 'mainnet',
    solidity_source: string,
    contract_name?: string,
    constructor_params?: any[],
    gas_limit?: string,
    solc_version?: string,
    auto_verify?: boolean,
    license_type?: string
): Promise<{
    success: boolean,
    contractAddress?: string,
    transactionHash?: string,
    transactionStatus?: number,
    blockNumber?: number,
    gasUsed?: string,
    abi?: any[],
    deployer?: string,
    network?: string,
    constructorParams?: any[],
    compilationWarnings?: string[],
    gasLimit?: string,
    errors?: string[],
    warnings?: string[],
    verificationMetadata?: {
        sourceCode: string,
        contractName: string,
        compilerVersion: string,
        evmVersion: string,
        optimizationEnabled: boolean,
        optimizationRuns: number,
        constructorArgs: any[]
    },
    verificationStatus?: 'success' | 'failed' | 'not_requested',
    verificationUrl?: string,
    verificationError?: string,
    formattedText: string
}> {
    try {
        // Step 1: Compile the contract
        const compilationResult = await compileSolidity(
            solidity_source,
            contract_name,
            solc_version
        );

        if (!compilationResult.success || !compilationResult.bytecode || !compilationResult.abi) {
            const errorMessage = compilationResult.errors?.join('\n\n') || 'Unknown compilation error';
            return {
                success: false,
                errors: compilationResult.errors,
                warnings: compilationResult.warnings,
                formattedText: `Compilation Failed:\n\n${errorMessage}`
            };
        }

        // Step 2: Setup provider and wallet
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);

        // Step 3: Create contract factory with compiled bytecode and ABI
        const factory = new ethers.ContractFactory(
            compilationResult.abi,
            compilationResult.bytecode,
            wallet
        );

        // Step 4: Estimate gas and simulate transaction before deployment
        let estimatedGas: bigint | undefined;
        try {
            const deployTx = constructor_params && constructor_params.length > 0
                ? await factory.getDeployTransaction(...constructor_params)
                : await factory.getDeployTransaction();

            estimatedGas = await provider.estimateGas(deployTx);
        } catch (estimateError: any) {
            // Gas estimation failed - extract detailed error information
            let errorDetails = 'Transaction simulation failed. ';
            let revertReason = '';

            if (estimateError.message) {
                errorDetails += estimateError.message;
            }

            if (estimateError.data) {
                const dataStr = JSON.stringify(estimateError.data);
                const truncatedData = dataStr.length > 200 ? dataStr.slice(0, 200) + '... (truncated)' : dataStr;
                revertReason = `\n\nRevert Data: ${truncatedData}`;
            }

            if (estimateError.reason) {
                revertReason = `\n\nRevert Reason: ${estimateError.reason}`;
            }

            if (estimateError.code === 'CALL_EXCEPTION' && estimateError.info) {
                const infoStr = JSON.stringify(estimateError.info);
                const truncatedInfo = infoStr.length > 200 ? infoStr.slice(0, 200) + '... (truncated)' : infoStr;
                revertReason += `\n\nAdditional Info: ${truncatedInfo}`;
            }

            // Common causes
            const commonCauses =
                `\n\nCommon Causes:\n` +
                `- Constructor requirements not met (e.g., invalid parameters)\n` +
                `- Contract requires msg.value but none was sent\n` +
                `- Constructor logic has a revert() or require() that fails\n` +
                `- Insufficient gas (though this is rare at estimation stage)\n` +
                `- Constructor tries to call non-existent addresses`;

            return {
                success: false,
                errors: [errorDetails + revertReason],
                formattedText:
                    `Deployment Simulation Failed!\n\n` +
                    `The contract deployment was simulated before sending to the blockchain and failed.\n` +
                    `This means the deployment would have failed on-chain.\n\n` +
                    `Error: ${errorDetails}${revertReason}${commonCauses}`
            };
        }

        // Step 5: Prepare deployment options
        const txOptions: any = {};
        if (gas_limit) {
            txOptions.gasLimit = gas_limit;
        } else if (estimatedGas) {
            // Add 20% buffer to estimated gas
            txOptions.gasLimit = (estimatedGas * 120n) / 100n;
        }

        // Step 6: Deploy contract
        let contract;
        if (constructor_params && constructor_params.length > 0) {
            contract = await factory.deploy(...constructor_params, txOptions);
        } else {
            contract = await factory.deploy(txOptions);
        }

        // Step 7: Wait for deployment transaction to be mined
        const deployTx = await contract.deploymentTransaction();
        if (!deployTx) {
            return {
                success: false,
                errors: ['Failed to get deployment transaction'],
                formattedText: 'Deployment failed: Could not retrieve deployment transaction'
            };
        }

        // Wait for transaction to be confirmed on blockchain
        const receipt = await deployTx.wait();

        if (!receipt) {
            return {
                success: false,
                errors: ['Failed to get transaction receipt'],
                formattedText: 'Deployment failed: Could not retrieve transaction receipt'
            };
        }

        // Check if transaction was successful (status: 0 = failed, 1 = success)
        if (receipt.status === 0) {
            return {
                success: false,
                errors: ['Transaction failed on blockchain'],
                transactionHash: receipt.hash,
                transactionStatus: receipt.status,
                blockNumber: receipt.blockNumber,
                formattedText:
                    `Deployment Transaction Failed!\n\n` +
                    `Transaction Hash: ${receipt.hash}\n` +
                    `Block Number: ${receipt.blockNumber}\n` +
                    `Status: Failed (0)\n\n` +
                    `The transaction was mined but reverted. ` +
                    `This could be due to constructor requirements, gas issues, or contract logic errors.`
            };
        }

        const contractAddress = await contract.getAddress();

        // Build formatted response
        let formattedText = `Contract Compiled and Deployed Successfully!\n\n`;
        formattedText += `Contract Address: ${contractAddress}\n`;
        formattedText += `Transaction Hash: ${receipt.hash}\n`;
        formattedText += `Block Number: ${receipt.blockNumber}\n`;
        formattedText += `Transaction Status: Success (1)\n`;
        formattedText += `Gas Used: ${receipt.gasUsed.toString()}\n`;
        formattedText += `Deployer: ${wallet.address}\n`;
        formattedText += `Network: ${network}\n`;

        if (constructor_params && constructor_params.length > 0) {
            formattedText += `Constructor Parameters: ${JSON.stringify(constructor_params)}\n`;
        }

        if (compilationResult.warnings && compilationResult.warnings.length > 0) {
            formattedText += `\nCompilation Warnings:\n${compilationResult.warnings.join('\n')}\n`;
        }

        formattedText += `\nThe contract ABI has been included in the response for future interactions.`;

        // Auto-verification if requested
        let verificationStatus: 'success' | 'failed' | 'not_requested' = 'not_requested';
        let verificationUrl: string | undefined;
        let verificationError: string | undefined;

        if (auto_verify) {
            try {
                const verifyResult = await performVerifyContract(
                    contractAddress,
                    network,
                    compilationResult.sourceCode!,
                    contract_name || compilationResult.contractName!,
                    compilationResult.compilerVersion!,
                    JSON.stringify(compilationResult.abi),
                    compilationResult.evmVersion!,
                    compilationResult.optimizationEnabled!,
                    compilationResult.optimizationRuns!,
                    constructor_params,
                    license_type || 'mit'
                );

                if (verifyResult.success) {
                    verificationStatus = 'success';
                    verificationUrl = verifyResult.verificationUrl;
                    formattedText += `\n\n--- Contract Verification ---\n`;
                    formattedText += `Status: Successfully submitted to CotiScan\n`;
                    formattedText += `Verification URL: ${verificationUrl}\n`;
                    formattedText += `Note: Verification may take a few moments to complete. Check the URL above for status.`;
                } else {
                    verificationStatus = 'failed';
                    verificationError = verifyResult.error;
                    formattedText += `\n\n--- Contract Verification ---\n`;
                    formattedText += `Status: Verification submission failed\n`;
                    formattedText += `Error: ${verificationError}\n`;
                    formattedText += `You can manually verify the contract using the verify_contract tool with the verificationMetadata provided.`;
                }
            } catch (verifyError) {
                verificationStatus = 'failed';
                verificationError = verifyError instanceof Error ? verifyError.message : String(verifyError);
                formattedText += `\n\n--- Contract Verification ---\n`;
                formattedText += `Status: Verification encountered an error\n`;
                formattedText += `Error: ${verificationError}\n`;
                formattedText += `You can manually verify the contract using the verify_contract tool with the verificationMetadata provided.`;
            }
        }

        return {
            success: true,
            contractAddress,
            transactionHash: receipt.hash,
            transactionStatus: receipt.status ?? 1,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            abi: JSON.stringify(compilationResult.abi, null, 2),
            deployer: wallet.address,
            network,
            constructorParams: constructor_params,
            compilationWarnings: compilationResult.warnings,
            gasLimit: gas_limit,
            verificationMetadata: {
                sourceCode: compilationResult.sourceCode!,
                contractName: contract_name || compilationResult.contractName!,
                compilerVersion: compilationResult.compilerVersion!,
                evmVersion: compilationResult.evmVersion!,
                optimizationEnabled: compilationResult.optimizationEnabled!,
                optimizationRuns: compilationResult.optimizationRuns!,
                constructorArgs: constructor_params || []
            },
            verificationStatus,
            verificationUrl,
            verificationError,
            formattedText
        };

    } catch (error: any) {
        console.error('Error compiling and deploying contract:', error);

        let errorMessage = 'Unknown error occurred';
        let revertReason = '';
        let additionalContext = '';

        if (error instanceof Error) {
            errorMessage = error.message;
        } else {
            errorMessage = String(error);
        }

        // Extract detailed error information from ethers errors
        if (error.data) {
            const dataStr = JSON.stringify(error.data);
            const truncatedData = dataStr.length > 200 ? dataStr.slice(0, 200) + '... (truncated)' : dataStr;
            revertReason = `\n\nRevert Data: ${truncatedData}`;
        }

        if (error.reason) {
            revertReason = `\n\nRevert Reason: ${error.reason}`;
        }

        if (error.code === 'CALL_EXCEPTION') {
            additionalContext += '\n\nThis is a CALL_EXCEPTION, which typically means:';
            additionalContext += '\n- The transaction would revert on-chain';
            additionalContext += '\n- Constructor logic failed (require/revert/assert)';
            additionalContext += '\n- Invalid constructor parameters provided';

            if (error.info) {
                const infoStr = JSON.stringify(error.info);
                const truncatedInfo = infoStr.length > 200 ? infoStr.slice(0, 200) + '... (truncated)' : infoStr;
                revertReason += `\n\nException Info: ${truncatedInfo}`;
            }

            if (error.transaction) {
                const txDetails = JSON.stringify({
                    to: error.transaction.to,
                    data: error.transaction.data ? error.transaction.data.slice(0, 100) + '... (truncated)' : undefined,
                    value: error.transaction.value?.toString()
                });
                const truncatedTxDetails = txDetails.length > 300 ? txDetails.slice(0, 300) + '... (truncated)' : txDetails;
                revertReason += `\n\nTransaction Details: ${truncatedTxDetails}`;
            }
        }

        if (error.code === 'INSUFFICIENT_FUNDS') {
            additionalContext += '\n\nInsufficient funds in deployer account to pay for gas.';
        }

        if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
            additionalContext += '\n\nTransaction nonce issue. Try again.';
        }

        if (error.code === 'NETWORK_ERROR') {
            additionalContext += '\n\nNetwork connection issue. Check your network connectivity.';
        }

        const formattedError =
            `Failed to compile and deploy contract:\n\n` +
            `Error: ${errorMessage}${revertReason}${additionalContext}\n\n` +
            `Troubleshooting:\n` +
            `1. Check that constructor parameters match the contract requirements\n` +
            `2. Verify the contract compiles without errors\n` +
            `3. Ensure the deployer account has sufficient funds\n` +
            `4. Review any require() statements in the constructor`;

        return {
            success: false,
            errors: [errorMessage + revertReason + additionalContext],
            formattedText: formattedError
        };
    }
}

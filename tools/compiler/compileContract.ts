import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { compileSolidity } from "./solidityCompiler.js";

export const COMPILE_CONTRACT: ToolAnnotations = {
    title: "Compile Solidity Contract",
    name: "compile_contract",
    description:
        "Compiles Solidity source code without deploying it to the blockchain. " +
        "Returns bytecode, ABI, and compilation metadata (compiler version, EVM version, optimization settings). " +
        "Useful for: " +
        "- Testing that a contract compiles without errors " +
        "- Getting the ABI for contract interaction " +
        "- Analyzing bytecode size and structure " +
        "- Preparing compilation metadata for later deployment or verification " +
        "- Debugging compilation issues in isolation",
    inputSchema: {
        solidity_source: z.string().describe("Complete Solidity source code to compile"),
        contract_name: z.string().optional().describe("Name of the contract to compile (auto-detected from source if not provided)"),
        solc_version: z.string().optional().describe("Solidity compiler version to use (default: 0.8.20)")
    }
};

/**
 * Validates the arguments for compiling a contract
 * @param args The arguments to validate
 * @returns True if the arguments are valid, false otherwise
 */
export function isCompileContractArgs(args: unknown): args is {
    solidity_source: string,
    contract_name?: string,
    solc_version?: string
} {
    return (
        typeof args === "object" &&
        args !== null &&
        "solidity_source" in args &&
        typeof (args as { solidity_source: string }).solidity_source === "string" &&
        (!("contract_name" in args) || typeof (args as { contract_name: string }).contract_name === "string") &&
        (!("solc_version" in args) || typeof (args as { solc_version: string }).solc_version === "string")
    );
}

/**
 * Handler for the compileContract tool
 * @param args The arguments for the tool
 * @returns The tool response with compilation results
 */
export async function compileContractHandler(args: any): Promise<any> {
    if (!isCompileContractArgs(args)) {
        throw new Error("Invalid arguments for compile_contract");
    }

    const {
        solidity_source,
        contract_name,
        solc_version
    } = args;

    try {
        // Compile the contract using the core compilation function
        const compilationResult = await compileSolidity(
            solidity_source,
            contract_name,
            solc_version
        );

        // Handle compilation failure
        if (!compilationResult.success || !compilationResult.bytecode || !compilationResult.abi) {
            const errorMessage = compilationResult.errors?.join('\n\n') || 'Unknown compilation error';
            const warningMessage = compilationResult.warnings && compilationResult.warnings.length > 0
                ? `\n\nWarnings:\n${compilationResult.warnings.join('\n')}`
                : '';

            return {
                structuredContent: {
                    success: false,
                    errors: compilationResult.errors,
                    warnings: compilationResult.warnings
                },
                content: [{
                    type: "text",
                    text: `Compilation Failed!\n\n${errorMessage}${warningMessage}`
                }],
                isError: true,
            };
        }

        // Calculate bytecode size
        const bytecodeSize = (compilationResult.bytecode.length - 2) / 2; // Remove '0x' prefix and convert hex to bytes
        const bytecodeSizeKB = (bytecodeSize / 1024).toFixed(2);

        // Build formatted response text
        let formattedText = `Contract Compiled Successfully!\n\n`;
        formattedText += `Contract Name: ${compilationResult.contractName}\n`;
        formattedText += `Compiler Version: ${compilationResult.compilerVersion}\n`;
        formattedText += `EVM Version: ${compilationResult.evmVersion}\n`;
        formattedText += `Optimization: Enabled (${compilationResult.optimizationRuns} runs)\n`;
        formattedText += `Bytecode Size: ${bytecodeSize} bytes (${bytecodeSizeKB} KB)\n`;

        // Check if bytecode size is close to or exceeds the 24KB limit
        if (bytecodeSize > 24576) {
            formattedText += `\n⚠️  Warning: Bytecode exceeds the 24KB contract size limit!\n`;
            formattedText += `Deployment will fail. Consider optimizing or splitting the contract.\n`;
        } else if (bytecodeSize > 22000) {
            formattedText += `\n⚠️  Warning: Bytecode is approaching the 24KB contract size limit.\n`;
        }

        if (compilationResult.warnings && compilationResult.warnings.length > 0) {
            formattedText += `\nCompilation Warnings:\n${compilationResult.warnings.join('\n')}\n`;
        }

        formattedText += `\nThe bytecode and ABI are included in the response.`;
        formattedText += `\nYou can use this ABI to interact with deployed instances of this contract.`;

        return {
            structuredContent: {
                success: true,
                bytecode: compilationResult.bytecode,
                abi: compilationResult.abi,
                warnings: compilationResult.warnings,
                bytecodeSize: bytecodeSize,
                bytecodeSizeKB: parseFloat(bytecodeSizeKB),
                verificationMetadata: {
                    sourceCode: compilationResult.sourceCode!,
                    contractName: compilationResult.contractName!,
                    compilerVersion: compilationResult.compilerVersion!,
                    evmVersion: compilationResult.evmVersion!,
                    optimizationEnabled: compilationResult.optimizationEnabled!,
                    optimizationRuns: compilationResult.optimizationRuns!
                }
            },
            content: [{ type: "text", text: formattedText }],
            isError: false,
        };

    } catch (error: any) {
        console.error('Error compiling contract:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
            structuredContent: {
                success: false,
                errors: [errorMessage]
            },
            content: [{
                type: "text",
                text: `Compilation Error!\n\n${errorMessage}\n\nPlease check your Solidity source code and try again.`
            }],
            isError: true,
        };
    }
}

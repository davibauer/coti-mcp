import solc from 'solc';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * EVM version for COTI blockchain compatibility
 * COTI requires evmVersion "paris" for all smart contracts
 */
const COTI_EVM_VERSION = 'paris';

/**
 * Resolves external imports from node_modules
 * Supports: @coti-io/coti-contracts, coti-contracts, @openzeppelin/contracts
 * @param importPath The import path from the Solidity contract
 * @returns Object with contents or error
 */
function findImports(importPath: string): { contents?: string; error?: string } {
    try {
        // Map of package prefixes to their actual node_modules locations
        const packageMappings: { [key: string]: string } = {
            'coti-contracts/': '@coti-io/coti-contracts/',
            '@coti-io/coti-contracts/': '@coti-io/coti-contracts/',
            '@openzeppelin/contracts/': '@openzeppelin/contracts/'
        };

        let resolvedPath: string | null = null;

        // Try to resolve the import using package mappings
        for (const [prefix, packagePath] of Object.entries(packageMappings)) {
            if (importPath.startsWith(prefix)) {
                // Remove the prefix and construct the full path
                const relativePath = importPath.substring(prefix.length);
                resolvedPath = join(process.cwd(), 'node_modules', packagePath, relativePath);
                break;
            }
        }

        // If no package mapping matched, treat it as a relative import or direct node_modules path
        if (!resolvedPath) {
            // Try as direct node_modules path
            resolvedPath = join(process.cwd(), 'node_modules', importPath);
        }

        // Try to read the file
        if (existsSync(resolvedPath)) {
            const contents = readFileSync(resolvedPath, 'utf8');
            return { contents };
        } else {
            // File not found - provide helpful error message
            return {
                error: `File not found: ${importPath}\nAttempted path: ${resolvedPath}\n\nSupported import patterns:\n- coti-contracts/... (for @coti-io/coti-contracts)\n- @coti-io/coti-contracts/...\n- @openzeppelin/contracts/...`
            };
        }
    } catch (error) {
        return {
            error: `Error resolving import '${importPath}': ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export interface CompilationResult {
    success: boolean;
    bytecode?: string;
    abi?: any[];
    errors?: string[];
    warnings?: string[];
    sourceCode?: string;           // Preserve original source for verification
    contractName?: string;          // Contract name
    compilerVersion?: string;       // e.g., "v0.8.20+commit.a1b2c3d4"
    evmVersion?: string;            // "paris"
    optimizationEnabled?: boolean;  // true
    optimizationRuns?: number;      // 200
}

/**
 * Compiles Solidity source code using solc-js for COTI blockchain deployment
 * @param source The Solidity source code to compile
 * @param contractName The name of the contract (default: extracted from source)
 * @param solcVersion The Solidity compiler version to use (default: 0.8.20)
 * @returns CompilationResult with bytecode, ABI, and any errors/warnings
 * @note EVM version is automatically set to "paris" for COTI blockchain compatibility
 */
export async function compileSolidity(
    source: string,
    contractName?: string,
    solcVersion: string = '0.8.20'
): Promise<CompilationResult> {
    try {
        // Extract contract name from source if not provided
        if (!contractName) {
            const contractMatch = source.match(/contract\s+(\w+)/);
            if (contractMatch) {
                contractName = contractMatch[1];
            } else {
                return {
                    success: false,
                    errors: ['Could not extract contract name from source code']
                };
            }
        }

        // Prepare input for Solidity compiler
        const input = {
            language: 'Solidity',
            sources: {
                'contract.sol': {
                    content: source
                }
            },
            settings: {
                evmVersion: COTI_EVM_VERSION,
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                outputSelection: {
                    '*': {
                        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object']
                    }
                }
            }
        };

        // Compile the contract with import callback for external dependencies
        const output = JSON.parse(
            solc.compile(JSON.stringify(input), { import: findImports })
        );

        // Check for errors
        const errors: string[] = [];
        const warnings: string[] = [];

        if (output.errors) {
            for (const error of output.errors) {
                if (error.severity === 'error') {
                    errors.push(error.formattedMessage || error.message);
                } else if (error.severity === 'warning') {
                    warnings.push(error.formattedMessage || error.message);
                }
            }
        }

        // If there are compilation errors, return them
        if (errors.length > 0) {
            return {
                success: false,
                errors,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }

        // Extract bytecode and ABI
        const contract = output.contracts['contract.sol'][contractName];

        if (!contract) {
            return {
                success: false,
                errors: [`Contract '${contractName}' not found in compilation output`]
            };
        }

        const bytecode = contract.evm.bytecode.object;
        const abi = contract.abi;

        // Validate bytecode
        if (!bytecode || bytecode.length === 0) {
            return {
                success: false,
                errors: ['Compilation produced empty bytecode']
            };
        }

        // Check bytecode size (Ethereum has a 24KB limit)
        const bytecodeSize = bytecode.length / 2; // Convert hex string length to bytes
        if (bytecodeSize > 24576) {
            warnings.push(`Warning: Contract bytecode size (${bytecodeSize} bytes) exceeds 24KB limit. Deployment may fail.`);
        }

        // Get actual compiler version with commit hash for verification
        const compilerVersionInfo = solc.version();

        return {
            success: true,
            bytecode: '0x' + bytecode,
            abi,
            warnings: warnings.length > 0 ? warnings : undefined,
            sourceCode: source,
            contractName: contractName,
            compilerVersion: compilerVersionInfo,
            evmVersion: COTI_EVM_VERSION,
            optimizationEnabled: true,
            optimizationRuns: 200
        };

    } catch (error) {
        return {
            success: false,
            errors: [`Compilation failed: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
}

/**
 * Validates that a compiled contract implements required interfaces
 * @param abi The contract ABI
 * @param requiredFunctions Array of function names that must be present
 * @returns Object with validation result and missing functions
 */
export function validateContractInterface(
    abi: any[],
    requiredFunctions: string[]
): { valid: boolean; missingFunctions: string[] } {
    const functionNames = abi
        .filter(item => item.type === 'function')
        .map(item => item.name);

    const missingFunctions = requiredFunctions.filter(
        fn => !functionNames.includes(fn)
    );

    return {
        valid: missingFunctions.length === 0,
        missingFunctions
    };
}

/**
 * Validates that a contract is a valid ERC20 token
 * @param abi The contract ABI
 * @returns Validation result
 */
export function validateERC20Interface(abi: any[]): { valid: boolean; missingFunctions: string[] } {
    const requiredFunctions = [
        'name',
        'symbol',
        'decimals',
        'totalSupply',
        'balanceOf',
        'transfer',
        'transferFrom',
        'approve',
        'allowance'
    ];

    return validateContractInterface(abi, requiredFunctions);
}

/**
 * Validates that a contract is a valid ERC721 token
 * @param abi The contract ABI
 * @returns Validation result
 */
export function validateERC721Interface(abi: any[]): { valid: boolean; missingFunctions: string[] } {
    const requiredFunctions = [
        'name',
        'symbol',
        'balanceOf',
        'ownerOf',
        'transferFrom',
        'safeTransferFrom',
        'approve',
        'setApprovalForAll',
        'getApproved',
        'isApprovedForAll'
    ];

    return validateContractInterface(abi, requiredFunctions);
}

import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getNetwork } from "../shared/account.js";
import { getDefaultProvider, Wallet, Contract } from "@coti-io/coti-ethers";
import { ERC20_ABI, ERC721_ABI } from "../constants/abis.js";
import { z } from "zod";
export const CALL_CONTRACT_FUNCTION: ToolAnnotations = {
    title: "Call Contract Function",
    name: "call_contract_function",
    description:
        "Call any function on a smart contract on the COTI blockchain. " +
        "Supports both read-only (view/pure) functions and state-changing (write) functions. " +
        "Read-only functions return data without creating a transaction. " +
        "State-changing functions create transactions and may require gas_limit. " +
        "Returns the function result in a human-readable format.",
    inputSchema: {
        private_key: z.string().describe("Private key of the account (tracked by AI from previous operations)"),
        aes_key: z.string().optional().describe("AES key for private transactions (tracked by AI). Required for private operations."),
        network: z.enum(['testnet', 'mainnet']).describe("Network to use: 'testnet' or 'mainnet' (required)."),
        contract_address: z.string().describe("Address of the smart contract to call"),
        function_name: z.string().describe("Name of the function to call on the contract"),
        function_args: z.array(z.string()).describe("Array of arguments to pass to the function (can be empty if function takes no arguments)"),
        abi: z.string().optional().describe("Optional JSON string representation of the contract ABI. If not provided, will attempt to use standard ERC20/ERC721 ABIs."),
        gas_limit: z.string().optional().describe("Optional gas limit for state-changing functions. Not needed for read-only functions."),
    },
};

/**
 * Checks if the provided arguments are valid for the call_contract_function tool.
 * @param args The arguments to check.
 * @returns True if the arguments are valid, false otherwise.
 */
export function isCallContractFunctionArgs(args: unknown): args is { contract_address: string, function_name: string, function_args: string[], abi?: string , private_key?: string, aes_key?: string, network: 'testnet' | 'mainnet', gas_limit?: string } {
    return (
        typeof args === "object" &&
        args !== null &&
        "contract_address" in args &&
        typeof (args as { contract_address: string }).contract_address === "string" &&
        "function_name" in args &&
        typeof (args as { function_name: string }).function_name === "string" &&
        "function_args" in args &&
        Array.isArray((args as { function_args: string[] }).function_args) &&
        (!("gas_limit" in args) || typeof (args as { gas_limit: string }).gas_limit === "string")
    );
}

/**
 * Calls a function on a smart contract.
 * @param contract_address The address of the smart contract to call.
 * @param function_name The name of the function to call.
 * @param function_args The arguments to pass to the function.
 * @param abi The ABI of the smart contract.
 * @param gas_limit Optional gas limit for state-changing functions.
 * @returns An object with function call results and formatted text.
 */
export async function performCallContractFunction(private_key: string, aes_key: string, contract_address: string, function_name: string, function_args: string[], network: 'testnet' | 'mainnet', abi?: string, gas_limit?: string): Promise<{
    contractAddress: string,
    functionName: string,
    functionArgs: any[],
    result: any,
    formattedResult: string,
    contractType?: string,
    formattedText: string
}> {
    try {
        const provider = getDefaultProvider(getNetwork(network));
        const wallet = new Wallet(private_key, provider);
        
        wallet.setAesKey(aes_key);
        
        let contractAbi;
        if (abi) {
            try {
                contractAbi = JSON.parse(abi);
            } catch (e) {
                throw new Error(`Invalid ABI format: ${e instanceof Error ? e.message : String(e)}`);
            }
        } else {
            try {
                const tempContract = new Contract(contract_address, ERC20_ABI, wallet);
                await tempContract.decimals();
                contractAbi = ERC20_ABI;
            } catch (e) {
                try {
                    const tempContract = new Contract(contract_address, ERC721_ABI, wallet);
                    await tempContract.ownerOf(1);
                    contractAbi = ERC721_ABI;
                } catch (e2) {
                    throw new Error('Could not determine contract type. Please provide the ABI.');
                }
            }
        }
        
        const contract = new Contract(contract_address, contractAbi, wallet);
        
        if (!contract[function_name]) {
            throw new Error(`Function '${function_name}' not found in contract. Check the function name or provide a custom ABI.`);
        }
        
        const processedArgs = function_args.map(arg => {
            if (arg.toLowerCase() === 'true') return true;
            if (arg.toLowerCase() === 'false') return false;
            if (arg.match(/^0x[0-9a-fA-F]{40}$/)) return arg;
            if (arg.match(/^-?\d+$/)) return BigInt(arg);
            if (arg.match(/^-?\d+\.\d+$/)) return parseFloat(arg);
            return arg;
        });

        // Add gas limit for state-changing transactions if provided
        const txOptions: any = gas_limit ? { gasLimit: gas_limit } : {};

        const result = await contract[function_name](...processedArgs, txOptions);

        // Define replacer at function scope for reuse with BigInt serialization
        const replacer = (key: string, value: any) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        };

        let formattedResult: string;
        if (typeof result === 'object' && result !== null) {
            if (Array.isArray(result)) {
                formattedResult = JSON.stringify(result, replacer, 2);
            } else if (result._isBigNumber || typeof result.toString === 'function') {
                formattedResult = result.toString();
            } else {
                formattedResult = JSON.stringify(result, replacer, 2);
            }
        } else if (typeof result === 'bigint') {
            formattedResult = result.toString();
        } else {
            formattedResult = String(result);
        }
        
        const formattedText = `Function Call Successful!\n\nContract: ${contract_address}\n\nFunction: ${function_name}\n\nArguments: ${JSON.stringify(processedArgs, replacer)}\n\nResult: ${formattedResult}`;
        
        let contractType: string | undefined;
        if (contractAbi === ERC20_ABI) {
            contractType = 'ERC20';
        } else if (contractAbi === ERC721_ABI) {
            contractType = 'ERC721';
        }

        // Convert BigInt in processedArgs to string for safe serialization
        const serializableArgs = processedArgs.map(arg =>
            typeof arg === 'bigint' ? arg.toString() : arg
        );

        return {
            contractAddress: contract_address,
            functionName: function_name,
            functionArgs: serializableArgs,
            result,
            formattedResult,
            contractType,
            formattedText
        };
    } catch (error) {
        console.error('Error calling contract function:', error);
        throw new Error(`Failed to call contract function: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Handler for the callContractFunction tool
 * @param args The arguments for the tool
 * @returns The tool response
 */
export async function callContractFunctionHandler(args: any): Promise<any> {
    if (!isCallContractFunctionArgs(args)) {
        throw new Error("Invalid arguments for call_contract_function");
    }
    const { contract_address, function_name, function_args, abi, network, private_key, aes_key, gas_limit } = args;

    if (!private_key || !aes_key) {
        throw new Error("private_key and aes_key are required");
    }

    const results = await performCallContractFunction(private_key, aes_key, contract_address, function_name, function_args, network, abi, gas_limit);
    return {
        structuredContent: {
            contractAddress: results.contractAddress,
            functionName: results.functionName,
            functionArgs: results.functionArgs,
            result: results.result,
            formattedResult: results.formattedResult,
            contractType: results.contractType
        },
        content: [{ type: "text", text: results.formattedText }],
        isError: false,
    };
}
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ethers } from "@coti-io/coti-ethers";
import { z } from "zod";
import { SessionManager } from "./src/session/SessionManager.js";
import { SessionContext } from "./src/types/session.js";
import { SessionKeys } from "./src/types/session.js";

// Account Tools

import { CHANGE_DEFAULT_ACCOUNT, changeDefaultAccountHandler } from './tools/account/changeDefaultAccount.js';
import { CREATE_ACCOUNT, createAccountHandler } from './tools/account/createAccount.js';
import { ENCRYPT_VALUE, encryptValueHandler } from "./tools/account/encryptValue.js";
import { DECRYPT_VALUE, decryptValueHandler } from "./tools/account/decryptValue.js";
import { EXPORT_ACCOUNTS, exportAccountsHandler } from "./tools/account/exportAccounts.js";
import { GENERATE_AES_KEY, generateAesKeyHandler } from "./tools/account/generateAesKey.js";
import { GET_CURRENT_NETWORK, getCurrentNetworkHandler } from './tools/account/getCurrentNetwork.js';
import { IMPORT_ACCOUNTS, importAccountsHandler } from "./tools/account/importAccounts.js";
import { LIST_ACCOUNTS, listAccountsHandler } from "./tools/account/listAccounts.js";
import { SIGN_MESSAGE, signMessageHandler } from "./tools/account/signMessage.js";
import { SWITCH_NETWORK, switchNetworkHandler } from "./tools/account/switchNetwork.js";
import { VERIFY_SIGNATURE, verifySignatureHandler } from "./tools/account/verifySignature.js";

// ERC20 Tools

import { APPROVE_ERC20_SPENDER, approveERC20SpenderHandler } from "./tools/erc20/approveErc20Spender.js";
import { DEPLOY_PRIVATE_ERC20_CONTRACT, deployPrivateERC20ContractHandler } from "./tools/erc20/deployPrivateErc20Contract.js";
import { GET_ERC20_ALLOWANCE, getERC20AllowanceHandler } from "./tools/erc20/getErc20Allowance.js";
import { GET_PRIVATE_ERC20_TOKEN_BALANCE, getPrivateERC20BalanceHandler } from "./tools/erc20/getPrivateErc20Balance.js";
import { GET_PRIVATE_ERC20_DECIMALS, getPrivateERC20DecimalsHandler } from "./tools/erc20/getPrivateErc20Decimals.js";
import { GET_PRIVATE_ERC20_TOTAL_SUPPLY, getPrivateERC20TotalSupplyHandler } from "./tools/erc20/getPrivateErc20TotalSupply.js";
import { MINT_PRIVATE_ERC20_TOKEN, mintPrivateERC20TokenHandler } from "./tools/erc20/mintPrivateErc20Token.js";
import { TRANSFER_PRIVATE_ERC20_TOKEN, transferPrivateERC20TokenHandler } from "./tools/erc20/transferPrivateErc20.js";

// ERC721 Tools

import { APPROVE_PRIVATE_ERC721, approvePrivateERC721Handler } from "./tools/erc721/approvePrivateErc721.js";
import { DEPLOY_PRIVATE_ERC721_CONTRACT, deployPrivateERC721ContractHandler } from "./tools/erc721/deployPrivateErc721Contract.js";
import { GET_PRIVATE_ERC721_APPROVED, getPrivateERC721ApprovedHandler } from "./tools/erc721/getPrivateErc721Approved.js";
import { GET_PRIVATE_ERC721_BALANCE, getPrivateERC721BalanceHandler } from "./tools/erc721/getPrivateErc721Balance.js";
import { GET_PRIVATE_ERC721_IS_APPROVED_FOR_ALL, getPrivateERC721IsApprovedForAllHandler } from "./tools/erc721/getPrivateErc721IsApprovedForAll.js";
import { GET_PRIVATE_ERC721_TOKEN_OWNER, getPrivateERC721TokenOwnerHandler } from "./tools/erc721/getPrivateErc721TokenOwner.js";
import { GET_PRIVATE_ERC721_TOKEN_URI, getPrivateERC721TokenURIHandler } from "./tools/erc721/getPrivateErc721TokenUri.js";
import { GET_PRIVATE_ERC721_TOTAL_SUPPLY, getPrivateERC721TotalSupplyHandler } from "./tools/erc721/getPrivateErc721TotalSupply.js";
import { MINT_PRIVATE_ERC721_TOKEN, mintPrivateERC721TokenHandler } from "./tools/erc721/mintPrivateErc721Token.js";
import { SET_PRIVATE_ERC721_APPROVAL_FOR_ALL, setPrivateERC721ApprovalForAllHandler } from "./tools/erc721/setPrivateErc721ApprovalForAll.js";
import { TRANSFER_PRIVATE_ERC721_TOKEN, transferPrivateERC721TokenHandler } from "./tools/erc721/transferPrivateErc721.js";

// Native Tools

import { GET_NATIVE_BALANCE, getNativeBalanceHandler } from "./tools/native/getNativeBalance.js";
import { TRANSFER_NATIVE, transferNativeHandler } from "./tools/native/transferNative.js";

// Transaction Tools

import { CALL_CONTRACT_FUNCTION, callContractFunctionHandler } from "./tools/transaction/callContractFunction.js";
import { DECODE_EVENT_DATA, decodeEventDataHandler } from "./tools/transaction/decodeEventData.js";
import { GET_TRANSACTION_LOGS, getTransactionLogsHandler } from "./tools/transaction/getTransactionLogs.js";
import { GET_TRANSACTION_STATUS, getTransactionStatusHandler } from "./tools/transaction/getTransactionStatus.js";

export const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
  cotiMcpAesKey: z.string().describe("COTI MCP AES key for encrypting values.").optional(),
  cotiMcpPrivateKey: z.string().describe("COTI MCP private key for signing transactions.").optional(),
  cotiMcpNetwork: z.string().describe("COTI MCP network to connect to.").optional().default("testnet"),
});

export default function ({ config }: { config: z.infer<typeof configSchema> }) {

  // Global SessionManager instance
  const sessionManager = new SessionManager();

  /**
   * Wrapper function that extracts session context from MCP's extra parameter
   * and passes it to the tool handler.
   *
   * MCP handlers receive: (args, extra) where extra contains sessionId
   * Our wrapped handlers receive: (sessionContext, args)
   */
  function withSession(
    handler: (sessionContext: SessionContext, args: any) => Promise<any>
  ) {
    return async (args: any, extra: any) => {
      const sessionId = extra?.sessionId;

      if (!sessionId) {
        throw new Error("No session ID provided by MCP transport");
      }

      // Get or create session
      let session = sessionManager.getSession(sessionId);
      if (!session) {
        console.error(`[MCP] Creating new session for ID: ${sessionId}`);
        sessionManager.createSession(sessionId);
        session = sessionManager.getSession(sessionId);
        if (!session) {
          throw new Error(`Failed to create session for ID: ${sessionId}`);
        }

        // Initialize default network in new session
        session.set(SessionKeys.NETWORK, config.cotiMcpNetwork || 'testnet');
      }

      const sessionContext: SessionContext = {
        storage: session,
        sessionId: sessionId
      };

      return handler(sessionContext, args);
    };
  }

  const server = new McpServer({
    name: "COTI MCP Server",
    version: "0.2.1",
    description: "COTI MCP Server",
  });

  // Account Tools

  server.registerTool("change_default_account",
    CHANGE_DEFAULT_ACCOUNT,
    withSession(changeDefaultAccountHandler)
  );

  server.registerTool("create_account",
    CREATE_ACCOUNT,
    withSession(createAccountHandler)
  );

  server.registerTool("decrypt_value",
    DECRYPT_VALUE,
    withSession(decryptValueHandler)
  );

  server.registerTool("get_current_network",
    GET_CURRENT_NETWORK,
    withSession(getCurrentNetworkHandler)
  );

  server.registerTool("encrypt_value",
    ENCRYPT_VALUE,
    withSession(encryptValueHandler)
  );

  server.registerTool("export_accounts",
    EXPORT_ACCOUNTS,
    withSession(exportAccountsHandler)
  );

  server.registerTool("generate_aes_key",
    GENERATE_AES_KEY,
    withSession(generateAesKeyHandler)
  );

  server.registerTool("import_accounts",
    IMPORT_ACCOUNTS,
    withSession(importAccountsHandler)
  );

  server.registerTool("list_accounts",
    LIST_ACCOUNTS,
    withSession(listAccountsHandler)
  );

  server.registerTool("sign_message",
    SIGN_MESSAGE,
    withSession(signMessageHandler)
  );

  server.registerTool("switch_network",
    SWITCH_NETWORK,
    withSession(switchNetworkHandler)
  );

  server.registerTool("verify_signature",
    VERIFY_SIGNATURE,
    withSession(verifySignatureHandler)
  );

  // ERC20 Tools

  server.registerTool("approve_erc20_spender",
    APPROVE_ERC20_SPENDER,
    withSession(approveERC20SpenderHandler)
  );

  server.registerTool("deploy_private_erc20_contract",
    DEPLOY_PRIVATE_ERC20_CONTRACT,
    withSession(deployPrivateERC20ContractHandler)
  );

  server.registerTool("get_private_erc20_allowance",
    GET_ERC20_ALLOWANCE,
    withSession(getERC20AllowanceHandler)
  );

  server.registerTool("get_private_erc20_balance",
    GET_PRIVATE_ERC20_TOKEN_BALANCE,
    withSession(getPrivateERC20BalanceHandler)
  );

  server.registerTool("get_private_erc20_decimals",
    GET_PRIVATE_ERC20_DECIMALS,
    withSession(getPrivateERC20DecimalsHandler)
  );

  server.registerTool("get_private_erc20_total_supply",
    GET_PRIVATE_ERC20_TOTAL_SUPPLY,
    withSession(getPrivateERC20TotalSupplyHandler)
  );

  server.registerTool("mint_private_erc20_token",
    MINT_PRIVATE_ERC20_TOKEN,
    withSession(mintPrivateERC20TokenHandler)
  );

  server.registerTool("transfer_private_erc20",
    TRANSFER_PRIVATE_ERC20_TOKEN,
    withSession(transferPrivateERC20TokenHandler)
  );

  // ERC721 Tools

  server.registerTool("approve_private_erc721",
    APPROVE_PRIVATE_ERC721,
    withSession(approvePrivateERC721Handler)
  );

  server.registerTool("deploy_private_erc721_contract",
    DEPLOY_PRIVATE_ERC721_CONTRACT,
    withSession(deployPrivateERC721ContractHandler)
  );

  server.registerTool("get_private_erc721_approved",
    GET_PRIVATE_ERC721_APPROVED,
    withSession(getPrivateERC721ApprovedHandler)
  );

  server.registerTool("get_private_erc721_balance",
    GET_PRIVATE_ERC721_BALANCE,
    withSession(getPrivateERC721BalanceHandler)
  );

  server.registerTool("get_private_erc721_is_approved_for_all",
    GET_PRIVATE_ERC721_IS_APPROVED_FOR_ALL,
    withSession(getPrivateERC721IsApprovedForAllHandler)
  );

  server.registerTool("get_private_erc721_token_owner",
    GET_PRIVATE_ERC721_TOKEN_OWNER,
    withSession(getPrivateERC721TokenOwnerHandler)
  );

  server.registerTool("get_private_erc721_token_uri",
    GET_PRIVATE_ERC721_TOKEN_URI,
    withSession(getPrivateERC721TokenURIHandler)
  );

  server.registerTool("get_private_erc721_total_supply",
    GET_PRIVATE_ERC721_TOTAL_SUPPLY,
    withSession(getPrivateERC721TotalSupplyHandler)
  );

  server.registerTool("mint_private_erc721_token",
    MINT_PRIVATE_ERC721_TOKEN,
    withSession(mintPrivateERC721TokenHandler)
  );

  server.registerTool("set_private_erc721_approval_for_all",
    SET_PRIVATE_ERC721_APPROVAL_FOR_ALL,
    withSession(setPrivateERC721ApprovalForAllHandler)
  );

  server.registerTool("transfer_private_erc721",
    TRANSFER_PRIVATE_ERC721_TOKEN,
    withSession(transferPrivateERC721TokenHandler)
  );

  // Transaction Tools

  server.registerTool("call_contract_function",
    CALL_CONTRACT_FUNCTION,
    withSession(callContractFunctionHandler)
  );

  server.registerTool("decode_event_data",
    DECODE_EVENT_DATA,
    withSession(decodeEventDataHandler)
  );

  server.registerTool("get_transaction_status",
    GET_TRANSACTION_STATUS,
    withSession(getTransactionStatusHandler)
  );

  server.registerTool("get_transaction_logs",
    GET_TRANSACTION_LOGS,
    withSession(getTransactionLogsHandler)
  );

  // Native

  server.registerTool("get_native_balance",
    GET_NATIVE_BALANCE,
    withSession(getNativeBalanceHandler)
  );

  server.registerTool("transfer_native",
    TRANSFER_NATIVE,
    withSession(transferNativeHandler)
  );

  return server.server;
}
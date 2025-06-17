[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/davibauer-coti-mcp-badge.png)](https://mseep.ai/app/davibauer-coti-mcp)

# <img src="https://coti.io/favicon.ico" height="32"> COTI Blockchain MCP

[![smithery badge](https://smithery.ai/badge/@davibauer/coti-mcp)](https://smithery.ai/server/@davibauer/coti-mcp)

The MCP server integrates COTI blockchain access into AI applications, enabling interaction with several tools for private token operations.

## Table of Contents

- [Overview](#overview)
- [Available Tools](#available-tools)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Additional Resources](#additional-resources)

## Overview

This MCP (Model Context Protocol) server provides a complete implementation for interacting with the COTI blockchain, focusing on private token operations. It allows AI applications to deploy, mint, transfer, and manage both ERC20 tokens and ERC721 NFTs with privacy features enabled through COTI's MPC (Multi-Party Computation) technology.

## Available Tools

### get_native_balance

**Description:**  
Get the native COTI token balance of a COTI blockchain account. This is used for checking the current balance of a COTI account. Returns the account balance in COTI tokens.

**Input Parameters:**
- `account_address` (required): COTI account address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273

### get_private_erc20_balance

**Description:**  
Get the balance of a private ERC20 token on the COTI blockchain. This is used for checking the current balance of a private token for a COTI account. Returns the decrypted token balance.

**Input Parameters:**
- `account_address` (required): COTI account address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273
- `token_address` (required): ERC20 token contract address on COTI blockchain

### get_private_erc20_token_info

**Description:**  
Get comprehensive information about a private ERC20 token on the COTI blockchain. This returns details including the token name, symbol, decimals, total supply, and contract address. Returns formatted token information.

**Input Parameters:**
- `token_address` (required): ERC20 token contract address on COTI blockchain

### get_private_erc20_total_supply

**Description:**  
Get the total supply of tokens for a private ERC20 token on the COTI blockchain. This is used for checking how many tokens have been minted in this token. Returns the total number of tokens in this contract.

**Input Parameters:**
- `token_address` (required): ERC20 token contract address on COTI blockchain

### get_private_erc20_decimals

**Description:**  
Get the number of decimals for a private ERC20 token on the COTI blockchain. This is used for checking the number of decimals in this token. Returns the number of decimals in this contract.

**Input Parameters:**
- `token_address` (required): ERC20 token contract address on COTI blockchain

### get_private_erc721_token_uri

**Description:**  
Get the tokenURI for a private ERC721 NFT token on the COTI blockchain. This is used for retrieving the metadata URI of a private NFT. Returns the decrypted tokenURI.

**Input Parameters:**
- `token_address` (required): ERC721 token contract address on COTI blockchain
- `token_id` (required): ID of the NFT token to get the URI for

### get_private_erc721_token_owner

**Description:**  
Get the owner address of a private ERC721 NFT token on the COTI blockchain. This is used for checking who currently owns a specific NFT. Returns the owner's address of the specified NFT.

**Input Parameters:**
- `token_address` (required): ERC721 token contract address on COTI blockchain
- `token_id` (required): ID of the NFT token to check ownership for

### get_private_erc721_total_supply

**Description:**  
Get the total supply of tokens for a private ERC721 NFT collection on the COTI blockchain. This is used for checking how many NFTs have been minted in a collection. Returns the total number of tokens in the collection.

**Input Parameters:**
- `token_address` (required): ERC721 token contract address on COTI blockchain

### transfer_native

**Description:**
Transfer native COTI tokens to another wallet. This is used for sending COTI tokens from your wallet to another address. Returns the transaction hash upon successful transfer.

**Input Parameters:**
- `recipient_address` (required): Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273
- `amount_wei` (required): Amount of COTI to transfer (in Wei)
- `gas_limit` (optional): Optional gas limit for the transaction

### transfer_private_erc20

**Description:**
Transfer private ERC20 tokens on the COTI blockchain. This is used for sending private tokens from your wallet to another address. Returns the transaction hash upon successful transfer.

**Input Parameters:**
- `token_address` (required): ERC20 token contract address on COTI blockchain
- `recipient_address` (required): Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273
- `amount_wei` (required): Amount of tokens to transfer (in Wei)
- `gas_limit` (optional): Optional gas limit for the transaction

### transfer_private_erc721

**Description:**
Transfer a private ERC721 NFT token on the COTI blockchain. This is used for sending a private NFT from your wallet to another address. Returns the transaction hash upon successful transfer.

**Input Parameters:**
- `token_address` (required): ERC721 token contract address on COTI blockchain
- `recipient_address` (required): Recipient COTI address, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273
- `token_id` (required): ID of the NFT token to transfer
- `use_safe_transfer` (optional): Whether to use safeTransferFrom instead of transferFrom. Default is false.
- `gas_limit` (optional): Optional gas limit for the transaction

### deploy_private_erc721_contract

**Description:**
Deploy a new standard private ERC721 NFT contract on the COTI blockchain. This creates a new private NFT collection with the specified name and symbol. Returns the deployed contract address upon successful deployment.

**Input Parameters:**
- `name` (required): Name of the NFT collection
- `symbol` (required): Symbol of the NFT collection (typically 3-5 characters)
- `gas_limit` (optional): Optional gas limit for the deployment transaction

### deploy_private_erc20_contract

**Description:**
Deploy a new standard private ERC20 token contract on the COTI blockchain. This creates a new private token with the specified name, symbol, and decimals. Returns the deployed contract address upon successful deployment.

**Input Parameters:**
- `name` (required): Name of the token
- `symbol` (required): Symbol of the token (typically 3-5 characters)
- `gas_limit` (optional): Optional gas limit for the deployment transaction

### mint_private_erc721_token

**Description:**
Mint a new private ERC721 NFT token on the COTI blockchain. This creates a new NFT in the specified collection with the provided token URI. Returns the transaction hash and token ID upon successful minting.

**Input Parameters:**
- `token_address` (required): ERC721 token contract address on COTI blockchain
- `to_address` (required): Address to receive the minted NFT
- `token_uri` (required): URI for the token metadata (can be IPFS URI or any other URI)
- `gas_limit` (optional): Optional gas limit for the minting transaction

### mint_private_erc20_token

**Description:**
Mint additional private ERC20 tokens on the COTI blockchain. This adds new tokens to the specified recipient address. Returns the transaction hash upon successful minting.

**Input Parameters:**
- `token_address` (required): ERC20 token contract address on COTI blockchain
- `recipient_address` (required): Address to receive the minted tokens
- `amount_wei` (required): Amount of tokens to mint in wei (smallest unit)
- `gas_limit` (optional): Optional gas limit for the minting transaction

### encrypt_value

**Description:**
Encrypt a value using the COTI AES key. This is used for encrypting values to be sent to another address. Returns the signature.

**Input Parameters:**
- `message` (required): Message to encrypt
- `contract_address` (required): Contract address
- `function_selector` (required): Function selector. To get the function selector, use the keccak256 hash of the function signature. For instance, for the transfer function of an ERC20 token, the function selector is '0xa9059cbb'.

### decrypt_value

**Description:**
Decrypt a value using the COTI AES key. Requires a ciphertext as input. Returns the decrypted value.

**Input Parameters:**
- `ciphertext` (required): Ciphertext to decrypt

### change_default_account

**Description:**
Change the default account used for COTI blockchain operations. This allows switching between different accounts configured in the environment. The account must be configured in the environment variables with corresponding private and AES keys. Returns the new default account address upon successful change.

**Input Parameters:**
- `account_address` (required): COTI account address to set as default, e.g., 0x0D7C5C1DA069fd7C1fAFBeb922482B2C7B15D273

### list_accounts

**Description:**
List all available COTI accounts configured in the environment. Returns the account addresses, current default account, and masked versions of the private and AES keys.

**Input Parameters:**
None

## Requirements

For this COTI Blockchain MCP, you need:
- NodeJS v18 or higher (https://nodejs.org/)
- COTI AES Key for API authentication
- COTI Private Key for signing transactions
- COTI Public Key that corresponds to the private key

## Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/coti-mcp.git
cd coti-mcp
```

2. Install dependencies
```bash
npm install
```

3. Build project
```bash
npm run build
```

This creates the file `build\index.js`

## Usage

### Smithery

Go to https://smithery.ai/server/@davibauer/coti-mcp and follow the instructions.

### Local

Add the following entry to `mcpServers`:

```
"coti-mcp": {
    "command": "node",
    "args": [
      "path\\build\\index.js"
    ],
    "env": {
      "COTI_MCP_AES_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "COTI_MCP_PUBLIC_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "COTI_MCP_PRIVATE_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "COTI_MCP_CURRENT_PUBLIC_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    }
}
```

and replace `path` with the path to COTI MCP and the placeholder values with your COTI keys.

Notes:
- You can configure multiple accounts by providing comma-separated values for `COTI_MCP_PUBLIC_KEY`, `COTI_MCP_PRIVATE_KEY`, and `COTI_MCP_AES_KEY`
- The `COTI_MCP_CURRENT_PUBLIC_KEY` is optional and will default to the first account if not specified

so that `mcpServers` will look like this:

```json
{
  "mcpServers": {
    "coti-mcp": {
      "command": "node",
      "args": [
        "path\\build\\index.js"
      ],
      "env": {
        "COTI_MCP_AES_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "COTI_MCP_PUBLIC_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "COTI_MCP_PRIVATE_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "COTI_MCP_CURRENT_PUBLIC_KEY": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
  }
}
```

## Additional Resources

- [COTI Documentation](https://docs.coti.io)
- [MCP Server Documentation](https://smithery.ai/server/@davibauer/coti-mcp)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

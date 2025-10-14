# <img src="https://coti.io/images/favicon.ico" height="32"> COTI MCP Server

[![smithery badge](https://smithery.ai/badge/@davibauer/coti-mcp)](https://smithery.ai/server/@davibauer/coti-mcp)

A Model Context Protocol (MCP) server that enables AI applications to interact with the COTI blockchain, specializing in private token operations using COTI's Multi-Party Computation (MPC) technology.

## Features

**Complete Account Management**
- Create, import, and export COTI accounts
- Switch between networks (testnet/devnet/mainnet)
- Generate AES keys and manage account credentials
- Sign messages and verify signatures
- Multi-account support with seamless switching

**Private ERC20 Token Operations**
- Deploy new private ERC20 contracts
- Comprehensive token information and allowance management
- Secure minting, transfer, and approval operations
- Balance, decimals, and supply tracking

**Private ERC721 NFT Operations**
- Deploy new private NFT collections
- Complete approval and ownership management
- Safe minting and transfer operations
- Token URI, balance, and collection supply tracking

**Transaction Management**
- Call arbitrary smart contract functions
- Monitor transaction status and retrieve logs
- Decode event data from transaction logs
- Full transaction lifecycle management

**Privacy & Encryption**
- Value encryption and decryption using COTI AES keys
- Full privacy support through MPC technology
- Secure transaction processing and message signing

## Available Tools

**Account Management (12 tools)**
- `change_default_account` - Switch between configured accounts
- `create_account` - Create new COTI account
- `decrypt_value` - Decrypt values with COTI AES key
- `encrypt_value` - Encrypt values with COTI AES key
- `export_accounts` - Export account configurations
- `generate_aes_key` - Generate new AES encryption key
- `get_current_network` - Get currently configured network
- `import_accounts` - Import account configurations
- `list_accounts` - List all configured accounts
- `sign_message` - Sign messages with account private key
- `switch_network` - Switch between COTI networks
- `verify_signature` - Verify message signatures

**Private ERC20 Operations (8 tools)**
- `approve_erc20_spender` - Approve spender for ERC20 tokens
- `deploy_private_erc20_contract` - Deploy new private ERC20 contract
- `get_private_erc20_allowance` - Get ERC20 token allowance
- `get_private_erc20_balance` - Get private token balance
- `get_private_erc20_decimals` - Get token decimals
- `get_private_erc20_total_supply` - Get token total supply
- `mint_private_erc20_token` - Mint private ERC20 tokens
- `transfer_private_erc20` - Transfer private ERC20 tokens

**Private ERC721 Operations (11 tools)**
- `approve_private_erc721` - Approve spender for specific NFT
- `deploy_private_erc721_contract` - Deploy new private NFT contract
- `get_private_erc721_approved` - Get approved spender for NFT
- `get_private_erc721_balance` - Get NFT balance for account
- `get_private_erc721_is_approved_for_all` - Check operator approval status
- `get_private_erc721_token_owner` - Get NFT token owner
- `get_private_erc721_token_uri` - Get NFT token URI
- `get_private_erc721_total_supply` - Get NFT collection total supply
- `mint_private_erc721_token` - Mint new private NFT
- `set_private_erc721_approval_for_all` - Set operator approval for all NFTs
- `transfer_private_erc721` - Transfer private NFTs

**Transaction Management (4 tools)**
- `call_contract_function` - Call smart contract functions
- `decode_event_data` - Decode transaction event data
- `get_transaction_logs` - Get transaction event logs
- `get_transaction_status` - Get transaction status and details

**Native Token Operations (2 tools)**
- `get_native_balance` - Get native COTI token balance
- `transfer_native` - Transfer native COTI tokens

## Requirements

- Node.js v18 or higher
- COTI AES Key for API authentication
- COTI Private Key for signing transactions
- COTI Public Key corresponding to the private key

## Setup

### Installation

```bash
git clone https://github.com/davibauer/coti-mcp.git
cd coti-mcp
npm install
npm run build
```

### Distribution

**Smithery**
```bash
npx -y @smithery/cli install @davibauer/coti-mcp
```

**Local Configuration**

Add to your Claude desktop configuration:

```json
{
  "mcpServers": {
    "coti-mcp": {
      "command": "node",
      "args": ["path/to/build/index.js"],
      "env": {
        "COTI_MCP_AES_KEY": "your_aes_key_here",
        "COTI_MCP_PUBLIC_KEY": "your_public_key_here",
        "COTI_MCP_PRIVATE_KEY": "your_private_key_here",
        "COTI_MCP_CURRENT_PUBLIC_KEY": "current_account_public_key"
      }
    }
  }
}
```

**Multi-Account Support**

Configure multiple accounts using comma-separated values:

```json
"env": {
  "COTI_MCP_AES_KEY": "key1,key2,key3",
  "COTI_MCP_PUBLIC_KEY": "pub1,pub2,pub3",
  "COTI_MCP_PRIVATE_KEY": "priv1,priv2,priv3",
  "COTI_MCP_CURRENT_PUBLIC_KEY": "pub1"
}
```

## Resources

- [COTI Documentation](https://docs.coti.io)
- [Smithery Server Page](https://smithery.ai/server/@davibauer/coti-mcp)

## License

MIT License - see LICENSE file for details.

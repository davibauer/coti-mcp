# <img src="https://coti.io/images/favicon.ico" height="32"> COTI MCP Server

[![smithery badge](https://smithery.ai/badge/@davibauer/coti-mcp)](https://smithery.ai/server/@davibauer/coti-mcp)

A Model Context Protocol (MCP) server that enables AI applications to interact with the COTI blockchain, specializing in private token operations using COTI's Multi-Party Computation (MPC) technology.

## Available Tools

**Account Management (12 tools)**
- `create_account` - Create new COTI account
- `import_account_from_private_key` - Import an existing account from a private key
- `decrypt_value` - Decrypt values with COTI AES key
- `encrypt_value` - Encrypt values with COTI AES key
- `decrypt_message` - Decrypt encrypted messages with COTI AES key
- `encrypt_message` - Encrypt messages with COTI AES key
- `generate_aes_key` - Generate new AES encryption key
- `get_current_network` - Get currently configured network
- `get_current_rpc` - Get the RPC URL for the current network
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

**Smart Contract Tools (2 tools)**
- `compile_contract` - Compile a Solidity smart contract
- `compile_and_deploy_contract` - Compile and deploy a Solidity smart contract

**Private Message Operations (5 tools)**
- `deploy_private_message_contract` - Deploy a private message contract
- `send_private_message` - Send a private encrypted message
- `read_private_message` - Read a private encrypted message
- `get_private_message_count` - Get the number of private messages received
- `get_private_message_senders` - Get the list of message senders

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
npm run dev
```

### Distribution

**Smithery**
```bash
npx -y @smithery/cli install @davibauer/coti-mcp --client claude
```

**Local Configuration**

Add to your Claude desktop configuration:

```json
{
  "mcpServers": {
    "coti-mcp": {
      "command": "node",
      "args": ["path/to/build/index.js"]
    }
  }
}
```

**Docker (Self-Hosted)**

Build and run the server as a Docker container exposing an HTTP endpoint:

```bash
docker-compose up --build
```

The server will be available at `http://localhost:3000`. Configure your MCP client to connect remotely:

```json
{
  "mcpServers": {
    "coti-mcp": {
      "url": "http://your-server-ip:3000/mcp"
    }
  }
}
```

If you want to add it in Claude Code:

```bash
claude mcp add-json coti '{"type":"http","url":"http://localhost:3000/mcp"}'
```

You can verify the server is running with:

```bash
curl http://localhost:3000/health
```

To enable bearer token authentication, set `MCP_AUTH_TOKEN` in your environment or `docker-compose.yml`. Clients must then include `Authorization: Bearer <token>` in every request.

For production deployments, place the server behind a reverse proxy (e.g. nginx or Caddy) with TLS enabled.

After connecting, use the account management tools to create accounts:
- `create_account` - Create a new account

## Resources

- [COTI Documentation](https://docs.coti.io)
- [Smithery Server Page](https://smithery.ai/server/@davibauer/coti-mcp)

## License

MIT License - see LICENSE file for details.
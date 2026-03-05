#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerAllTools } from "./registerTools.js";

export const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
});

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  const server = new McpServer({
    name: "COTI MCP Server",
    version: "0.2.1",
  });

  registerAllTools(server);

  return server.server;
}
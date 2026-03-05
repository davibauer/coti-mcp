#!/usr/bin/env node
import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAllTools } from "./registerTools.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const SERVER_VERSION = "0.2.1";
const SERVER_NAME = "COTI MCP Server";

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
  registerAllTools(server);
  return server;
}

function sendJsonError(res: ServerResponse, statusCode: number, message: string): void {
  if (res.headersSent) return;
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

function isAuthorized(req: IncomingMessage): boolean {
  if (!AUTH_TOKEN) return true;
  const authHeader = req.headers["authorization"];
  if (!authHeader) return false;
  const spaceIdx = authHeader.indexOf(" ");
  if (spaceIdx === -1) return false;
  return authHeader.slice(0, spaceIdx) === "Bearer" && authHeader.slice(spaceIdx + 1) === AUTH_TOKEN;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: SERVER_VERSION }));
    return;
  }

  if (req.url !== "/mcp") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  if (!isAuthorized(req)) {
    sendJsonError(res, 401, "Unauthorized: missing or invalid Bearer token");
    return;
  }

  if (req.method === "POST") {
    let body: string;
    try {
      body = await readBody(req);
    } catch {
      sendJsonError(res, 400, "Failed to read request body");
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      sendJsonError(res, 400, "Invalid JSON body");
      return;
    }

    // Stateless: fresh McpServer + transport per request (no shared state between calls)
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error("Error handling MCP request:", error);
      sendJsonError(res, 500, "Internal server error");
    }
  } else {
    sendJsonError(res, 405, "Method not allowed");
  }
});

httpServer.listen(PORT, () => {
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on port ${PORT}`);
  if (AUTH_TOKEN) {
    console.log("Bearer token authentication: ENABLED");
  } else {
    console.log("Bearer token authentication: DISABLED (set MCP_AUTH_TOKEN to enable)");
  }
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});

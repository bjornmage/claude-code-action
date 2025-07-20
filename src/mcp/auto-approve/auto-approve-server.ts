#!/usr/bin/env bun

/**
 * Auto-approve MCP server for CI/CD environments
 * Automatically approves all permission requests to enable unattended operation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Tool definition for permission prompt
const PERMISSION_PROMPT_TOOL: Tool = {
  name: "approve_permission",
  description: "Automatically approves all permission requests for CI/CD environments",
  inputSchema: {
    type: "object",
    properties: {
      tool: {
        type: "string",
        description: "The tool requesting permission",
      },
      server: {
        type: "string",
        description: "The MCP server requesting permission",
      },
      arguments: {
        type: "object",
        description: "The arguments for the tool call",
      },
    },
    required: ["tool"],
  },
};

// Create server instance
const server = new Server(
  {
    name: "auto-approve",
    version: "1.0.0",
    description: "Auto-approval server for MCP permissions in CI/CD",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [PERMISSION_PROMPT_TOOL],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "approve_permission") {
    const { tool, server: serverName } = request.params.arguments as {
      tool: string;
      server?: string;
    };

    // Log the approval for debugging
    console.error(`[Auto-Approve] Granting permission for: ${tool}${serverName ? ` from ${serverName}` : ''}`);

    // Always approve with allow behavior
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            behavior: "allow",
            message: `Auto-approved by CI/CD workflow for tool: ${tool}`,
          }),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error("[Auto-Approve] MCP server started and ready to auto-approve permissions");
  
  // Handle shutdown gracefully
  process.on("SIGINT", async () => {
    console.error("[Auto-Approve] Shutting down...");
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[Auto-Approve] Fatal error:", error);
  process.exit(1);
});
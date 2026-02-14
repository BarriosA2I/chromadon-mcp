#!/usr/bin/env node
/**
 * CHROMADON MCP Server
 * Wraps CHROMADON Desktop's port 3002 REST API as MCP tools
 * for browser automation via Claude Code.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { TOOLS, handleToolCall } from './tools/index.js';
function log(msg) {
    process.stderr.write(`[chromadon-mcp] ${msg}\n`);
}
const server = new Server({
    name: 'chromadon',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log(`Tool call: ${name}`);
    return await handleToolCall(name, (args || {}));
});
// Graceful shutdown
const shutdown = () => {
    log('Shutting down');
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Start
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log(`CHROMADON MCP Server running (${TOOLS.length} tools)`);
}
main().catch((error) => {
    log(`Failed to start: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
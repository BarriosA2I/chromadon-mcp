/**
 * Tool registry - combines all tool definitions and dispatches calls
 */
import * as tabs from './tabs.js';
import * as interaction from './interaction.js';
import * as observation from './observation.js';
import * as system from './system.js';
export const TOOLS = [
    ...tabs.tools,
    ...interaction.tools,
    ...observation.tools,
    ...system.tools,
];
export async function handleToolCall(name, args) {
    try {
        // Observation tools return ContentBlock[] directly (for image support)
        const observationResult = await observation.handle(name, args);
        if (observationResult !== null) {
            return { content: observationResult };
        }
        // All other tools return JSON strings
        const textResult = (await tabs.handle(name, args)) ??
            (await interaction.handle(name, args)) ??
            (await system.handle(name, args));
        if (textResult !== null) {
            return { content: [{ type: 'text', text: textResult }] };
        }
        return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`[chromadon-mcp] Error in ${name}: ${message}\n`);
        return {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
        };
    }
}
//# sourceMappingURL=index.js.map
/**
 * Observation tools - take_screenshot, get_interactive_elements, execute_script
 */
import * as client from '../client.js';
import { processScreenshot } from '../screenshot.js';
export const tools = [
    {
        name: 'take_screenshot',
        description: 'Capture a screenshot of a browser tab or the full CHROMADON Desktop window. If no tabId is given, captures the entire Desktop window including the AI chat panel, sidebar, and all UI elements.',
        inputSchema: {
            type: 'object',
            properties: {
                tabId: {
                    type: 'number',
                    description: 'The tab ID to screenshot. If omitted, captures the full Desktop window (including chat panel).',
                },
            },
        },
    },
    {
        name: 'get_interactive_elements',
        description: 'Find all interactive elements (buttons, links, inputs, etc.) in a browser tab with their coordinates. Pierces Shadow DOM. Returns text, tag, role, ariaLabel, href, x, y for each element.',
        inputSchema: {
            type: 'object',
            properties: {
                tabId: {
                    type: 'number',
                    description: 'The tab ID to scan. If omitted, uses the active tab.',
                },
            },
        },
    },
    {
        name: 'execute_script',
        description: 'Execute JavaScript in a browser tab context. Script is sandboxed (no require, process, child_process). Max 100KB. Returns the result of the script execution.',
        inputSchema: {
            type: 'object',
            properties: {
                tabId: {
                    type: 'number',
                    description: 'The tab ID to execute the script in.',
                },
                script: {
                    type: 'string',
                    description: 'The JavaScript code to execute.',
                },
            },
            required: ['tabId', 'script'],
        },
    },
];
export async function handle(name, args) {
    switch (name) {
        case 'take_screenshot': {
            let pngBuffer;
            if (args.tabId !== undefined) {
                // Screenshot a specific tab
                pngBuffer = await client.getBinary(`/tabs/screenshot/${args.tabId}`);
            }
            else {
                // No tabId — capture the full Desktop window (includes chat panel, sidebar, etc.)
                pngBuffer = await client.getBinary('/screenshot');
            }
            const screenshot = await processScreenshot(pngBuffer);
            return [
                { type: 'image', data: screenshot.data, mimeType: screenshot.mimeType },
            ];
        }
        case 'get_interactive_elements': {
            const body = {};
            if (args.tabId !== undefined)
                body.id = args.tabId;
            const result = await client.post('/tabs/get-interactive-elements', body);
            return [{ type: 'text', text: JSON.stringify(result, null, 2) }];
        }
        case 'execute_script': {
            const result = await client.post('/tabs/execute', {
                id: args.tabId,
                script: args.script,
            });
            return [{ type: 'text', text: JSON.stringify(result, null, 2) }];
        }
        default:
            return null;
    }
}
//# sourceMappingURL=observation.js.map
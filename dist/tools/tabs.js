/**
 * Tab management tools - list, create, navigate, close, focus
 */
import * as client from '../client.js';
export const tools = [
    {
        name: 'list_tabs',
        description: 'List all open browser tabs in CHROMADON Desktop. Returns tab IDs, URLs, and titles.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'create_tab',
        description: 'Create a new browser tab in CHROMADON Desktop. Optionally navigate to a URL.',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'URL to open in the new tab. If omitted, opens a blank tab.',
                },
            },
        },
    },
    {
        name: 'navigate',
        description: 'Navigate a browser tab to a URL.',
        inputSchema: {
            type: 'object',
            properties: {
                tabId: {
                    type: 'number',
                    description: 'The tab ID to navigate.',
                },
                url: {
                    type: 'string',
                    description: 'The URL to navigate to.',
                },
            },
            required: ['tabId', 'url'],
        },
    },
    {
        name: 'close_tab',
        description: 'Close a browser tab by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                tabId: {
                    type: 'number',
                    description: 'The tab ID to close.',
                },
            },
            required: ['tabId'],
        },
    },
    {
        name: 'focus_tab',
        description: 'Focus/activate a browser tab by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                tabId: {
                    type: 'number',
                    description: 'The tab ID to focus.',
                },
            },
            required: ['tabId'],
        },
    },
];
export async function handle(name, args) {
    switch (name) {
        case 'list_tabs': {
            const result = await client.get('/tabs');
            return JSON.stringify(result, null, 2);
        }
        case 'create_tab': {
            const body = {};
            if (args.url)
                body.url = args.url;
            const result = await client.post('/tabs/create', body);
            return JSON.stringify(result, null, 2);
        }
        case 'navigate': {
            const result = await client.post('/tabs/navigate', {
                id: args.tabId,
                url: args.url,
            });
            return JSON.stringify(result, null, 2);
        }
        case 'close_tab': {
            const result = await client.post('/tabs/close', { id: args.tabId });
            return JSON.stringify(result, null, 2);
        }
        case 'focus_tab': {
            const result = await client.post('/tabs/focus', { id: args.tabId });
            return JSON.stringify(result, null, 2);
        }
        default:
            return null;
    }
}
//# sourceMappingURL=tabs.js.map
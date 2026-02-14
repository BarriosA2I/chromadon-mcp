/**
 * System tools - health_check, upload_file
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as client from '../client.js';

export const tools: Tool[] = [
  {
    name: 'health_check',
    description: 'Check if CHROMADON Desktop is running and reachable. Returns service status, port, and window readiness.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'upload_file',
    description: 'Upload a file to a file input element in a browser tab. Uses Chrome DevTools Protocol for reliable file upload.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID containing the file input.',
        },
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to upload.',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the file input element. If omitted, finds the first file input.',
        },
      },
      required: ['tabId', 'filePath'],
    },
  },
];

export async function handle(name: string, args: Record<string, unknown>): Promise<string | null> {
  switch (name) {
    case 'health_check': {
      try {
        const result = await client.get('/health');
        return JSON.stringify(result, null, 2);
      } catch (error) {
        return JSON.stringify({
          status: 'unreachable',
          error: error instanceof Error ? error.message : String(error),
          hint: 'Make sure CHROMADON Desktop is running.',
        }, null, 2);
      }
    }
    case 'upload_file': {
      const body: Record<string, unknown> = {
        id: args.tabId,
        filePath: args.filePath,
      };
      if (args.selector) body.selector = args.selector;
      const result = await client.post('/tabs/upload', body);
      return JSON.stringify(result, null, 2);
    }
    default:
      return null;
  }
}

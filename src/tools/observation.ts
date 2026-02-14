/**
 * Observation tools - take_screenshot, get_interactive_elements, execute_script
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as client from '../client.js';
import { processScreenshot } from '../screenshot.js';

export const tools: Tool[] = [
  {
    name: 'take_screenshot',
    description: 'Capture a screenshot of a browser tab. Returns the image inline (resized to max 1920px). If no tabId is given, screenshots the active tab.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID to screenshot. If omitted, uses the active tab.',
        },
      },
    },
  },
  {
    name: 'get_interactive_elements',
    description: 'Find all interactive elements (buttons, links, inputs, etc.) in a browser tab with their coordinates. Pierces Shadow DOM. Returns text, tag, role, ariaLabel, href, x, y for each element.',
    inputSchema: {
      type: 'object' as const,
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
      type: 'object' as const,
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

// Screenshot returns an image content block, not text - handled specially in tools/index.ts
export type ToolResult = {
  type: 'text';
  text: string;
} | {
  type: 'image';
  data: string;
  mimeType: string;
};

export async function handle(name: string, args: Record<string, unknown>): Promise<ToolResult[] | null> {
  switch (name) {
    case 'take_screenshot': {
      // Determine which tab to screenshot
      let tabId = args.tabId;
      if (tabId === undefined) {
        // Get active tab ID from /tabs
        const tabsResult = await client.get<{ activeTabId: number }>('/tabs');
        tabId = tabsResult.activeTabId;
      }
      const pngBuffer = await client.getBinary(`/tabs/screenshot/${tabId}`);
      const screenshot = await processScreenshot(pngBuffer);
      return [
        { type: 'image', data: screenshot.data, mimeType: screenshot.mimeType },
      ];
    }
    case 'get_interactive_elements': {
      const body: Record<string, unknown> = {};
      if (args.tabId !== undefined) body.id = args.tabId;
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

/**
 * Interaction tools - click, type, hover, hover_and_click, press_key, scroll
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as client from '../client.js';

export const tools: Tool[] = [
  {
    name: 'click',
    description: 'Click an element in a browser tab. Uses 4-strategy fallback: CSS deep search, text deep search, data-testid, partial text. Pierces Shadow DOM.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID to click in.',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to click.',
        },
        text: {
          type: 'string',
          description: 'Text content of the element to click (alternative to selector).',
        },
      },
      required: ['tabId'],
    },
  },
  {
    name: 'type',
    description: 'Type text into an element in a browser tab. Works with inputs, textareas, contenteditable, and Shadow DOM elements.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID to type in.',
        },
        text: {
          type: 'string',
          description: 'The text to type.',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to type into. If omitted, types into the focused element.',
        },
        clearFirst: {
          type: 'boolean',
          description: 'If true, clears the field before typing. Defaults to false.',
        },
      },
      required: ['tabId', 'text'],
    },
  },
  {
    name: 'hover',
    description: 'Hover over an element in a browser tab. Pierces Shadow DOM. Maintains hover for 400ms.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID to hover in.',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to hover over.',
        },
        text: {
          type: 'string',
          description: 'Text content of the element to hover over (alternative to selector).',
        },
      },
      required: ['tabId'],
    },
  },
  {
    name: 'hover_and_click',
    description: 'Hover over one element, wait, then click another. Single round-trip to prevent rate limiting. Useful for dropdown menus and tooltips.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID.',
        },
        hoverSelector: {
          type: 'string',
          description: 'CSS selector for the element to hover over.',
        },
        hoverText: {
          type: 'string',
          description: 'Text of the element to hover over (alternative to hoverSelector).',
        },
        clickText: {
          type: 'string',
          description: 'Text of the element to click after hovering.',
        },
        waitMs: {
          type: 'number',
          description: 'Milliseconds to wait between hover and click. Defaults to 500.',
        },
      },
      required: ['tabId', 'clickText'],
    },
  },
  {
    name: 'press_key',
    description: 'Send a keyboard key press to a browser tab. Supports Enter, Tab, Escape, PageUp, PageDown, ArrowUp, ArrowDown, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID to send the key to.',
        },
        key: {
          type: 'string',
          description: 'The key to press (e.g., "Enter", "Tab", "Escape", "PageDown").',
        },
      },
      required: ['tabId', 'key'],
    },
  },
  {
    name: 'scroll',
    description: 'Scroll a browser tab. Uses verified JS scroll with keyboard fallback. Supports directional scrolling or pixel amounts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tabId: {
          type: 'number',
          description: 'The tab ID to scroll.',
        },
        direction: {
          type: 'string',
          enum: ['up', 'down'],
          description: 'Direction to scroll. Defaults to "down".',
        },
        amount: {
          type: 'number',
          description: 'Pixels to scroll. Defaults to one viewport height.',
        },
      },
      required: ['tabId'],
    },
  },
];

export async function handle(name: string, args: Record<string, unknown>): Promise<string | null> {
  switch (name) {
    case 'click': {
      const body: Record<string, unknown> = { id: args.tabId };
      if (args.selector) body.selector = args.selector;
      if (args.text) body.text = args.text;
      const result = await client.post('/tabs/click', body);
      return JSON.stringify(result, null, 2);
    }
    case 'type': {
      const body: Record<string, unknown> = { id: args.tabId, text: args.text };
      if (args.selector) body.selector = args.selector;
      if (args.clearFirst !== undefined) body.clearFirst = args.clearFirst;
      const result = await client.post('/tabs/type', body);
      return JSON.stringify(result, null, 2);
    }
    case 'hover': {
      const body: Record<string, unknown> = { id: args.tabId };
      if (args.selector) body.selector = args.selector;
      if (args.text) body.text = args.text;
      const result = await client.post('/tabs/hover', body);
      return JSON.stringify(result, null, 2);
    }
    case 'hover_and_click': {
      const body: Record<string, unknown> = { id: args.tabId, clickText: args.clickText };
      if (args.hoverSelector) body.hoverSelector = args.hoverSelector;
      if (args.hoverText) body.hoverText = args.hoverText;
      if (args.waitMs !== undefined) body.waitMs = args.waitMs;
      const result = await client.post('/tabs/hover-and-click', body);
      return JSON.stringify(result, null, 2);
    }
    case 'press_key': {
      const tabId = args.tabId;
      const result = await client.post(`/tabs/key/${tabId}`, { key: args.key });
      return JSON.stringify(result, null, 2);
    }
    case 'scroll': {
      const tabId = args.tabId;
      const body: Record<string, unknown> = {};
      if (args.direction) body.direction = args.direction;
      if (args.amount !== undefined) body.amount = args.amount;
      const result = await client.post(`/tabs/scroll/${tabId}`, body);
      return JSON.stringify(result, null, 2);
    }
    default:
      return null;
  }
}

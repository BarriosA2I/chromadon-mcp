/**
 * Tool registry - combines all tool definitions and dispatches calls
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const TOOLS: Tool[];
export type ContentBlock = {
    type: 'text';
    text: string;
} | {
    type: 'image';
    data: string;
    mimeType: string;
};
export declare function handleToolCall(name: string, args: Record<string, unknown>): Promise<{
    content: ContentBlock[];
    isError?: boolean;
}>;
//# sourceMappingURL=index.d.ts.map
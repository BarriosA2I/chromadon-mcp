/**
 * Observation tools - take_screenshot, get_interactive_elements, execute_script
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare const tools: Tool[];
export type ToolResult = {
    type: 'text';
    text: string;
} | {
    type: 'image';
    data: string;
    mimeType: string;
};
export declare function handle(name: string, args: Record<string, unknown>): Promise<ToolResult[] | null>;
//# sourceMappingURL=observation.d.ts.map
/**
 * Screenshot capture + resize for CHROMADON MCP
 * Resizes high-DPI screenshots to max 1920px before returning to Claude
 */
export interface ScreenshotResult {
    data: string;
    mimeType: string;
}
export declare function processScreenshot(pngBuffer: Buffer): Promise<ScreenshotResult>;
//# sourceMappingURL=screenshot.d.ts.map
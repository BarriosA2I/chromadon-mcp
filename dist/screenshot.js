/**
 * Screenshot capture + resize for CHROMADON MCP
 * Resizes high-DPI screenshots to max 1920px before returning to Claude
 */
import sharp from 'sharp';
const MAX_DIMENSION = 1920;
export async function processScreenshot(pngBuffer) {
    const metadata = await sharp(pngBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    let outputBuffer;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        outputBuffer = await sharp(pngBuffer)
            .resize({
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: 'inside',
            withoutEnlargement: true,
        })
            .png()
            .toBuffer();
        process.stderr.write(`[chromadon-mcp] Screenshot resized: ${width}x${height} -> max ${MAX_DIMENSION}px\n`);
    }
    else {
        outputBuffer = pngBuffer;
    }
    return {
        data: outputBuffer.toString('base64'),
        mimeType: 'image/png',
    };
}
//# sourceMappingURL=screenshot.js.map
/**
 * HTTP client for CHROMADON Desktop Control Server (port 3002)
 */

const BASE_URL = 'http://127.0.0.1:3002';
const TIMEOUT_MS = 10_000;

function log(msg: string): void {
  process.stderr.write(`[chromadon-mcp] ${msg}\n`);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function isAvailable(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function ensureConnected(): void {
  // Called before operations - actual check is async, so we use checkConnection() instead
}

export async function checkConnection(): Promise<void> {
  const available = await isAvailable();
  if (!available) {
    throw new Error(
      'CHROMADON Desktop is not running or not reachable at http://127.0.0.1:3002. ' +
      'Please start the CHROMADON Desktop app first.'
    );
  }
}

export async function get<T = unknown>(path: string): Promise<T> {
  await checkConnection();
  const url = `${BASE_URL}${path}`;
  log(`GET ${path}`);
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${path} failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  await checkConnection();
  const url = `${BASE_URL}${path}`;
  log(`POST ${path}`);
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${path} failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

export async function getBinary(path: string): Promise<Buffer> {
  await checkConnection();
  const url = `${BASE_URL}${path}`;
  log(`GET (binary) ${path}`);
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${path} failed (${response.status}): ${text}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

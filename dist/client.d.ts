/**
 * HTTP client for CHROMADON Desktop Control Server (port 3002)
 */
export declare function isAvailable(): Promise<boolean>;
export declare function checkConnection(): Promise<void>;
export declare function get<T = unknown>(path: string): Promise<T>;
export declare function post<T = unknown>(path: string, body?: unknown): Promise<T>;
export declare function getBinary(path: string): Promise<Buffer>;
//# sourceMappingURL=client.d.ts.map
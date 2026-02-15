/**
 * OBS WebSocket Client (adapted for CHROMADON MCP Server)
 *
 * Manages connection lifecycle with exponential backoff retry.
 * Exposes typed methods for all OBS operations.
 * Thread-safe: serializes commands to prevent race conditions.
 *
 * Ported from obs-control-api standalone server.
 * Changes: Winston logger → stderr, config module → env vars.
 */

import OBSWebSocket from 'obs-websocket-js';

// ─── Config (from env vars, set via .mcp.json or .env) ──────

const OBS_HOST = process.env.OBS_WS_HOST || '127.0.0.1';
const OBS_PORT = parseInt(process.env.OBS_WS_PORT || '4455', 10);
const OBS_PASSWORD = process.env.OBS_WS_PASSWORD || '';
const OBS_WS_URL = `ws://${OBS_HOST}:${OBS_PORT}`;
const SAFE_MODE = (process.env.OBS_SAFE_MODE || 'true').toLowerCase() === 'true';
const SAFE_SCENES = (process.env.OBS_SAFE_SCENES || 'StartingSoon,Main')
  .split(',')
  .map((s) => s.trim());

// ─── Logger (matches MCP server pattern) ─────────────────────

function log(msg: string): void {
  process.stderr.write(`[chromadon-mcp:obs] ${msg}\n`);
}

// ─── Types ───────────────────────────────────────────────────

export interface OBSStatus {
  connected: boolean;
  streaming: boolean;
  recording: boolean;
  currentScene: string;
  availableScenes: string[];
  streamTimecode: string | null;
  recordTimecode: string | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  fps: number | null;
}

// ─── OBS Client ──────────────────────────────────────────────

export class OBSClient {
  private obs: OBSWebSocket;
  private connected = false;
  private connecting = false;
  private retryCount = 0;
  private maxRetries = 10;
  private baseDelay = 1000; // 1s
  private maxDelay = 30000; // 30s
  private commandQueue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.obs = new OBSWebSocket();

    this.obs.on('ConnectionClosed', () => {
      this.connected = false;
      log('OBS WebSocket connection closed');
      this.scheduleReconnect();
    });

    this.obs.on('ConnectionError', (err) => {
      this.connected = false;
      log(`OBS WebSocket connection error: ${err.message || String(err)}`);
    });
  }

  /**
   * Connect to OBS WebSocket with exponential backoff retry
   */
  async connect(): Promise<void> {
    if (this.connected || this.connecting) return;
    this.connecting = true;

    while (this.retryCount <= this.maxRetries) {
      try {
        log(
          `Connecting to OBS WebSocket at ${OBS_HOST}:${OBS_PORT}` +
            (this.retryCount > 0 ? ` (attempt ${this.retryCount + 1})` : '')
        );

        const { obsWebSocketVersion, negotiatedRpcVersion } =
          await this.obs.connect(OBS_WS_URL, OBS_PASSWORD, {
            rpcVersion: 1,
          });

        this.connected = true;
        this.connecting = false;
        this.retryCount = 0;

        log(
          `Connected to OBS WebSocket (v${obsWebSocketVersion}, rpc=${negotiatedRpcVersion})`
        );
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.retryCount++;

        // Classify the error for better messaging
        if (message.includes('ECONNREFUSED')) {
          log(
            'OBS is not running or WebSocket server is not enabled. ' +
              'Open OBS → Tools → WebSocket Server Settings → Enable WebSocket server'
          );
        } else if (
          message.includes('Authentication') ||
          message.includes('auth')
        ) {
          log(
            'OBS WebSocket authentication failed. Check OBS_WS_PASSWORD matches ' +
              'OBS → Tools → WebSocket Server Settings → Server Password'
          );
          this.connecting = false;
          throw new Error('AUTH_FAILED: OBS WebSocket password is incorrect');
        } else {
          log(`Connection failed: ${message}`);
        }

        if (this.retryCount > this.maxRetries) {
          this.connecting = false;
          throw new Error(
            `Failed to connect after ${this.maxRetries} attempts. Last error: ${message}`
          );
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, this.retryCount - 1),
          this.maxDelay
        );
        const jitter = delay * (0.7 + Math.random() * 0.6);
        log(`Retrying in ${Math.round(jitter / 1000)}s...`);
        await this.sleep(jitter);
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.connecting) {
      setTimeout(() => this.connect().catch(() => {}), 3000);
    }
  }

  /**
   * Serialize commands to prevent race conditions
   */
  private async serialize<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.commandQueue;
    let resolve!: (value: unknown) => void;
    this.commandQueue = new Promise((r) => (resolve = r));
    await prev;
    try {
      return await fn();
    } finally {
      resolve(undefined);
    }
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error(
        'NOT_CONNECTED: OBS WebSocket is not connected. Is OBS running with WebSocket enabled?'
      );
    }
  }

  // ─── Stream Control ─────────────────────────────────────────

  async startStream(): Promise<{ success: boolean; message: string }> {
    return this.serialize(async () => {
      this.ensureConnected();

      // Safe mode check
      if (SAFE_MODE) {
        const scene = await this.getCurrentScene();
        if (!SAFE_SCENES.includes(scene)) {
          return {
            success: false,
            message: `SAFE_MODE: Refusing to start stream. Current scene "${scene}" is not in safe list [${SAFE_SCENES.join(', ')}]. Switch to an approved scene first.`,
          };
        }
      }

      // Check if already streaming
      const status = await this.obs.call('GetStreamStatus');
      if (status.outputActive) {
        return { success: true, message: 'Stream already active' };
      }

      await this.obs.call('StartStream');
      log('Stream started');
      return { success: true, message: 'Stream started' };
    });
  }

  async stopStream(): Promise<{ success: boolean; message: string }> {
    return this.serialize(async () => {
      this.ensureConnected();
      const status = await this.obs.call('GetStreamStatus');
      if (!status.outputActive) {
        return { success: true, message: 'Stream already stopped' };
      }
      await this.obs.call('StopStream');
      log('Stream stopped');
      return { success: true, message: 'Stream stopped' };
    });
  }

  // ─── Recording Control ──────────────────────────────────────

  async startRecording(): Promise<{ success: boolean; message: string }> {
    return this.serialize(async () => {
      this.ensureConnected();
      const status = await this.obs.call('GetRecordStatus');
      if (status.outputActive) {
        return { success: true, message: 'Recording already active' };
      }
      await this.obs.call('StartRecord');
      log('Recording started');
      return { success: true, message: 'Recording started' };
    });
  }

  async stopRecording(): Promise<{
    success: boolean;
    message: string;
    outputPath?: string;
  }> {
    return this.serialize(async () => {
      this.ensureConnected();
      const status = await this.obs.call('GetRecordStatus');
      if (!status.outputActive) {
        return { success: true, message: 'Recording already stopped' };
      }
      const result = await this.obs.call('StopRecord');
      log(`Recording stopped, output: ${result.outputPath}`);
      return {
        success: true,
        message: 'Recording stopped',
        outputPath: result.outputPath,
      };
    });
  }

  // ─── Scene Control ──────────────────────────────────────────

  async getCurrentScene(): Promise<string> {
    this.ensureConnected();
    const result = await this.obs.call('GetCurrentProgramScene');
    return result.currentProgramSceneName;
  }

  async getSceneList(): Promise<string[]> {
    this.ensureConnected();
    const result = await this.obs.call('GetSceneList');
    return (result.scenes as Array<{ sceneName: string }>).map(
      (s) => s.sceneName
    );
  }

  async setScene(
    sceneName: string
  ): Promise<{ success: boolean; message: string }> {
    return this.serialize(async () => {
      this.ensureConnected();

      // Validate scene exists
      const scenes = await this.getSceneList();
      if (!scenes.includes(sceneName)) {
        return {
          success: false,
          message: `SCENE_NOT_FOUND: Scene "${sceneName}" does not exist. Available: [${scenes.join(', ')}]`,
        };
      }

      await this.obs.call('SetCurrentProgramScene', {
        sceneName,
      });
      log(`Scene switched to: ${sceneName}`);
      return { success: true, message: `Switched to scene: ${sceneName}` };
    });
  }

  // ─── Audio Control ──────────────────────────────────────────

  async setMicMute(
    mute: boolean,
    inputName?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.serialize(async () => {
      this.ensureConnected();

      // Try common mic names if none specified
      const micNames = inputName
        ? [inputName]
        : [
            'Mic/Aux',
            'Blue Yeti',
            'Microphone',
            'Mic',
            'Audio Input Capture',
            'Desktop Audio',
          ];

      for (const name of micNames) {
        try {
          await this.obs.call('SetInputMute', {
            inputName: name,
            inputMuted: mute,
          });
          log(`${name} ${mute ? 'muted' : 'unmuted'}`);
          return {
            success: true,
            message: `${name} ${mute ? 'muted' : 'unmuted'}`,
          };
        } catch {
          continue;
        }
      }

      // List available inputs for debugging
      const inputs = await this.obs.call('GetInputList');
      const names = (inputs.inputs as Array<{ inputName: string }>).map(
        (i) => i.inputName
      );
      return {
        success: false,
        message: `MIC_NOT_FOUND: Could not find mic input. Tried: [${micNames.join(', ')}]. Available inputs: [${names.join(', ')}]`,
      };
    });
  }

  // ─── Source Visibility ──────────────────────────────────────

  async setSourceVisibility(
    sceneName: string,
    sourceName: string,
    visible: boolean
  ): Promise<{ success: boolean; message: string }> {
    return this.serialize(async () => {
      this.ensureConnected();

      try {
        // Get scene item ID first
        const { sceneItemId } = await this.obs.call('GetSceneItemId', {
          sceneName,
          sourceName,
        });

        await this.obs.call('SetSceneItemEnabled', {
          sceneName,
          sceneItemId,
          sceneItemEnabled: visible,
        });

        log(
          `Source "${sourceName}" in "${sceneName}" set to ${visible ? 'visible' : 'hidden'}`
        );
        return {
          success: true,
          message: `${sourceName} in ${sceneName} set to ${visible ? 'visible' : 'hidden'}`,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('NotFound') || message.includes('600')) {
          return {
            success: false,
            message: `SOURCE_NOT_FOUND: "${sourceName}" not found in scene "${sceneName}". Check exact source and scene names in OBS.`,
          };
        }
        throw err;
      }
    });
  }

  // ─── Full Status ────────────────────────────────────────────

  async getStatus(): Promise<OBSStatus> {
    if (!this.connected) {
      return {
        connected: false,
        streaming: false,
        recording: false,
        currentScene: 'N/A',
        availableScenes: [],
        streamTimecode: null,
        recordTimecode: null,
        cpuUsage: null,
        memoryUsage: null,
        fps: null,
      };
    }

    try {
      const [streamStatus, recordStatus, sceneInfo, sceneList, stats] =
        await Promise.all([
          this.obs.call('GetStreamStatus'),
          this.obs.call('GetRecordStatus'),
          this.obs.call('GetCurrentProgramScene'),
          this.obs.call('GetSceneList'),
          this.obs.call('GetStats').catch(() => null),
        ]);

      return {
        connected: true,
        streaming: streamStatus.outputActive,
        recording: recordStatus.outputActive,
        currentScene: sceneInfo.currentProgramSceneName,
        availableScenes: (
          sceneList.scenes as Array<{ sceneName: string }>
        ).map((s) => s.sceneName),
        streamTimecode: streamStatus.outputTimecode || null,
        recordTimecode: recordStatus.outputTimecode || null,
        cpuUsage: stats ? (stats as Record<string, unknown>).cpuUsage as number : null,
        memoryUsage: stats ? (stats as Record<string, unknown>).memoryUsage as number : null,
        fps: stats ? (stats as Record<string, unknown>).activeFps as number : null,
      };
    } catch (err: unknown) {
      log(
        `Failed to get OBS status: ${err instanceof Error ? err.message : String(err)}`
      );
      return {
        connected: false,
        streaming: false,
        recording: false,
        currentScene: 'ERROR',
        availableScenes: [],
        streamTimecode: null,
        recordTimecode: null,
        cpuUsage: null,
        memoryUsage: null,
        fps: null,
      };
    }
  }

  // ─── Connection State ───────────────────────────────────────

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
      log('Disconnected from OBS WebSocket');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

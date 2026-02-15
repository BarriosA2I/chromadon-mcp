/**
 * OBS Studio control tools — stream, record, scenes, mic, source visibility.
 * Connects directly to OBS via WebSocket (no HTTP intermediary).
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { OBSClient } from '../obs-client.js';

// Singleton OBS client — connected from index.ts on startup
export const obsClient = new OBSClient();

export const tools: Tool[] = [
  {
    name: 'obs_stream_start',
    description:
      'Start streaming in OBS Studio. If safe mode is enabled, refuses unless the current scene is in the approved list (StartingSoon, Main by default). Returns success status and message.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'obs_stream_stop',
    description:
      'Stop the active stream in OBS Studio. Idempotent — returns success even if already stopped.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'obs_record_start',
    description:
      'Start recording in OBS Studio. File output path is managed by OBS settings.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'obs_record_stop',
    description:
      'Stop recording in OBS Studio. Returns the output file path of the recording.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'obs_scene_set',
    description:
      'Switch the active program scene in OBS Studio. Scene names are case-sensitive. Returns error with available scene names if scene not found.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sceneName: {
          type: 'string',
          description:
            'The exact name of the scene to switch to (case-sensitive). Standard scenes: StartingSoon, Main, BRB, Ending.',
        },
      },
      required: ['sceneName'],
    },
  },
  {
    name: 'obs_scene_list',
    description:
      'List all available scenes in OBS Studio and which scene is currently active.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'obs_status',
    description:
      'Get full OBS Studio status: connection state, streaming/recording active, current scene, available scenes, stream/record timecodes, FPS, CPU usage, and memory usage.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'obs_mic_mute',
    description:
      'Mute or unmute a microphone/audio input in OBS. If no inputName is given, auto-discovers common mic names (Mic/Aux, Blue Yeti, Microphone, etc.).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        mute: {
          type: 'boolean',
          description: 'True to mute, false to unmute.',
        },
        inputName: {
          type: 'string',
          description:
            'The exact OBS input name (e.g., "Blue Yeti"). If omitted, tries common mic names automatically.',
        },
      },
      required: ['mute'],
    },
  },
  {
    name: 'obs_source_visibility',
    description:
      'Show or hide a source within an OBS scene. Both sceneName and sourceName must match exactly (case-sensitive).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sceneName: {
          type: 'string',
          description: 'The scene containing the source.',
        },
        sourceName: {
          type: 'string',
          description: 'The source to show or hide.',
        },
        visible: {
          type: 'boolean',
          description: 'True to show the source, false to hide it.',
        },
      },
      required: ['sceneName', 'sourceName', 'visible'],
    },
  },
];

export async function handle(
  name: string,
  args: Record<string, unknown>
): Promise<string | null> {
  switch (name) {
    case 'obs_stream_start': {
      const result = await obsClient.startStream();
      return JSON.stringify(result, null, 2);
    }
    case 'obs_stream_stop': {
      const result = await obsClient.stopStream();
      return JSON.stringify(result, null, 2);
    }
    case 'obs_record_start': {
      const result = await obsClient.startRecording();
      return JSON.stringify(result, null, 2);
    }
    case 'obs_record_stop': {
      const result = await obsClient.stopRecording();
      return JSON.stringify(result, null, 2);
    }
    case 'obs_scene_set': {
      const sceneName = args.sceneName as string;
      const result = await obsClient.setScene(sceneName);
      return JSON.stringify(result, null, 2);
    }
    case 'obs_scene_list': {
      const scenes = await obsClient.getSceneList();
      const current = await obsClient.getCurrentScene();
      return JSON.stringify({ currentScene: current, scenes }, null, 2);
    }
    case 'obs_status': {
      const status = await obsClient.getStatus();
      return JSON.stringify(status, null, 2);
    }
    case 'obs_mic_mute': {
      const mute = args.mute as boolean;
      const inputName = args.inputName as string | undefined;
      const result = await obsClient.setMicMute(mute, inputName);
      return JSON.stringify(result, null, 2);
    }
    case 'obs_source_visibility': {
      const sceneName = args.sceneName as string;
      const sourceName = args.sourceName as string;
      const visible = args.visible as boolean;
      const result = await obsClient.setSourceVisibility(
        sceneName,
        sourceName,
        visible
      );
      return JSON.stringify(result, null, 2);
    }
    default:
      return null;
  }
}

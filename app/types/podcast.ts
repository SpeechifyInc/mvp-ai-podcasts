export interface PodcastMessage {
  id: string;
  text: string;
  timestamp: string;
  speaker: string;
}

export interface AudioChunk {
  id: string;
  audio: string;
  timestamp: string;
  audioFormat: 'mp3' | 'pcm_16000';
  duration?: number;
}

export interface AudioControllerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentAudioIndex: number;
  lastPausedTime?: number;
  currentTimestamp: string;
  accumulatedTime: number;
} 

export interface Participant {
  readonly id: string;
  readonly name: string;
  readonly type: 'human' | 'ai';
  readonly imageUrl: string;
} 
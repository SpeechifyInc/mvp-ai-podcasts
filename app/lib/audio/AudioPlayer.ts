import { AudioChunk } from '@/app/types/podcast';
import { Logger } from '../logger';

export type AudioFormat = 'mp3' | 'pcm_16000';
type AudioSourceNode = AudioBufferSourceNode;

interface AudioPlayerConfig {
  onPlaybackEnd: () => void;
  playbackRate: number;
}

export class AudioPlayer {
  private readonly context: AudioContext;
  private sources: AudioSourceNode[] = [];
  private readonly config: AudioPlayerConfig;
  private gainNodes: GainNode[] = [];
  private readonly CROSSFADE_DURATION = 0.1; // 100ms crossfade
  private isStopping: boolean = false;

  constructor(config: AudioPlayerConfig) {
    this.context = new AudioContext();
    this.config = config;
  }

  private static calculatePCMDuration(base64PCM: string): number {
    const binaryString = window.atob(base64PCM);
    const pcmDataLength = binaryString.length / 2;
    return pcmDataLength / 16000;
  }

  private static async createAudioFromPCM(base64PCM: string, context: AudioContext): Promise<AudioBuffer> {
    const binaryString = window.atob(base64PCM);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcmData = new Int16Array(bytes.buffer);
    const audioBuffer = context.createBuffer(1, pcmData.length, 16000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }
    
    return audioBuffer;
  }

  private cleanupSources(): void {
    this.sources.forEach((source, index) => {
      try {
        source.stop();
        source.disconnect();
        this.gainNodes[index]?.disconnect();
      } catch (error) {
        // Ignore already stopped sources
      }
    });
    this.sources = [];
    this.gainNodes = [];
  }

  public async initialize(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  public async play(audioChunk: AudioChunk, offsetSeconds: number = 0): Promise<number> {
    try {
      Logger.info('Playing audio chunk:', audioChunk.timestamp, 'offset:', offsetSeconds);
      this.isStopping = false;

      const audioBuffer = await this.decodeAudio(audioChunk);
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      
      source.buffer = audioBuffer;
      source.playbackRate.value = this.config.playbackRate;
      
      source.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      source.onended = () => {
        if (!this.isStopping) {
          this.config.onPlaybackEnd();
        }
      };
      
      // Fade in the new source
      gainNode.gain.setValueAtTime(0, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, this.context.currentTime + this.CROSSFADE_DURATION);

      // Fade out the previous source if it exists
      if (this.gainNodes.length > 0) {
        const previousGain = this.gainNodes[this.gainNodes.length - 1];
        previousGain.gain.linearRampToValueAtTime(0, this.context.currentTime + this.CROSSFADE_DURATION);
        
        // Schedule cleanup of the previous source
        setTimeout(() => {
          this.sources[0]?.disconnect();
          this.gainNodes[0]?.disconnect();
          this.sources.shift();
          this.gainNodes.shift();
        }, this.CROSSFADE_DURATION * 1000);
      }

      this.sources.push(source);
      this.gainNodes.push(gainNode);
      
      // Start playing from the specified offset
      source.start(0, offsetSeconds);

      return audioChunk.audioFormat === 'pcm_16000' 
        ? AudioPlayer.calculatePCMDuration(audioChunk.audio)
        : audioBuffer.duration;
    } catch (error) {
      Logger.error('Error playing audio:', error);
      throw error;
    }
  }

  private async decodeAudio(audioChunk: AudioChunk): Promise<AudioBuffer> {
    if (audioChunk.audioFormat === 'mp3') {
      const response = await fetch(`data:audio/mp3;base64,${audioChunk.audio}`);
      const arrayBuffer = await response.arrayBuffer();
      return this.context.decodeAudioData(arrayBuffer);
    }
    return AudioPlayer.createAudioFromPCM(audioChunk.audio, this.context);
  }

  public stop(): void {
    this.isStopping = true;
    // Fade out all active sources
    const currentTime = this.context.currentTime;
    this.gainNodes.forEach(gainNode => {
      gainNode.gain.linearRampToValueAtTime(0, currentTime + this.CROSSFADE_DURATION);
    });

    // Clean up after fade out
    setTimeout(() => {
      this.cleanupSources();
    }, this.CROSSFADE_DURATION * 1000);
  }

  public setPlaybackRate(rate: number): void {
    this.sources.forEach(source => {
      source.playbackRate.value = rate;
    });
  }
} 
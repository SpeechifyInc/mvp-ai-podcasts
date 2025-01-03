import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Logger } from '../lib/logger';
import { AudioChunk, PodcastMessage } from '../types/podcast';

interface UsePodcastSocketProps {
  podcastId: string;
  onTranscript: (message: PodcastMessage) => void;
  onAudio: (message: AudioChunk) => void;
  onInterruption: () => void;
}

interface AudioPayload {
  audio: string; // base64 encoded audio data
}

export const usePodcastSocket = ({ podcastId, onTranscript, onAudio, onInterruption }: UsePodcastSocketProps) => {
  const socketRef = useRef<Socket | null>(null);

  const sendAudio = useCallback((audioData: string): void => {
    if (!socketRef.current?.connected) {
      Logger.warn('Cannot send audio: Socket not connected');
      return;
    }

    const payload: AudioPayload = {
      audio: audioData
    };

    try {
      socketRef.current.emit('user_audio', payload);
    } catch (error) {
      Logger.error('Failed to send audio data:', error);
    }
  }, []);

  useEffect(() => {
    const socket = io(`wss://${process.env.NEXT_PUBLIC_API_URL}/podcasts`, {
      query: { podcastId },
    });

    socket.on('connect', () => {
      Logger.info(`Connected to podcast socket: ${podcastId}`);
    });

    socket.on('transcript', (message: PodcastMessage) => {
      onTranscript(message);
    });

    socket.on('audio', (message: AudioChunk) => {
      onAudio(message);
    });

    socket.on('interruption', () => {
      Logger.info('Received interruption event');
      onInterruption();
    });

    socket.on('error', (error: Error) => {
      Logger.error('Socket error:', error);
    });

    socketRef.current = socket;

    return () => {
      if (socket) {
        Logger.info('Disconnecting socket');
        socket.disconnect();
      }
    };
  }, [podcastId, onTranscript, onAudio, onInterruption]);

  return {
    socket: socketRef.current,
    sendAudio,
  };
}; 
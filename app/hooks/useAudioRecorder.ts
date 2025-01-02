import { useState, useCallback, useRef, useEffect } from 'react';
import { Logger } from '../lib/logger';

interface AudioRecorderProps {
  readonly onAudioData: (base64Audio: string) => void;
  readonly interactive: boolean;
}

interface AudioState {
  readonly isActive: boolean;
  readonly isInitialized: boolean;
}

export const useAudioRecorder = ({
  onAudioData,
  interactive = false
}: AudioRecorderProps) => {
  const SAMPLE_RATE = 16000;
  const CHUNK_DURATION_MS = 250;
  const VOICE_ACTIVITY_THRESHOLD = 0.01;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [audioState, setAudioState] = useState<AudioState>({ 
    isActive: false, 
    isInitialized: false 
  });

  const convertToBase64PCM = useCallback((audioData: Float32Array): string => {
    // Convert Float32Array to Int16Array (16-bit PCM)
    const pcmData = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      // Scale to 16-bit range and clamp
      const s = Math.max(-1, Math.min(1, audioData[i]));
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Convert to Base64
    const buffer = new ArrayBuffer(pcmData.length * 2);
    new Int16Array(buffer).set(pcmData);
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    return base64;
  }, []);

  const detectVoiceActivity = (audioData: Float32Array): boolean => {
    const rms = Math.sqrt(
      audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length
    );
    return rms > VOICE_ACTIVITY_THRESHOLD;
  };

  const processChunks = useCallback(() => {
    if (chunksRef.current.length === 0) return;

    try {
      const totalLength = chunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      const concatenated = new Float32Array(totalLength);
      let offset = 0;
      
      chunksRef.current.forEach(chunk => {
        concatenated.set(chunk, offset);
        offset += chunk.length;
      });

      const hasVoiceActivity = detectVoiceActivity(concatenated);
      setAudioState(prev => ({ ...prev, isActive: hasVoiceActivity }));

      const base64Audio = convertToBase64PCM(concatenated);
      onAudioData(base64Audio);
      chunksRef.current = []; // Clear chunks after processing
    } catch (error) {
      Logger.error('Error processing audio chunks:', error);
    }
  }, [onAudioData, convertToBase64PCM]);

  const initializeRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new AudioContext({
        sampleRate: SAMPLE_RATE,
      });

      await audioContextRef.current.audioWorklet.addModule('/audio-worklet-processor.js');
      
      const sourceNode = audioContextRef.current.createMediaStreamSource(stream);
      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        'audio-recorder-processor'
      );

      workletNodeRef.current.port.onmessage = (event) => {
        if (event.data.audioData) {
          chunksRef.current.push(event.data.audioData);
        }
      };

      sourceNode.connect(workletNodeRef.current);
      workletNodeRef.current.connect(audioContextRef.current.destination);

      intervalRef.current = setInterval(processChunks, CHUNK_DURATION_MS);
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      setAudioState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      Logger.error('Error initializing recording:', error);
      throw error;
    }
  }, [processChunks]);

  useEffect(() => {
    if (!interactive) {
      return;
    }

    initializeRecording();

    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [initializeRecording, interactive]);

  if (!interactive) {
    return {
      isActive: false,
      isInitialized: false,
    };
  }

  return {
    isActive: audioState.isActive,
    isInitialized: audioState.isInitialized,
  };
}; 
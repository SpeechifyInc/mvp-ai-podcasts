'use client';

import { playbackRates, useAudioController } from '@/app/hooks/useAudioController';
import { useAudioRecorder } from '@/app/hooks/useAudioRecorder';
import { AudioChunk } from '@/app/types/podcast';
import {
    BackwardIcon,
    ForwardIcon,
    MicrophoneIcon,
    PauseIcon,
    PlayIcon
} from '@heroicons/react/24/solid';
import { useEffect } from 'react';

interface AudioControllerProps {
  podcastId: string;
  audioMessages: Array<AudioChunk>;
  onTimeUpdate: (currentTimestamp: string) => void;
  onChunkPlayed: (chunkId: string) => void;
  interactive?: boolean;
  onMicrophoneToggle?: (isActive: boolean) => void;
  sendAudio: (base64Audio: string) => void;
  setAudioControllerRef?: (ref: { handleInterruption: () => void }) => void;
  currentSpeaker?: {
    avatar: string;
    name: string;
  };
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const AudioController: React.FC<AudioControllerProps> = ({ 
  podcastId, 
  interactive = false,
  audioMessages,
  onTimeUpdate,
  onChunkPlayed,
  onMicrophoneToggle,
  sendAudio,
  setAudioControllerRef,
  currentSpeaker,
}) => {

  const {
    audioState,
    togglePlayback,
    skipTime,
    handlePlaybackRateChange,
    handleInterruption
  } = useAudioController(
    audioMessages,
    onTimeUpdate,
    onChunkPlayed,
    interactive
  );

  const { isActive, isInitialized } = useAudioRecorder({
    onAudioData: sendAudio,
    interactive
  });

  const startInteractivePlayback = async () => {
    togglePlayback();
  };

  useEffect(() => {
    if (typeof setAudioControllerRef === 'function') {
      setAudioControllerRef({ handleInterruption });
    }
  }, [handleInterruption]);

  return (
    <div className="space-y-4">
      {!interactive && <div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-[#2F43FA] h-1 rounded-full"
            style={{ 
              width: `${audioState.duration ? (audioState.currentTime / audioState.duration) * 100 : 0}%` 
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-sm text-gray-500">
            {formatTime(audioState.currentTime)}
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {audioMessages.length} messages
          </div>
          <div className="text-sm text-gray-500">
            {formatTime(audioState.duration)}
          </div>
        </div>
      </div>}
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center">
          {currentSpeaker && (
            <div className="flex items-center gap-2">
              <img
                src={currentSpeaker.avatar}
                alt={`${currentSpeaker.name}'s avatar`}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm text-gray-600 font-medium">
                {currentSpeaker.name}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => skipTime(-10)}
            disabled={!audioMessages.length}
          >
            <BackwardIcon className="w-5 h-5" />
          </button>
          
          {interactive ? (
            <button
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-[#2F43FA] hover:bg-[#2838C8] text-white'
              } touch-none`}
              aria-label="Hold to record"
            >
              <MicrophoneIcon className="w-6 h-6" />
            </button>
          ) : (
            <button
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                !audioMessages.length
                  ? 'bg-gray-200 cursor-not-allowed text-gray-400'
                  : 'bg-[#2F43FA] hover:bg-[#2838C8] text-white'
              }`}
              onClick={togglePlayback}
              disabled={!audioMessages.length}
            >
              {audioState.isPlaying ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6" />
              )}
            </button>
          )}
          
          <button
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => skipTime(10)}
            disabled={!audioMessages.length}
          >
            <ForwardIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex justify-end">
          <select
            value={audioState.playbackRate}
            onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
            className="px-3 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2F43FA] focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!audioMessages.length}
          >
            {playbackRates.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
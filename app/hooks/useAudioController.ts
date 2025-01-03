import { AudioChunk } from '@/app/types/podcast';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Logger } from '../lib/logger';
import { AudioPlayer } from '../lib/audio/AudioPlayer';

interface AudioState {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    playbackRate: number;
    isInteractive: boolean;
    isReady: boolean;
    interrupted: boolean;
    manuallyPaused: boolean;
}

export const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

const MESSAGES_CHECK_INTERVAL = 900;

export const useAudioController = (
    audioMessages: AudioChunk[],
    onTimeUpdate: (currentTimestamp: string) => void,
    onChunkPlayed: (chunkId: string) => void,
    isInteractive: boolean = false
) => {
    const [audioState, setAudioState] = useState<AudioState>({
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        playbackRate: 1,
        isInteractive,
        isReady: false,
        interrupted: false,
        manuallyPaused: false
    });

    const [playedChunkIds, setPlayedChunkIds] = useState<Set<string>>(new Set());

    const audioPlayer = useRef<AudioPlayer>(null);
    const currentChunkIndex = useRef<number>(-1);
    const checkMessagesInterval = useRef<NodeJS.Timeout>(null);
    const playStartTime = useRef<number>(null);
    const accumulatedTime = useRef<number>(0);
    const currentFinishCallback = useRef<(() => void) | null>(null);

    const initializeAudioPlayer = useCallback(async () => {
        audioPlayer.current = new AudioPlayer({
            onPlaybackEnd: () => {
                if (!playStartTime.current) {
                    // If playStartTime is null, it means playback was stopped manually
                    return;
                }
                currentFinishCallback.current = () => {
                    if (currentChunkIndex.current < audioMessages.length - 1) {
                        playNextChunk();
                    } else {
                        setAudioState(prev => ({ ...prev, isPlaying: false }));
                    }
                };
                currentFinishCallback.current();
            },
            playbackRate: audioState.playbackRate
        });

        await audioPlayer.current.initialize();
        setAudioState(prev => ({ ...prev, isReady: true }));
    }, [audioMessages.length]);

    useEffect(() => {
        initializeAudioPlayer();
        return () => {
            audioPlayer.current?.stop();
            if (checkMessagesInterval.current) {
                clearInterval(checkMessagesInterval.current);
            }
        };
    }, [initializeAudioPlayer]);

    const calculateTotalDuration = useCallback(() => {
        return audioMessages.reduce((total, msg) => {
            // Calculate duration from audio data: samples / sampleRate
            const audioData = msg.audio;
            if (!audioData) return total;
            
            // Assuming audio data is Float32Array and sample rate is 16000
            const sampleRate = 16000;
            const duration = audioData.length / sampleRate;
            return total + duration;
        }, 0);
    }, [audioMessages]);

    useEffect(() => {
        const totalDuration = calculateTotalDuration();
        setAudioState(prev => ({ ...prev, duration: totalDuration }));
    }, [audioMessages, calculateTotalDuration]);

    const playNextChunk = useCallback(async () => {
        if (!audioPlayer.current || currentChunkIndex.current >= audioMessages.length - 1) {
            return;
        }

        currentChunkIndex.current++;
        const chunk = audioMessages[currentChunkIndex.current];
        
        try {
            const chunkDuration = await audioPlayer.current.play(chunk);
            Logger.info('Playing chunk', chunk.timestamp, 'duration', chunkDuration);
            onTimeUpdate(chunk.timestamp);

            if (!isInteractive && chunk.id) {
                setPlayedChunkIds(prev => new Set([...prev, chunk.id]));
                onChunkPlayed(chunk.id);
            }

            accumulatedTime.current = audioMessages
                .slice(0, currentChunkIndex.current)
                .reduce((total, msg) => {
                    const audioData = msg.audio;
                    if (!audioData) return total;
                    return total + (audioData.length / 16000);
                }, 0);
            
            playStartTime.current = Date.now();

            // Update total duration based on actual audio data
            const totalDuration = calculateTotalDuration();
            
            setAudioState(prev => ({
                ...prev,
                isPlaying: true,
                currentTime: accumulatedTime.current,
                duration: totalDuration
            }));
        } catch (error) {
            Logger.error('Error playing audio chunk:', error);
            setAudioState(prev => ({ ...prev, isPlaying: false }));
        }
    }, [audioMessages, onTimeUpdate, onChunkPlayed, isInteractive, calculateTotalDuration]);

    useEffect(() => {
        if (!audioState.isPlaying) return;

        const updateInterval = setInterval(() => {
            const currentChunk = audioMessages[currentChunkIndex.current];
            if (!currentChunk || !playStartTime.current) return;

            const elapsedInCurrentChunk = (Date.now() - playStartTime.current) / 1000 * audioState.playbackRate;
            const currentChunkDuration = currentChunk.duration || 0;
            
            // Calculate current time including the current chunk's progress
            const currentTime = Math.min(
                accumulatedTime.current + elapsedInCurrentChunk,
                accumulatedTime.current + currentChunkDuration
            );

            setAudioState(prev => ({ ...prev, currentTime }));
        }, 50);

        return () => clearInterval(updateInterval);
    }, [audioState.isPlaying, audioState.playbackRate, audioMessages]);

    const checkNewMessages = useCallback(() => {
        // Add more strict conditions for starting playback
        if (!audioState.isReady || audioState.isPlaying || audioState.manuallyPaused) {
            return;
        }
        
        // Only start playing if we have messages and aren't currently playing
        if(currentChunkIndex.current === 100000) {
            currentChunkIndex.current = audioMessages.length - 1;
        }

        if (audioMessages.length > 0 && 
            (currentChunkIndex.current === -1 || currentChunkIndex.current < audioMessages.length - 1)) {
            Logger.info('Starting playback of new messages');
            playNextChunk();
        }
    }, [audioMessages, audioState.isPlaying, audioState.isReady, audioState.interrupted, audioState.manuallyPaused, playNextChunk]);

    useEffect(() => {
        if (checkMessagesInterval.current) {
            clearInterval(checkMessagesInterval.current);
        }
        checkMessagesInterval.current = setInterval(checkNewMessages, MESSAGES_CHECK_INTERVAL);
        return () => {
            if (checkMessagesInterval.current) {
                clearInterval(checkMessagesInterval.current);
            }
        };
    }, [checkNewMessages]);

    const resumePlayback = useCallback(async () => {
        if (!audioPlayer.current || currentChunkIndex.current === -1) {
            return playNextChunk();
        }

        const chunk = audioMessages[currentChunkIndex.current];
        try {
            const currentChunkStartTime = audioMessages
                .slice(0, currentChunkIndex.current)
                .reduce((total, msg) => total + (msg.duration || 0), 0);
            const offsetInChunk = Math.max(0, accumulatedTime.current - currentChunkStartTime);
            
            // Ensure we don't exceed the chunk duration
            if (offsetInChunk >= (chunk.duration || 0)) {
                return playNextChunk();
            }

            const chunkDuration = await audioPlayer.current.play(chunk, offsetInChunk);
            Logger.info('Resuming chunk', chunk.timestamp, 'duration', chunkDuration, 'offset', offsetInChunk);
            onTimeUpdate(chunk.timestamp);

            audioMessages[currentChunkIndex.current].duration = chunkDuration;
            playStartTime.current = Date.now() - (offsetInChunk * 1000 / audioState.playbackRate);

            setAudioState(prev => ({
                ...prev,
                isPlaying: true,
            }));
        } catch (error) {
            Logger.error('Error resuming audio chunk:', error);
            setAudioState(prev => ({ ...prev, isPlaying: false }));
        }
    }, [audioMessages, onTimeUpdate, playNextChunk, audioState.playbackRate]);

    const togglePlayback = useCallback(() => {
        if (audioState.isPlaying) {
            audioPlayer.current?.stop();
            if (playStartTime.current) {
                const elapsedInCurrentChunk = (Date.now() - playStartTime.current) / 1000 * audioState.playbackRate;
                const currentChunk = audioMessages[currentChunkIndex.current];
                // Ensure we don't exceed the chunk duration
                const validElapsedTime = Math.min(
                    elapsedInCurrentChunk,
                    currentChunk?.duration || 0
                );
                accumulatedTime.current += validElapsedTime;
                playStartTime.current = null;
            }
            setAudioState(prev => ({
                ...prev,
                isPlaying: false,
                currentTime: accumulatedTime.current,
                manuallyPaused: true
            }));
        } else {
            setAudioState(prev => ({ ...prev, manuallyPaused: false }));
            resumePlayback();
        }
    }, [audioState.isPlaying, audioState.playbackRate, resumePlayback, audioMessages]);

    const skipTime = useCallback((seconds: number) => {
        // Implementation for time skipping can be added here
        Logger.info('Skip time not implemented yet');
    }, []);

    const handlePlaybackRateChange = useCallback((rate: number) => {
        audioPlayer.current?.setPlaybackRate(rate);
        setAudioState(prev => ({ ...prev, playbackRate: rate }));
    }, []);

    const handleInterruption = useCallback(() => {
        audioPlayer.current?.stop();
        currentFinishCallback.current = null;
        playStartTime.current = null;
        currentChunkIndex.current = 100000;
        setAudioState(prev => ({ ...prev, isPlaying: false }));
        checkNewMessages();
    }, []);

    return {
        audioState,
        togglePlayback,
        skipTime,
        handlePlaybackRateChange,
        playedChunkIds,
        handleInterruption
    };
}; 

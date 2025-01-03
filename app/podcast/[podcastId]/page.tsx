'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AudioController } from '../../components/PodcastView/AudioController';
import { MessageList } from '../../components/PodcastView/MessageList';
import { usePodcastSocket } from '../../hooks/usePodcastSocket';
import { AudioChunk, Participant, PodcastMessage } from '../../types/podcast';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

interface PodcastData {
  readonly length: number;
  readonly participants: Participant[];
  readonly interactive: boolean;
}

export default function PodcastView() {
  const [transcriptMessages, setTranscriptMessages] = useState<PodcastMessage[]>([]);
  const [audioMessages, setAudioMessages] = useState<AudioChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimestamp, setCurrentTimestamp] = useState('');
  const [podcastData, setPodcastData] = useState<PodcastData | null>(null);
  const [playedMessageIds, setPlayedMessageIds] = useState<Set<string>>(new Set());

  const interactive = podcastData?.interactive ?? false;

  const handleTranscript = useCallback((message: PodcastMessage) => {
    setTranscriptMessages(prev => [...prev, message]);
  }, []);

  const podcastId = useParams().podcastId as string;

  const handleAudio = useCallback((audioChunk: AudioChunk) => {
    setAudioMessages(prev => [...prev, audioChunk]);
  }, []);

  const [audioControllerRef, setAudioControllerRef] = useState<{
    handleInterruption: () => void;
  } | null>(null);

  const handleInterruption = useCallback(() => {
    audioControllerRef?.handleInterruption();
  }, [audioControllerRef]);

  const { sendAudio } = usePodcastSocket({
    podcastId,
    onTranscript: handleTranscript,
    onAudio: handleAudio,
    onInterruption: handleInterruption
  });
  
  const onAudioData = useCallback((base64Audio: string) => {
    sendAudio(base64Audio);
  }, [sendAudio]);

  const { isActive: isRecording } = useAudioRecorder({
    onAudioData,
    interactive
  });
  
  useEffect(() => {
    const fetchPodcastData = async (): Promise<void> => {
      try {
        const response = await fetch(`https://${process.env.NEXT_PUBLIC_API_URL}/podcasts/${podcastId}`);
        const data: PodcastData = await response.json();
        setPodcastData(data);
      } catch (error) {
        console.error('Failed to fetch podcast data:', error);
      }
    };

    fetchPodcastData();
    setTranscriptMessages([]);
    setAudioMessages([]);
    setIsLoading(false);
  }, [podcastId]);

  const handleChunkPlayed = useCallback((chunkId: string) => {
    setPlayedMessageIds(prev => new Set([...prev, chunkId]));
  }, []);

const [currentSpeaker, setCurrentSpeaker] = useState<{
  avatar: string;
  name: string;
} | undefined>(undefined);

useEffect(() => {
    console.log('Checking current speaker');
    const lastMessage = transcriptMessages
        .filter(message => interactive || playedMessageIds.has(message.id))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
        const speaker = podcastData?.participants.find(participant => participant.id === lastMessage?.speaker);
        if(speaker) {
            setCurrentSpeaker({
                avatar: speaker.imageUrl,
                name: speaker.name
            });
        }
}, [transcriptMessages, playedMessageIds]);


  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm min-h-[600px] flex flex-col">
            <div className="flex-1 p-8 overflow-y-auto">
              {isLoading ? (
                <LoadingState message="Generating immersive podcast..." />
              ) : (
                <MessageList 
                  messages={transcriptMessages} 
                  showInitialLoading={audioMessages.length === 0}
                  currentTimestamp={currentTimestamp}
                  participants={podcastData?.participants ?? []}
                  interactive={podcastData?.interactive ?? false}
                  isRecording={isRecording}
                  playedMessageIds={playedMessageIds}
                />
              )}
            </div>
            <div className="border-t border-gray-100 p-6">
              <AudioController 
                podcastId={podcastId} 
                audioMessages={audioMessages}
                onTimeUpdate={setCurrentTimestamp} 
                onChunkPlayed={handleChunkPlayed}
                interactive={podcastData?.interactive ?? false}
                sendAudio={sendAudio}
                setAudioControllerRef={setAudioControllerRef}
                currentSpeaker={currentSpeaker}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col justify-center items-center h-full space-y-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F43FA]" />
    <p className="text-gray-600 font-medium">{message}</p>
  </div>
); 
import { Participant, PodcastMessage } from '@/app/types/podcast';
import { useEffect, useRef, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageListProps {
  readonly messages: PodcastMessage[];
  readonly currentTimestamp: string;
  readonly showInitialLoading?: boolean;
  readonly participants: Participant[];
  readonly interactive: boolean;
  readonly isRecording?: boolean;
  readonly playedMessageIds?: Set<string>;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentTimestamp,
  showInitialLoading = false,
  participants,
  interactive,
  isRecording = false,
  playedMessageIds = new Set()
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const participantMap = useMemo(() => 
    participants.reduce((acc, participant) => ({
      ...acc,
      [participant.id.toLowerCase()]: participant
    }), {} as Record<string, Participant>),
    [participants]
  );

  const visibleMessages = messages.filter(message => 
    interactive || (message.id && playedMessageIds.has(message.id))
  );

  // Get the latest message timestamp for highlighting
  const latestMessageTimestamp = visibleMessages[visibleMessages.length - 1]?.timestamp;

  // Add state to track if we should actually show the recording message
  const [shouldShowRecording, setShouldShowRecording] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle recording state changes with delay
  useEffect(() => {
    if (isRecording) {
      // Start a timer when recording begins
      recordingTimerRef.current = setTimeout(() => {
        setShouldShowRecording(true);
      }, 600);
    } else {
      // Clear the timer if recording stops before 200ms
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Track if we should show the recording message
  const showRecordingMessage = useMemo(() => {
    if (!shouldShowRecording && messages.length === 0) return false;
    
    // If we're recording or if the last visible message is not from the human participant,
    // we should show the recording message
    const lastMessage = visibleMessages[visibleMessages.length - 1];
    const humanParticipant = participants.find(p => p.type === 'human');
    
    return (!lastMessage || lastMessage.speaker.toLowerCase() !== humanParticipant?.id.toLowerCase()) && shouldShowRecording;
  }, [shouldShowRecording, visibleMessages, participants, messages.length]);

  // Reset shouldShowRecording when a new message appears from the human
  useEffect(() => {
    const lastMessage = visibleMessages[visibleMessages.length - 1];
    const humanParticipant = participants.find(p => p.type === 'human');
    
    if (lastMessage && humanParticipant && 
        lastMessage.speaker.toLowerCase() === humanParticipant.id.toLowerCase()) {
      setShouldShowRecording(false);
    }
  }, [visibleMessages, participants]);

  // Find human participant for recording message avatar
  const humanParticipant = useMemo(() => 
    participants.find(p => p.type === 'human'),
    [participants]
  );

  // Initialize scroll position at the bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // Maintain scroll position at bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = containerRef.current;
      const isScrolledToBottom = scrollHeight - clientHeight <= scrollTop + 100;

      if (isScrolledToBottom) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  }, [visibleMessages.length]);

  if (showInitialLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full space-y-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-8 w-8 border-b-2 border-[#2F43FA]" 
        />
        <p className="text-gray-600 font-medium">Generating immersive podcast...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="space-y-6 max-h-[500px] overflow-y-auto flex flex-col-reverse px-4"
    >
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((message, index) => {
            const participant = participantMap[message.speaker.toLowerCase()];
            const isLatestMessage = message.timestamp === latestMessageTimestamp;
            
            return (
              <motion.div
                key={`${message.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: isLatestMessage ? 1 : 0.85, 
                  y: 0,
                  scale: isLatestMessage ? 1 : 0.98
                }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-4"
              >
                {participant && (
                  <motion.div 
                    className="flex-shrink-0"
                    animate={isLatestMessage ? {
                      scale: [1, 1.05, 1],
                      borderColor: ['#2F43FA', '#4F63FA', '#2F43FA']
                    } : {}}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Image
                      src={participant.imageUrl}
                      alt={participant.name}
                      width={56}
                      height={56}
                      className={`rounded-full shadow-md ${
                        isLatestMessage ? 'border-2 border-[#2F43FA]' : ''
                      }`}
                    />
                  </motion.div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-2 ml-1">
                    {participant?.name || message.speaker}
                  </p>
                  <div className={`relative p-4 rounded-2xl ${
                    message.speaker === 'podcast'
                      ? 'bg-blue-50 rounded-tr-none'
                      : 'bg-gray-50 rounded-tl-none'
                  } shadow-sm`}>
                    <div className={`absolute top-0 ${
                      message.speaker === 'podcast' ? 'right-0' : 'left-0'
                    } w-4 h-4 ${
                      message.speaker === 'podcast' ? 'bg-blue-50' : 'bg-gray-50'
                    }`} style={{
                      clipPath: message.speaker === 'podcast' 
                        ? 'polygon(0 0, 100% 0, 100% 100%)'
                        : 'polygon(0 0, 100% 0, 0 100%)'
                    }} />
                    {isLatestMessage ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="text-gray-800 text-lg"
                      >
                        <TypewriterText text={message.text} />
                      </motion.div>
                    ) : (
                      <p className="text-gray-800 text-lg">{message.text}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {showRecordingMessage && (
            <motion.div
              key="recording-placeholder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0">
                {humanParticipant ? (
                  <div className="relative">
                    <Image
                      src={humanParticipant.imageUrl}
                      alt={humanParticipant.name}
                      width={56}
                      height={56}
                      className="rounded-full shadow-md"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 shadow-md"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-4 h-4 rounded-full bg-red-500"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2 ml-1">
                  {humanParticipant?.name || 'Recording...'}
                </p>
                <div className="relative p-4 rounded-2xl bg-gray-50 rounded-tl-none shadow-sm">
                  <div className="absolute top-0 left-0 w-4 h-4 bg-gray-50"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                    }} />
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                        className="w-3 h-3 rounded-full bg-gray-400"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

// Add this new component for the typewriter effect
const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.1,
            delay: index * 0.02,
            ease: "easeIn"
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}; 
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
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            borderBottom: '2px solid #2F43FA'
          }}
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
                style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}
              >
                {participant && (
                  <motion.div 
                    style={{ flexShrink: 0 }}
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
                      style={{
                        borderRadius: '9999px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        border: isLatestMessage ? '2px solid #2F43FA' : 'none'
                      }}
                    />
                  </motion.div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '0.5rem',
                    marginLeft: '0.25rem'
                  }}>
                    {participant?.name || message.speaker}
                  </p>
                  <div style={{
                    position: 'relative',
                    padding: '1rem',
                    borderRadius: '1rem',
                    backgroundColor: message.speaker === 'podcast' ? '#EFF6FF' : '#F9FAFB',
                    borderTopRightRadius: message.speaker === 'podcast' ? 0 : '1rem',
                    borderTopLeftRadius: message.speaker === 'podcast' ? '1rem' : 0,
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      [message.speaker === 'podcast' ? 'right' : 'left']: 0,
                      width: '1rem',
                      height: '1rem',
                      backgroundColor: message.speaker === 'podcast' ? '#EFF6FF' : '#F9FAFB',
                      clipPath: message.speaker === 'podcast' 
                        ? 'polygon(0 0, 100% 0, 100% 100%)'
                        : 'polygon(0 0, 100% 0, 0 100%)'
                    }} />
                    {isLatestMessage ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        style={{ color: '#1F2937', fontSize: '1.125rem' }}
                      >
                        <TypewriterText text={message.text} />
                      </motion.div>
                    ) : (
                      <p style={{ color: '#1F2937', fontSize: '1.125rem' }}>{message.text}</p>
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
              style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}
            >
              <div style={{ flexShrink: 0 }}>
                {humanParticipant ? (
                  <div style={{ position: 'relative' }}>
                    <Image
                      src={humanParticipant.imageUrl}
                      alt={humanParticipant.name}
                      width={56}
                      height={56}
                      style={{
                        borderRadius: '9999px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        position: 'absolute',
                        top: '-0.25rem',
                        right: '-0.25rem',
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '9999px',
                        backgroundColor: '#EF4444',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '9999px',
                    backgroundColor: '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '9999px',
                        backgroundColor: '#EF4444'
                      }}
                    />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem',
                  marginLeft: '0.25rem'
                }}>
                  {humanParticipant?.name || 'Recording...'}
                </p>
                <div style={{
                  position: 'relative',
                  padding: '1rem',
                  borderRadius: '1rem',
                  backgroundColor: '#F9FAFB',
                  borderTopLeftRadius: 0,
                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1rem',
                    height: '1rem',
                    backgroundColor: '#F9FAFB',
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                  }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                        style={{
                          width: '0.75rem',
                          height: '0.75rem',
                          borderRadius: '9999px',
                          backgroundColor: '#9CA3AF'
                        }}
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
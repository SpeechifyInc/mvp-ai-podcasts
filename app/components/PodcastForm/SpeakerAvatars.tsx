interface SpeakerAvatarsProps {
  className?: string;
  isInteractive?: boolean;
}

export const SpeakerAvatars: React.FC<SpeakerAvatarsProps> = ({ className = '', isInteractive = false }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative flex">
        <div className="relative w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-[#F0F1FF] shadow-lg">
          {isInteractive ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#2F43FA] text-white font-bold text-2xl">
              YOU
            </div>
          ) : (
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=speaker1"
              alt="Speaker 1"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-[#F0F1FF] -ml-12 shadow-lg">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=speaker2"
            alt="Speaker 2"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}; 
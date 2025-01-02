interface SelectionButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const SelectionButton: React.FC<SelectionButtonProps> = ({
  selected,
  onClick,
  children,
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg transition-colors min-w-[120px] ${
        selected
          ? 'bg-[#2F43FA] text-white'
          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#2F43FA] hover:bg-[#F0F1FF]'
      }`}
    >
      {children}
    </button>
  );
}; 
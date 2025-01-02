import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  currentFile: File | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, currentFile }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-colors duration-200 ease-in-out
        ${isDragActive 
          ? 'border-[#2F43FA] bg-[#F0F1FF]' 
          : 'border-gray-300 hover:border-[#2F43FA] bg-white'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-4">
        <div className="flex justify-center">
          <svg
            className={`w-12 h-12 ${isDragActive ? 'text-[#2F43FA]' : 'text-gray-400'}`}
            fill="none"
            strokeWidth="1.5"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" 
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" 
            />
          </svg>
        </div>
        
        {currentFile ? (
          <div className="text-sm">
            <p className="font-medium text-gray-900">{currentFile.name}</p>
            <p className="text-gray-500">
              {(currentFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="text-gray-600">
            <p className="font-medium">Drop your content file here</p>
            <p className="text-sm">or click to select</p>
            <p className="text-xs text-gray-400 mt-2">
              Supports PDF, DOC, DOCX, and TXT files
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 
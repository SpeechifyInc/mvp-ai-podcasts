'use client';

import { useState } from 'react';
import { SelectionButton } from './SelectionButton';
import { FileUpload } from './FileUpload';
import { PodcastFormData, ShowType, ShowLength, InteractiveOption } from './types';
import { SpeakerAvatars } from './SpeakerAvatars';
import { PdfService } from '@/app/services/pdfService';
import { PodcastApiService } from '@/app/services/podcastApiService';
import { useRouter } from 'next/navigation';

export const PodcastForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<PodcastFormData>({
    showType: 'podcast',
    length: 'short',
    interactive: false,
    contentFile: null,
  });

  const showTypes: ShowType[] = ['podcast', 'late-night-show', 'debate', 'ted-talk'];
  const lengths: ShowLength[] = ['short', 'medium', 'long'];
  const interactiveOptions: InteractiveOption[] = ['yes', 'no'];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.contentFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const pdfContent = await PdfService.getPdfContent(formData.contentFile);
      const response = await PodcastApiService.generatePodcast(formData, pdfContent);
      router.push(`/podcast/${response.podcastId}`);
    } catch (error) {
      console.error('Failed to process request:', error);
      setError('Failed to generate podcast. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-sm space-y-10">
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">Content</h2>
          <p className="text-gray-500 text-sm">
            Upload your content file to generate the podcast from
          </p>
        </div>
        <FileUpload
          onFileSelect={(file) => setFormData({ ...formData, contentFile: file })}
          currentFile={formData.contentFile}
        />
      </section>

      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">Type of Show</h2>
          <p className="text-gray-500 text-sm">Select the format for your content</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          {showTypes.map((type) => (
            <SelectionButton
              key={type}
              selected={formData.showType === type}
              onClick={() => setFormData({ ...formData, showType: type })}
            >
              {type.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </SelectionButton>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">Length</h2>
          <p className="text-gray-500 text-sm">Choose your show duration</p>
        </div>
        <div className="flex gap-4">
          {lengths.map((length) => (
            <SelectionButton
              key={length}
              selected={formData.length === length}
              onClick={() => setFormData({ ...formData, length })}
            >
              {length.charAt(0).toUpperCase() + length.slice(1)}
            </SelectionButton>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-start gap-8">
          <div className="flex-1 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-gray-900">Interactive</h2>
              <p className="text-gray-500 text-sm">Should the show include audience interaction?</p>
            </div>
            <div className="flex gap-4">
              {interactiveOptions.map((option) => (
                <SelectionButton
                  key={option}
                  selected={(formData.interactive ? 'yes' : 'no') === option}
                  onClick={() => setFormData({ ...formData, interactive: option === 'yes' })}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectionButton>
              ))}
            </div>
          </div>
          <SpeakerAvatars 
            isInteractive={formData.interactive}
          />
        </div>
      </section>

      <div className="space-y-4">
        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!formData.showType || !formData.length || (formData.interactive === null) || !formData.contentFile || isLoading}
          className="w-full py-4 px-6 bg-[#2F43FA] text-white 
            rounded-xl text-lg font-semibold shadow-lg shadow-[#F0F1FF]
            hover:bg-[#2838C8] transition-all
            disabled:bg-gray-300 disabled:cursor-not-allowed
            disabled:shadow-none"
        >
          {isLoading ? 'Generating...' : 'Generate a Show'}
        </button>
      </div>
    </div>
  );
};
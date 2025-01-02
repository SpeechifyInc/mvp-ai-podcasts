import { PodcastFormData } from '../components/PodcastForm/types';
import { PdfContent } from './pdfService';

export interface PodcastGenerationRequest {
  readonly title: string;
  readonly source: {
    readonly type: string;
    readonly body: string;
  };
  readonly interactive: boolean;
}

export class PodcastApiService {
  private static readonly API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

  public static async generatePodcast(
    formData: PodcastFormData,
    pdfContent: PdfContent
  ): Promise<{ podcastId: string}> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: 'Test',
            source: {
                type: 'text',
                body: pdfContent.text,
            },
            interactive: formData.interactive,
        } as PodcastGenerationRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { id } = await response.json();
      return { podcastId: id };
    } catch (error) {
      console.error('Failed to generate podcast:', error);
      throw new Error('Failed to generate podcast');
    }
  }
} 
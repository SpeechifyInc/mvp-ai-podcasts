import pdfToText from 'react-pdftotext';

export interface PdfContent {
  readonly text: string;
}

export class PdfService {
  private static async extractTextFromPdf(file: File): Promise<string> {
    try {
      const text = await pdfToText(file);
      return text;
    } catch (error) {
      console.error('Failed to extract text from PDF:', error);
      throw new Error('Failed to process PDF file');
    }
  }

  public static async getPdfContent(file: File): Promise<PdfContent> {
    const text = await this.extractTextFromPdf(file);
    return { text };
  }
}
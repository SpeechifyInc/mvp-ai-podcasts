export type ShowType = 'podcast' | 'late-night-show' | 'debate' | 'ted-talk';
export type ShowLength = 'short' | 'medium' | 'long';
export type InteractiveOption = 'yes' | 'no';

export interface PodcastFormData {
  showType: ShowType;
  length: ShowLength;
  interactive: boolean;
  contentFile: File | null;
} 
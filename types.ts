export interface VocabularyItem {
  term: string;
  definition: string;
}

export interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
}

export enum SlideType {
  INTRO = 'INTRO',
  DEEP_DIVE = 'DEEP_DIVE',
  VOCABULARY = 'VOCABULARY',
  SCENARIO = 'SCENARIO',
  CONCLUSION = 'CONCLUSION'
}

export interface Slide {
  type: SlideType;
  title: string;
  content: string; 
  audioScript: string; // Friendly podcast-quality script (50-100 words)
  audioDurationEstimate: number; // Estimated seconds
  visualPrompt?: string; // Enhanced prompt for 3D claymation/vector style
  vocabulary?: VocabularyItem[];
  quiz?: QuizData;
}

export interface DeckContent {
  topic: string;
  slides: Slide[];
}

export enum AppState {
  INPUT = 'INPUT',
  LOADING = 'LOADING',
  DECK = 'DECK',
  ERROR = 'ERROR'
}

export interface GeneratedAsset {
  deck: DeckContent;
  images: Record<number, string>;
  audio: Record<number, string>;
}

export type ImageSize = "1K" | "2K" | "4K";
export type VoiceAccent = "American" | "British" | "Indian" | "Nigerian";

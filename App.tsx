
import React, { useState, useEffect, useRef } from 'react';
import { generateDeckText, generateDeckImage, generateSlideAudio } from './services/geminiService';
import { AppState, GeneratedAsset, ImageSize, VoiceAccent, SlideType } from './types';
import { Deck } from './components/Deck';

function App() {
  const [state, setState] = useState<AppState>(AppState.INPUT);
  const [competency, setCompetency] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [voiceAccent, setVoiceAccent] = useState<VoiceAccent>('American');
  const [generatedData, setGeneratedData] = useState<GeneratedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  // Ref to prevent double-firing in StrictMode
  const hasInitialized = useRef(false);

  const handleApiKeyCheck = async (): Promise<boolean> => {
    // Guideline: For Pro/Image models, check/prompt for user key selection
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful after triggering dialog
        return true;
      }
    }
    return true;
  };

  const generateContent = async (topic: string, size: ImageSize) => {
    // Check for API Key via AI Studio dialog if necessary
    await handleApiKeyCheck();

    setState(AppState.LOADING);
    setError(null);
    setLoadingStep('Generating course structure (15 slides)...');

    try {
      // 1. Generate Text Content for all 15 slides
      const deckContent = await generateDeckText(topic);
      
      // 2. Identify slides that need images (Deep Dive)
      const slidesWithVisuals = deckContent.slides
        .map((slide, index) => ({ slide, index }))
        .filter(item => item.slide.type === SlideType.DEEP_DIVE && item.slide.visualPrompt);

      setLoadingStep(`Designing infographics and recording audio...`);

      // 3. Generate Images in Parallel with better error safety
      const imagePromises = slidesWithVisuals.map(async ({ slide, index }) => {
        try {
          if (!slide.visualPrompt) return { index, url: undefined };
          const url = await generateDeckImage(slide.visualPrompt, size);
          return { index, url };
        } catch (e) {
          console.error(`Image generation failed for slide ${index}`, e);
          return { index, url: undefined };
        }
      });

      // 4. Generate Audio for ALL slides in Parallel with better error safety
      const audioPromises = deckContent.slides.map(async (slide, index) => {
        try {
          if (!slide.audioScript) return { index, data: undefined };
          const data = await generateSlideAudio(slide.audioScript, voiceAccent);
          return { index, data };
        } catch (e) {
          console.error(`Audio generation failed for slide ${index}`, e);
          return { index, data: undefined };
        }
      });

      // We use Promise.all but wrap individuals in try-catch above to ensure the whole batch doesn't fail
      const [imagesResults, audioResults] = await Promise.all([
        Promise.all(imagePromises),
        Promise.all(audioPromises)
      ]);
      
      const imagesMap: Record<number, string> = {};
      imagesResults.forEach(res => {
        if (res.url) imagesMap[res.index] = res.url;
      });

      const audioMap: Record<number, string> = {};
      audioResults.forEach(res => {
        if (res.data) audioMap[res.index] = res.data;
      });
      
      setGeneratedData({
        deck: deckContent,
        images: imagesMap,
        audio: audioMap
      });

      setState(AppState.DECK);
    } catch (err: any) {
      console.error(err);
      // Guideline: Reset key selection state and prompt again if entity not found (e.g. project deleted or billing issue)
      if (err.message?.includes("Requested entity was not found")) {
        if (window.aistudio) await window.aistudio.openSelectKey();
        setError("API configuration error. Please select a valid project with an active billing account.");
      } else {
        setError("Failed to generate content. Please check your connection and try again.");
      }
      setState(AppState.ERROR);
    }
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const sharedTopic = params.get('topic');

    if (sharedTopic) {
      setCompetency(sharedTopic);
      // Auto-start generation for shared links
      generateContent(sharedTopic, '1K'); 
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competency.trim()) return;
    generateContent(competency, imageSize);
  };

  const renderInput = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full text-center space-y-8 animate-fade-in-up">
        <div className="space-y-2">
           <div className="inline-block p-3 rounded-2xl bg-white shadow-lg mb-4">
             <div className="h-12 w-12 bg-gradient-to-tr from-emerald-400 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
               AI
             </div>
           </div>
           <h1 className="text-4xl md:text-5xl font-bold text-gray-800 tracking-tight">
             Deep<span className="text-emerald-600">Deck</span>
           </h1>
           <p className="text-gray-500 text-lg">
             Generate a comprehensive 15-slide scientific mastery deck with custom infographics and narration.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full bg-white p-8 rounded-3xl shadow-xl border border-white/50">
          <div className="relative mb-6">
            <textarea
              value={competency}
              onChange={(e) => setCompetency(e.target.value)}
              placeholder="e.g., The principles of supply and demand in microeconomics..."
              className="w-full h-32 p-4 text-lg bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white focus:ring-0 transition-all resize-none placeholder-gray-400 outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Infographic Quality</label>
              <div className="flex gap-2">
                {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setImageSize(size)}
                    className={`flex-1 py-2 px-2 text-sm rounded-lg border font-medium transition-all ${
                      imageSize === size
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">Narrator Voice</label>
               <select 
                 value={voiceAccent}
                 onChange={(e) => setVoiceAccent(e.target.value as VoiceAccent)}
                 className="w-full py-2 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
               >
                 <option value="American">American (Standard)</option>
                 <option value="British">British (Refined)</option>
                 <option value="Indian">Indian (Friendly)</option>
                 <option value="Nigerian">Nigerian (Lively)</option>
               </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!competency.trim()}
            className="w-full bg-gray-900 text-white text-lg font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Master Deck
          </button>
        </form>

        <div className="text-sm text-gray-400">
           Powered by Gemini 3 Pro, Nano Banana Pro & Gemini TTS
        </div>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
      <div className="text-center space-y-6">
        <div className="relative h-20 w-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          <div className="absolute inset-4 rounded-full border-4 border-purple-200 border-b-transparent animate-spin-reverse"></div>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-800 animate-pulse">{loadingStep}</h3>
          <p className="text-gray-500 mt-2">This may take about 30 seconds...</p>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
        <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => setState(AppState.INPUT)}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-purple-50 overflow-hidden text-gray-800">
      {state === AppState.INPUT && renderInput()}
      {state === AppState.LOADING && renderLoading()}
      {state === AppState.ERROR && renderError()}
      {state === AppState.DECK && generatedData && (
        <Deck 
          data={generatedData}
          competency={competency} 
          onRestart={() => {
            setCompetency('');
            // Clear URL param when restarting
            const url = new URL(window.location.href);
            url.searchParams.delete('topic');
            window.history.pushState({}, '', url);
            setState(AppState.INPUT);
          }} 
        />
      )}
    </div>
  );
}

export default App;

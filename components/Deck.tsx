import React, { useState, useEffect, useRef } from 'react';
import { GeneratedAsset, Slide, SlideType } from '../types';
import { FlipCard } from './FlipCard';
import { QuizCard } from './QuizCard';

interface DeckProps {
  data: GeneratedAsset;
  competency: string;
  onRestart: () => void;
}

const pcmToWavBlob = (base64PCM: string): string => {
  const binaryString = atob(base64PCM);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Mono
  view.setUint16(22, 1, true); // Channels: 1
  view.setUint32(24, 24000, true); // Sample Rate
  view.setUint32(28, 24000 * 2, true); // Byte Rate
  view.setUint16(32, 2, true); // Block Align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);
  
  const bytes = new Uint8Array(buffer, 44);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const Deck: React.FC<DeckProps> = ({ data, competency, onRestart }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const currentAudioUrl = useRef<string | null>(null);

  const slides = data.deck.slides;
  const currentSlide = slides[slideIndex];

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('topic', competency);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const animateProgress = () => {
    if (audioRef.current && audioRef.current.duration) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
    }
    requestRef.current = requestAnimationFrame(animateProgress);
  };

  useEffect(() => {
    audioRef.current = new Audio();
    requestRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const playAudio = async () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioProgress(0);

      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current);
        currentAudioUrl.current = null;
      }

      if (isMuted) return;

      const pcmData = data.audio[slideIndex];
      if (pcmData) {
        const url = pcmToWavBlob(pcmData);
        currentAudioUrl.current = url;
        audioRef.current.src = url;
        try {
          await audioRef.current.play();
        } catch (e) {
          console.warn("Autoplay blocked. Tap anywhere to enable audio.");
        }
      }
    };
    playAudio();
  }, [slideIndex, isMuted, data.audio]);

  const renderSlideContent = (slide: Slide) => {
    switch (slide.type) {
      case SlideType.INTRO:
        return (
          <div className="flex flex-col h-full p-8 md:p-12 overflow-y-auto" id="slide-content">
            <div className="max-w-4xl mx-auto w-full">
                <div className="bg-emerald-100 text-emerald-800 px-4 py-1 rounded-full text-xs font-bold mb-6 inline-block tracking-wider uppercase">Context & Analogy</div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-8 leading-tight">{slide.title}</h1>
                <div className="text-xl leading-relaxed text-gray-600 space-y-8">
                  {slide.content.split('\n').map((p, i) => p.trim() && <p key={i}>{p}</p>)}
                </div>
            </div>
          </div>
        );
      case SlideType.DEEP_DIVE:
        const imageUrl = data.images[slideIndex];
        return (
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            <div className="flex-1 p-8 md:p-12 overflow-y-auto" id="slide-content">
              <div className="bg-purple-100 text-purple-800 px-4 py-1 rounded-full text-xs font-bold mb-6 inline-block tracking-wider uppercase">Visual Deep Dive</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">{slide.title}</h2>
              <div className="text-lg text-gray-600 space-y-6 leading-relaxed">
                {slide.content.split('\n').map((p, i) => p.trim() && <p key={i}>{p}</p>)}
              </div>
            </div>
            <div className="flex-1 bg-gray-50 p-6 flex items-center justify-center relative">
                {imageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img src={imageUrl} alt="Infographic" className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl transition-transform duration-700 hover:scale-[1.02] bg-white border border-gray-100" />
                    </div>
                ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-medium">Rendering 3D Visuals...</p>
                    </div>
                )}
            </div>
          </div>
        );
      case SlideType.VOCABULARY:
        return (
          <div className="flex flex-col h-full p-8 overflow-y-auto" id="slide-content">
            <div className="text-center mb-12">
                <span className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">Key Terminology</span>
                <h2 className="text-3xl font-bold text-gray-800 mt-4">{slide.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full pb-12">
              {slide.vocabulary?.map((item, idx) => <FlipCard key={idx} item={item} />)}
            </div>
          </div>
        );
      case SlideType.SCENARIO:
        return (
          <div className="flex flex-col h-full p-8 overflow-y-auto" id="slide-content">
            <div className="max-w-3xl mx-auto w-full">
                <div className="bg-orange-100 text-orange-800 px-4 py-1 rounded-full text-xs font-bold mb-6 inline-block tracking-wider uppercase">Scenario Analysis</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">{slide.title}</h2>
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 mb-10 text-gray-700 leading-relaxed text-lg border-l-8 border-l-orange-400">
                     {slide.content}
                </div>
                {slide.quiz && <QuizCard data={slide.quiz} />}
            </div>
          </div>
        );
      case SlideType.CONCLUSION:
        return (
             <div className="flex flex-col h-full p-8 overflow-y-auto items-center justify-center text-center" id="slide-content">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="bg-emerald-900 text-emerald-100 px-4 py-1 rounded-full text-xs font-bold mb-6 inline-block tracking-wider uppercase">Mastery Final</div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-6">{slide.title}</h1>
                    <div className="text-xl text-gray-600 mb-12 leading-relaxed">{slide.content}</div>
                    {slide.quiz && <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-left"><QuizCard data={slide.quiz} /></div>}
                </div>
            </div>
        );
      default: return <div>Unknown slide type</div>;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onRestart} className="text-gray-500 hover:text-gray-900 font-bold text-sm flex items-center gap-2">✕ EXIT</button>
            <button onClick={handleShare} className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-tighter transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {copied ? 'Copied' : 'Share Link'}
            </button>
        </div>
        <div className="flex items-center gap-6">
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              )}
            </button>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Slide <span className="text-gray-900">{slideIndex + 1}</span> / {slides.length}
            </div>
        </div>
      </div>

      {/* Global Deck Progress */}
      <div className="w-full h-1.5 bg-gray-100 shrink-0">
        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}></div>
      </div>

      {/* Slide Container */}
      <div className="flex-1 overflow-hidden relative">
        <div key={slideIndex} className={`h-full w-full ${direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
          {renderSlideContent(currentSlide)}
        </div>
        
        {/* Determinate Narration Progress Bar - Contextual position at the very bottom of the slide view */}
        {!isMuted && data.audio[slideIndex] && (
           <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-200/50 backdrop-blur-sm z-40">
             <div 
               className="h-full bg-purple-600 transition-all duration-[100ms] ease-linear shadow-[0_0_8px_rgba(147,51,234,0.5)]" 
               style={{ width: `${audioProgress}%` }}
             ></div>
           </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-6 flex justify-between items-center z-30 shrink-0">
        <button 
            onClick={() => { setDirection('backward'); if (slideIndex > 0) setSlideIndex(v => v - 1); }} 
            disabled={slideIndex === 0} 
            className={`px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${slideIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'}`}
        >
          ← PREV
        </button>

        <button 
            onClick={() => { if (slideIndex === slides.length - 1) onRestart(); else { setDirection('forward'); setSlideIndex(v => v + 1); } }} 
            className="bg-gray-900 text-white px-10 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-black active:scale-[0.97] transition-all flex items-center gap-3"
        >
          {slideIndex === slides.length - 1 ? 'FINISH MODULE' : 'NEXT SLIDE'}
          {slideIndex < slides.length - 1 && <span className="text-xl">→</span>}
        </button>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { QuizData } from '../types';

interface QuizCardProps {
  data: QuizData;
}

export const QuizCard: React.FC<QuizCardProps> = ({ data }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setIsSubmitted(true);
  };

  const getOptionStyle = (index: number) => {
    const baseStyle = "w-full p-4 rounded-xl text-left border-2 transition-all duration-200 mb-3 flex items-center justify-between";
    
    if (!isSubmitted) {
      if (selectedIndex === index) {
        return `${baseStyle} border-purple-500 bg-purple-50 text-purple-900 shadow-sm`;
      }
      return `${baseStyle} border-gray-100 bg-white hover:border-purple-200 hover:bg-gray-50 text-gray-700`;
    }

    // Submitted state
    if (index === data.correctIndex) {
      return `${baseStyle} border-green-500 bg-green-50 text-green-900 font-medium`;
    }
    
    if (selectedIndex === index && index !== data.correctIndex) {
      return `${baseStyle} border-red-400 bg-red-50 text-red-900`;
    }

    return `${baseStyle} border-gray-100 bg-gray-50 text-gray-400 opacity-60`;
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 leading-tight">
        {data.question}
      </h3>
      
      <div className="space-y-3">
        {data.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={getOptionStyle(idx)}
            disabled={isSubmitted}
          >
            <span>{option}</span>
            {isSubmitted && idx === data.correctIndex && (
               <span className="text-green-600">✓</span>
            )}
             {isSubmitted && selectedIndex === idx && idx !== data.correctIndex && (
               <span className="text-red-500">✕</span>
            )}
          </button>
        ))}
      </div>

      {!isSubmitted && (
        <div className="mt-6 text-center">
          <button
            onClick={handleSubmit}
            disabled={selectedIndex === null}
            className={`px-8 py-3 rounded-full font-semibold transition-all ${
              selectedIndex !== null
                ? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Check Answer
          </button>
        </div>
      )}

      {isSubmitted && (
         <div className={`mt-6 text-center p-3 rounded-lg ${selectedIndex === data.correctIndex ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {selectedIndex === data.correctIndex ? "Correct! Great job." : "Not quite. Review the Deep Dive module."}
         </div>
      )}
    </div>
  );
};

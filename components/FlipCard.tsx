import React, { useState } from 'react';
import { VocabularyItem } from '../types';

interface FlipCardProps {
  item: VocabularyItem;
}

export const FlipCard: React.FC<FlipCardProps> = ({ item }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="group h-48 w-full cursor-pointer perspective-1000"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden rounded-xl bg-white shadow-md border-2 border-emerald-100 flex items-center justify-center p-4">
          <h3 className="text-xl font-bold text-emerald-800 text-center">{item.term}</h3>
          <span className="absolute bottom-3 right-3 text-xs text-purple-400 font-medium">Click to flip</span>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl bg-purple-50 shadow-md border-2 border-purple-100 flex items-center justify-center p-4 text-center">
          <p className="text-gray-700 text-sm font-medium leading-relaxed">
            {item.definition}
          </p>
        </div>
      </div>
    </div>
  );
};

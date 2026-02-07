
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => {
  return (
    <div className={`${className} relative flex items-center justify-center`}>
      <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20"></div>
      <img 
        src="https://eburon.ai/assets/icon-eburon.png" 
        alt="Eburon Logo" 
        className="relative w-full h-full object-contain filter drop-shadow-sm brightness-110"
      />
    </div>
  );
};

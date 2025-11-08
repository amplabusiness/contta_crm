import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  return (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs
                      bg-gray-900 text-white text-xs rounded-md py-1.5 px-3
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      pointer-events-none shadow-lg border border-gray-700
                      tooltip">
        {text}
      </div>
    </div>
  );
};

export default Tooltip;

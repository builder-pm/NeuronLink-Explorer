import React from 'react';
import { ChevronLeftIcon } from './icons';

interface PanelToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

const PanelToggle: React.FC<PanelToggleProps> = ({ isOpen, onToggle }) => {
  return (
    <div className="absolute top-1/2 right-0 -translate-y-1/2 z-20">
      <button
        onClick={onToggle}
        className="w-6 h-6 bg-card border-2 border-border flex items-center justify-center shadow-brutal hover:bg-primary hover:text-primary-foreground transition-all focus:ring-2 focus:ring-primary"
        style={{ transform: `translateX(${isOpen ? '0%' : '50%'})` }}
        title={isOpen ? 'Collapse Panel' : 'Expand Panel'}
        aria-label={isOpen ? 'Collapse Panel' : 'Expand Panel'}
        aria-expanded={isOpen}
      >
        <ChevronLeftIcon className={`h-4 w-4 text-foreground transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
};

export default PanelToggle;

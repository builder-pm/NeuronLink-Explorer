import React from 'react';
import { FieldsIcon, DatabaseIcon, GithubIcon } from './icons';
import { PanelType } from '../types';
import { useAppDispatch, useAppState } from '../state/context';
import { ActionType } from '../state/actions';

interface HeaderProps {
  onSaveConfig: () => void;
  activePanel: PanelType;
  onTogglePanel: (panel: PanelType) => void;
  onLoadConfig: () => void;
  configName: string;
  onConfigNameChange: (name: string) => void;
  isGuest?: boolean;
  onSignIn?: () => void;
}

const Header: React.FC<HeaderProps> = (props) => {
  const {
    onSaveConfig, activePanel,
    onTogglePanel, onLoadConfig,
    configName, onConfigNameChange,
    isGuest, onSignIn
  } = props;
  const { currentView } = useAppState();
  const dispatch = useAppDispatch();

  const handlePanelToggle = (panel: PanelType) => {
    const targetView = panel === 'db-config' ? 'modeling' : 'analysis';
    if (currentView !== targetView) {
      dispatch({ type: ActionType.SET_VIEW, payload: targetView });
    }
    onTogglePanel(panel);
  }

  return (
    <header className="bg-card border-b-2 border-border shadow-brutal z-10 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b-2 border-border">
        <div className="flex items-center space-x-4">
          <a
            href="https://www.namankansal.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:opacity-80 transition-opacity"
            title="Visit Portfolio"
          >
            <img src="/favicon-symbolic.png" alt="NeuronLink" className="h-7 w-7 mr-2 object-contain" />
            <h1 className="text-xl font-bold text-primary font-mono tracking-wider uppercase">NeuronLink</h1>
          </a>
          {isGuest && (
            <div className="bg-yellow-400 text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter shadow-brutal border border-black animate-pulse">
              Guest Mode (Limited)
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isGuest && (
            <button
              onClick={onSignIn}
              className="px-3 py-1 bg-primary text-primary-foreground border-2 border-border text-[11px] font-bold uppercase shadow-brutal-xs hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all mr-4"
            >
              Sign In to Unlock
            </button>
          )}
          <button
            onClick={() => handlePanelToggle('fields')}
            title="Table View"
            aria-label="Toggle table view panel"
            className={`p-2 border-2 border-border transition-colors ${activePanel === 'fields' && currentView === 'analysis' ? 'bg-primary text-primary-foreground shadow-brutal' : 'hover:bg-accent hover:text-accent-foreground text-foreground'}`}>
            <FieldsIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handlePanelToggle('db-config')}
            title="Database Configuration"
            aria-label="Toggle database configuration panel"
            className={`p-2 border-2 border-border transition-colors ${currentView === 'modeling' ? 'bg-primary text-primary-foreground shadow-brutal' : 'hover:bg-accent hover:text-accent-foreground text-foreground'}`}>
            <DatabaseIcon className="h-5 w-5" />
          </button>
          <div className="border-l-2 border-border h-6 mx-1"></div>
          <a
            href="https://github.com/builder-pm/NeuronLink-lakehouse"
            target="_blank"
            rel="noopener noreferrer"
            title="see source code"
            className="p-2 border-2 border-border hover:bg-accent hover:text-accent-foreground transition-all hover:shadow-brutal-xs flex items-center justify-center"
          >
            <GithubIcon className="h-5 w-5" />
          </a>
          <a
            href="https://namankansal.in"
            target="_blank"
            rel="noopener noreferrer"
            title="Connect with me"
            className="p-2 border-2 border-border hover:bg-accent transition-all hover:shadow-brutal-xs flex items-center justify-center bg-card"
          >
            <img src="/naman-favicon.svg" alt="Portfolio" className="h-5 w-5 object-contain" />
          </a>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-card">
        <div className="flex items-center space-x-4">
          <label htmlFor="configNameInput" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Name *</label>
          <input
            type="text"
            id="configNameInput"
            value={configName}
            onChange={(e) => onConfigNameChange(e.target.value)}
            className="brutal-input text-lg text-primary font-semibold bg-transparent px-1"
            aria-required="true"
          />
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={onLoadConfig} className="brutal-button-secondary text-xs">
            <span aria-hidden="true" className="mr-1">&#8593;</span> Load Config
          </button>
          <button onClick={onSaveConfig} className="brutal-button-secondary text-xs">
            <span aria-hidden="true" className="mr-1">&#8595;</span> Save Config
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

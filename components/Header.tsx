import React from 'react';
import { FieldsIcon, DatabaseIcon } from './icons';
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
}

const Header: React.FC<HeaderProps> = (props) => {
  const {
    onSaveConfig, activePanel,
    onTogglePanel, onLoadConfig,
    configName, onConfigNameChange
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
        <div className="flex items-center">
          <a
            href="https://www.namankansal.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:opacity-80 transition-opacity"
            title="Visit Portfolio"
          >
            <img src="/favicon.png" alt="NK Logo" className="h-6 w-6 mr-2 object-contain border border-border" />
            <h1 className="text-xl font-bold text-primary font-mono tracking-wider uppercase">NeuronLink</h1>
          </a>
        </div>
        <div className="flex items-center space-x-2">
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

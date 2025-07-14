import React from 'react';
import { SqlIcon, FieldsIcon, ChatIcon, DatabaseIcon, SunIcon, MoonIcon, RefreshIcon } from './icons';
import { PanelType } from '../types';
import { useAppDispatch, useAppState } from '../state/context';
import { ActionType } from '../state/actions';

interface HeaderProps {
  onRefreshData: () => void;
  onSaveConfig: () => void;
  activePanel: PanelType;
  onTogglePanel: (panel: PanelType) => void;
  onLoadConfig: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  configName: string;
  onConfigNameChange: (name: string) => void;
}

const Header: React.FC<HeaderProps> = (props) => {
    const { 
        onRefreshData, onSaveConfig, activePanel, 
        onTogglePanel, onLoadConfig, onToggleTheme, theme, 
        configName, onConfigNameChange
    } = props;
    const { currentView } = useAppState();
    const dispatch = useAppDispatch();

  const iconButtonClasses = "p-2 rounded-md transition-colors duration-200";
  const activeIconButtonClasses = "bg-blue-700";
  const inactiveIconButtonClasses = "hover:bg-blue-800";
  
  const handlePanelToggle = (panel: PanelType) => {
      const targetView = panel === 'db-config' ? 'modeling' : 'analysis';
      if (currentView !== targetView) {
          dispatch({ type: ActionType.SET_VIEW, payload: targetView });
      }
      onTogglePanel(panel);
  }

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm z-10 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-2 bg-[#001f3f] dark:bg-slate-900">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-white">NeuronLink</h1>
        </div>
        <div className="flex items-center space-x-2">
           <button 
            onClick={() => handlePanelToggle('fields')}
            title="Selected Fields"
            aria-label="Toggle selected fields panel"
            className={`${iconButtonClasses} ${activePanel === 'fields' && currentView === 'analysis' ? activeIconButtonClasses : inactiveIconButtonClasses}`}>
            <FieldsIcon className="h-5 w-5 text-white" />
          </button>
          <button 
            onClick={() => handlePanelToggle('db-config')}
            title="Database Configuration"
            aria-label="Toggle database configuration panel"
            className={`${iconButtonClasses} ${currentView === 'modeling' ? activeIconButtonClasses : inactiveIconButtonClasses}`}>
            <DatabaseIcon className="h-5 w-5 text-white" />
          </button>
           <button 
            onClick={() => handlePanelToggle('chat')}
            title="AI Assistant"
            aria-label="Toggle AI assistant panel"
            className={`${iconButtonClasses} ${activePanel === 'chat' && currentView === 'analysis' ? activeIconButtonClasses : inactiveIconButtonClasses}`}>
            <ChatIcon className="h-5 w-5 text-white" />
          </button>
          <div className="border-l border-blue-800 dark:border-slate-700 h-6 mx-1"></div>
          <button onClick={onToggleTheme} className="p-2 rounded-md hover:bg-blue-800 transition-colors duration-200" title="Toggle Theme" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
             {theme === 'light' ? <MoonIcon className="h-5 w-5 text-white" /> : <SunIcon className="h-5 w-5 text-white" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800">
        <div className="flex items-center space-x-4">
          <label htmlFor="configNameInput" className="text-sm font-medium text-gray-600 dark:text-slate-400">Name *</label>
          <input 
            type="text"
            id="configNameInput" 
            value={configName}
            onChange={(e) => onConfigNameChange(e.target.value)}
            className="text-lg text-blue-600 dark:text-blue-400 font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md -ml-1 px-1"
            aria-required="true"
          />
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={onLoadConfig}
            className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">
            <span aria-hidden="true" className="mr-1">↑</span> Load Config
          </button>
          <button 
            onClick={onSaveConfig}
            className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">
            <span aria-hidden="true" className="mr-1">↓</span> Save Config
          </button>
          <button 
            onClick={onRefreshData}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshIcon className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
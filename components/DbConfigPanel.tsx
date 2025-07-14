import React, { useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { ChevronDownIcon, DatabaseIcon, EyeIcon, SearchIcon, SqlIcon, CogIcon, SpinnerIcon } from './icons';
import { useAppState } from '../state/context';
import { format } from 'sql-formatter';
import { toast } from 'react-hot-toast';
import { DataRow, DatabaseType } from '../types';
import TablePreviewModal from './TablePreviewModal';
import { ActionType, AppAction } from '../state/actions';

interface DbConfigPanelProps {
    sqlQuery: string;
    onSqlQueryChange: (query: string) => void;
    onApplySqlQuery: (query: string) => void;
    selectedFields: string[];
    onFieldChange: (field: string, isSelected: boolean) => void;
    availableFields: string[];
    executeQuery: (query: string) => Promise<DataRow[]>;
    onConfigureCredentialsClick: () => void;
    // Connection status
    isConnecting: boolean;
    isConnected: boolean;
    dbType: DatabaseType;
    isDemoMode: boolean;
    onToggleDemoMode: () => void;
    dispatch: React.Dispatch<AppAction>;
}

const DbConfigPanel: React.FC<DbConfigPanelProps> = ({ 
    sqlQuery, 
    onSqlQueryChange, 
    onApplySqlQuery,
    selectedFields, 
    onFieldChange, 
    availableFields,
    executeQuery,
    onConfigureCredentialsClick,
    isConnecting,
    isConnected,
    dbType,
    isDemoMode,
    onToggleDemoMode,
    dispatch
}) => {
    const { theme, isModelDirty } = useAppState();
    const [searchTerm, setSearchTerm] = useState('');
    const [previewData, setPreviewData] = useState<{name: string, data: DataRow[]} | null>(null);

    const filteredFields = availableFields.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleFormatSql = () => {
        try {
            const formattedQuery = format(sqlQuery, { language: 'sql' });
            onSqlQueryChange(formattedQuery);
            toast.success('SQL formatted successfully!');
        } catch (error) {
            console.error("Failed to format SQL:", error);
            toast.error('Could not format SQL. Check for syntax errors.');
        }
    };
    
    const handleSelectAll = () => dispatch({ type: ActionType.SET_SELECTED_FIELDS, payload: availableFields });
    const handleClearAll = () => dispatch({ type: ActionType.SET_SELECTED_FIELDS, payload: [] });

    const ConnectionStatusIndicator = () => {
        let statusClass = 'bg-slate-400';
        let statusTitle = 'Disconnected';
        if (dbType === 'sqlite') {
            statusTitle = 'Using In-Browser SQLite';
            statusClass = 'bg-blue-500';
        } else if (isConnecting) {
            return <SpinnerIcon className="h-4 w-4 text-blue-500 animate-spin" />;
        } else if (isConnected) {
            statusClass = 'bg-green-500';
            statusTitle = 'Connected to Lakehouse';
        }

        return <div className={`h-3 w-3 rounded-full ${statusClass}`} title={statusTitle} />;
    };

    const DemoModeToggle = () => {
        if (dbType !== 'sqlite') return null;

        return (
            <div className="flex items-center justify-between mt-4 p-3 rounded-md bg-slate-100 dark:bg-slate-900/50">
                <label htmlFor="demo-mode-toggle" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Demo Mode
                </label>
                <div 
                    onClick={onToggleDemoMode}
                    className="relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer"
                    role="switch"
                    aria-checked={isDemoMode}
                    id="demo-mode-toggle"
                >
                    <span className={`${isDemoMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'} absolute h-full w-full rounded-full`}></span>
                    <span className={`${isDemoMode ? 'translate-x-6' : 'translate-x-1'} absolute w-4 h-4 transform bg-white rounded-full transition-transform`}></span>
                </div>
            </div>
        )
    };

    const FieldsList = () => {
        if (isModelDirty) {
            return <p className="text-xs text-center text-gray-400 dark:text-slate-500 p-4">You have unconfirmed changes. Click "Confirm Model" on the canvas to update available fields.</p>
        }
        if (availableFields.length === 0) {
             if (!isDemoMode && !isConnected) {
                return <p className="text-xs text-center text-gray-400 dark:text-slate-500 p-4">Connect to a data source to begin.</p>
             }
            return <p className="text-xs text-center text-gray-400 dark:text-slate-500 p-4">No fields available. Define and confirm a valid data model (with joins) to populate this list.</p>;
        }
        if (filteredFields.length === 0) {
             return <p className="text-xs text-center text-gray-400 dark:text-slate-500 p-4">No matching fields found.</p>;
        }
        return (
             <div className="pl-2 space-y-1 mt-1 max-h-48 overflow-y-auto">
                 {filteredFields.map(field => (
                    <label key={field} className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={selectedFields.includes(field)}
                          onChange={(e) => onFieldChange(field, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-600 text-blue-600 focus:ring-blue-500" 
                        />
                        <span className="text-sm text-gray-700 dark:text-slate-300">{field.replace(/_/g, ' ')}</span>
                    </label>
                ))}
            </div>
        );
    }

    return (
    <>
    <aside className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col flex-shrink-0">
      <div className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
                <DatabaseIcon className="h-6 w-6 text-gray-700 dark:text-slate-300"/>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200">DB Configuration</h2>
                <ConnectionStatusIndicator />
            </div>
            <button 
                onClick={onConfigureCredentialsClick}
                title="Configure Database Credentials"
                className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
                <CogIcon className="h-5 w-5" />
            </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">Define your data model and view the resulting fields.</p>
        <DemoModeToggle />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Field Selection */}
        <details className="group" open>
            <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md list-none font-semibold text-base text-gray-700 dark:text-slate-300">
                <span>Available Fields ({selectedFields.length} / {availableFields.length})</span>
                <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="space-y-2 mt-2">
                 <div className="flex items-center justify-between">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search fields..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-slate-700"
                        />
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <button onClick={handleSelectAll} disabled={availableFields.length === 0} className="text-xs font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline dark:text-blue-400 dark:disabled:text-slate-500">Select All</button>
                    <span className="text-gray-300 dark:text-slate-600">|</span>
                    <button onClick={handleClearAll} disabled={selectedFields.length === 0} className="text-xs font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline dark:text-blue-400 dark:disabled:text-slate-500">Clear All</button>
                </div>
            </div>
            <FieldsList />
        </details>

        {/* SQL Query Editor */}
        <details className="group" open>
            <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md list-none font-semibold text-base text-gray-700 dark:text-slate-300">
                <div className="flex items-center space-x-2">
                    <SqlIcon className="h-5 w-5" />
                    <span>SQL Editor</span>
                </div>
                <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-2 h-64 flex flex-col">
                 <div className="flex-grow border border-gray-300 dark:border-slate-600 rounded-md overflow-hidden">
                    <Editor
                        height="100%"
                        language="sql"
                        value={sqlQuery}
                        onChange={(value) => onSqlQueryChange(value || '')}
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 12,
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                        }}
                    />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <button 
                      onClick={() => onApplySqlQuery(sqlQuery)}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                      Run Query
                    </button>
                    <button 
                      onClick={handleFormatSql}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                      title="Format SQL Query"
                    >
                      Format
                    </button>
                </div>
            </div>
        </details>

      </div>
    </aside>
    {previewData && (
        <TablePreviewModal 
            tableName={previewData.name}
            data={previewData.data}
            onClose={() => setPreviewData(null)}
        />
    )}
    </>
  );
};

export default DbConfigPanel;
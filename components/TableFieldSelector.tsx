import React, { useState } from 'react';
import { ChevronDownIcon, SearchIcon } from './icons';
import { ModelConfiguration } from '../types';
import { ActionType, AppAction } from '../state/actions';

interface TableFieldSelectorProps {
    allTables: { name: string, fields: string[] }[];
    modelConfig: ModelConfiguration;
    dispatch: React.Dispatch<AppAction>;
}

const TableFieldSelector: React.FC<TableFieldSelectorProps> = ({ allTables, modelConfig, dispatch }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleTableSelection = (tableName: string, isSelected: boolean) => {
        dispatch({
            type: ActionType.UPDATE_MODEL_CONFIG,
            payload: { tableName, isSelected }
        });
    };

    const handleFieldSelection = (tableName: string, fieldName: string, isSelected: boolean) => {
        const currentFields = modelConfig[tableName] || [];
        const newFields = isSelected
            ? [...currentFields, fieldName]
            : currentFields.filter(f => f !== fieldName);
        
        dispatch({
            type: ActionType.UPDATE_MODEL_CONFIG,
            payload: { tableName, fields: newFields }
        });
    };

    const filteredTables = allTables.filter(table =>
        table.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200 mb-2">Select Tables & Fields</h3>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tables..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredTables.length > 0 ? filteredTables.map(table => {
                    const isTableSelected = modelConfig[table.name] !== undefined;
                    const selectedFields = modelConfig[table.name] || [];

                    return (
                        <details key={table.name} className="group/table" open={isTableSelected}>
                            <summary className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-md list-none">
                                <label className="flex items-center space-x-3 flex-1 cursor-pointer" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isTableSelected}
                                        onChange={(e) => handleTableSelection(table.name, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-600 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-semibold text-sm">{table.name}</span>
                                </label>
                                <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-slate-400 group-open/table:rotate-180 transition-transform" />
                            </summary>
                            <div className="pl-6 pt-1 border-l-2 border-gray-200 dark:border-slate-600 ml-4 space-y-1">
                                {isTableSelected && table.fields.map(field => (
                                    <label key={field} className="flex items-center space-x-3 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-md cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.includes(field)}
                                            onChange={(e) => handleFieldSelection(table.name, field, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-600 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-slate-300">{field}</span>
                                    </label>
                                ))}
                            </div>
                        </details>
                    )
                }) : (
                     <p className="px-4 py-2 text-sm text-gray-400 dark:text-slate-500">
                        {searchTerm ? 'No matching tables found.' : 'No tables discovered from the data source.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default TableFieldSelector;

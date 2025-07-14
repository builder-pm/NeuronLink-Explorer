import React from 'react';
import DataTable from './DataTable';
import { DataRow } from '../types';
import { DatabaseIcon } from './icons';

interface MainContentProps {
  data: DataRow[];
  tableHeaders: string[];
  isLoading: boolean;
  fileName: string;
  onFileNameChange: (name: string) => void;
  onExport: () => void;
  // Pagination
  currentPage: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  isDemoMode: boolean;
  isPristine: boolean;
}

const MainContent: React.FC<MainContentProps> = (props) => {
  const { 
    data, 
    tableHeaders,
    isLoading, 
    fileName,
    onFileNameChange,
    onExport,
    currentPage,
    rowsPerPage,
    totalRows,
    onPageChange,
    onRowsPerPageChange,
    isDemoMode,
    isPristine
  } = props;

  const EmptyPlaceholder = () => {
    const title = isDemoMode ? "Data Analysis" : "Ready for your data";
    const message = isDemoMode
        ? "Your query results will appear here. Use the side panels to configure your data view, apply pivots, and add filters."
        : "Connect to a Lakehouse data source or load a configuration file from the top bar to begin your analysis.";
    
    return (
        <div className="text-center p-10 flex flex-col items-center justify-center h-full">
            <DatabaseIcon className="h-16 w-16 text-gray-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-md">
                {message}
            </p>
        </div>
    );
  };

  return (
    <main className="flex-1 p-4 bg-gray-50 dark:bg-slate-900/80 flex flex-col overflow-hidden relative">
      <div className="flex flex-col flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-4 items-center text-sm flex-shrink-0">
          <div className="flex items-center space-x-4">
            <label htmlFor="fileNameInput" className="font-medium text-gray-600 dark:text-slate-400">File Name *</label>
            <input
              type="text"
              id="fileNameInput"
              value={fileName}
              onChange={(e) => onFileNameChange(e.target.value)}
              className="text-blue-600 dark:text-blue-400 font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md px-1"
              aria-required="true"
            />
          </div>
          <div className="flex items-center space-x-4 justify-self-end">
            <label htmlFor="fileFormatSelect" className="font-medium text-gray-600 dark:text-slate-400">File Format</label>
            <div className="relative">
              <select id="fileFormatSelect" className="appearance-none bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md py-1 pl-3 pr-8 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-required="true">
                <option>.xlsx</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
             <button 
                onClick={onExport}
                className="px-4 py-1 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              >
                Export
              </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {totalRows === 0 && !isLoading && isPristine ? (
            <EmptyPlaceholder />
          ) : (
            <DataTable 
              data={data}
              tableHeaders={tableHeaders}
              isLoading={isLoading} 
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              totalRows={totalRows}
              onPageChange={onPageChange}
              onRowsPerPageChange={onRowsPerPageChange}
            />
          )}
        </div>
      </div>
    </main>
  );
};

export default MainContent;
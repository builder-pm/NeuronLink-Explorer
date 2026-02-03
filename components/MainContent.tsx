import React, { useState } from 'react';
import DataTable from './DataTable';
import { DataRow } from '../types';
import { DatabaseIcon, ChevronDownIcon } from './icons';

interface MainContentProps {
  data: DataRow[];
  tableHeaders: string[];
  isLoading: boolean;
  fileName: string;
  onFileNameChange: (name: string) => void;
  onExport: (type?: 'preview' | 'full') => void;
  currentPage: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  isDemoMode: boolean;
  isPristine: boolean;
}

const EmptyPlaceholder: React.FC<{ isDemoMode: boolean }> = ({ isDemoMode }) => {
  const title = isDemoMode ? "Data Analysis" : "Ready for your data";
  const message = isDemoMode
    ? "Your query results will appear here. Use the side panels to configure your data view, apply pivots, and add filters."
    : "Connect to a Lakehouse data source or load a configuration file from the top bar to begin your analysis.";

  return (
    <div className="text-center p-10 flex flex-col items-center justify-center h-full">
      <DatabaseIcon className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold text-foreground mb-2 uppercase tracking-wide font-mono">{title}</h3>
      <p className="text-muted-foreground max-w-md">
        {message}
      </p>
    </div>
  );
};

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

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  return (
    <main className="flex-1 p-4 bg-background flex flex-col overflow-hidden relative">
      <div className="flex flex-col flex-1 bg-card border-2 border-border shadow-brutal overflow-hidden">
        {totalRows === 0 && !isLoading && isPristine ? (
          <EmptyPlaceholder isDemoMode={isDemoMode} />
        ) : (
          <>
            <div className="p-3 border-b-2 border-border grid grid-cols-2 gap-4 items-center text-sm flex-shrink-0">
              <div className="flex items-center space-x-4">
                <label htmlFor="fileNameInput" className="font-medium text-muted-foreground uppercase tracking-wide text-xs">File Name *</label>
                <input
                  type="text"
                  id="fileNameInput"
                  value={fileName}
                  onChange={(e) => onFileNameChange(e.target.value)}
                  className="brutal-input text-primary font-semibold px-1"
                  aria-required="true"
                />
              </div>
              <div className="flex items-center space-x-4 justify-self-end">
                <label htmlFor="fileFormatSelect" className="font-medium text-muted-foreground uppercase tracking-wide text-xs">File Format</label>
                <div className="relative">
                  <select id="fileFormatSelect" className="brutal-select pr-8 text-sm" aria-required="true">
                    <option>.xlsx</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="brutal-button-primary text-xs flex items-center space-x-1"
                  >
                    <span>Export</span>
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-card border-2 border-border shadow-brutal z-50 w-56 flex flex-col">
                      <button
                        onClick={() => {
                          onExport('preview');
                          setIsExportMenuOpen(false);
                        }}
                        className="text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground text-xs font-medium border-b border-border last:border-0"
                      >
                        Export Preview (Visible Rows)
                      </button>
                      <button
                        onClick={() => {
                          onExport('full');
                          setIsExportMenuOpen(false);
                        }}
                        className="text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground text-xs font-medium"
                      >
                        Load full data and export
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
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
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default MainContent;

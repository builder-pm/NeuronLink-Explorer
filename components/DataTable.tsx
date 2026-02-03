import React from 'react';
import { DataRow } from '../types';

interface DataTableProps {
  data: DataRow[];
  tableHeaders: string[];
  isLoading: boolean;
  currentPage: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, tableHeaders, isLoading, currentPage, rowsPerPage, totalRows, onPageChange, onRowsPerPageChange }) => {
  if (isLoading) {
    return (
      <div className="h-full min-h-[400px] relative">
        <div className="loader-overlay">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0 && totalRows === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground h-full min-h-[400px] flex items-center justify-center">
        Select fields and options from the panels and the data will appear here.
      </div>
    );
  }

  const headers = tableHeaders;

  const pageCount = Math.ceil(totalRows / rowsPerPage);
  const startRow = totalRows > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const endRow = Math.min(currentPage * rowsPerPage, totalRows);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left border-collapse" aria-label="Data results">
          <thead className="bg-muted sticky top-0 z-10">
            <tr className="border-b-2 border-border">
              {headers.map(header => (
                <th key={header} scope="col" className="px-4 py-2 font-semibold text-foreground whitespace-nowrap uppercase tracking-wide text-xs font-mono">
                  <span>{header.replace(/_/g, ' ')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {data.length === 0 && totalRows > 0 && (
                <tr>
                    <td colSpan={headers.length || 1} className="text-center p-6 text-muted-foreground">
                        No results on this page.
                    </td>
                </tr>
            )}
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/50 transition-colors">
                {headers.map(header => (
                  <td key={`${rowIndex}-${header}`} className="px-4 py-2 whitespace-nowrap text-card-foreground">
                    {row[header] !== null ? String(row[header]) : <i className="text-muted-foreground">null</i>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0 p-2 text-xs text-muted-foreground border-t-2 border-border flex justify-between items-center bg-muted">
        <div className="flex items-center space-x-2">
            <label htmlFor="rows-per-page-select" className="font-medium uppercase tracking-wide">Rows per page:</label>
            <select
                id="rows-per-page-select"
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                className="brutal-select text-xs py-1"
            >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </select>
            <span className="pl-4 font-mono">
              {startRow} - {endRow} of {totalRows}
            </span>
        </div>
        <div className="flex items-center space-x-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Go to previous page"
                className="brutal-button-secondary text-xs py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>
            <span aria-current="page" className="font-mono text-foreground">Page {currentPage} of {pageCount}</span>
             <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === pageCount || totalRows === 0}
                aria-label="Go to next page"
                className="brutal-button-secondary text-xs py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;

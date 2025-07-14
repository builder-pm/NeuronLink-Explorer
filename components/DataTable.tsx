import React from 'react';
import { DataRow } from '../types';

interface DataTableProps {
  data: DataRow[];
  tableHeaders: string[];
  isLoading: boolean;
  // Pagination
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
      <div className="p-6 text-center text-gray-500 dark:text-slate-400 h-full min-h-[400px] flex items-center justify-center">
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
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0 z-10">
            <tr className="border-b border-gray-200 dark:border-slate-700">
              {headers.map(header => (
                <th key={header} scope="col" className="px-4 py-2 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                  <span className="capitalize">{header.replace(/_/g, ' ')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {data.length === 0 && totalRows > 0 && (
                <tr>
                    <td colSpan={headers.length || 1} className="text-center p-6 text-gray-500 dark:text-slate-400">
                        No results on this page.
                    </td>
                </tr>
            )}
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                {headers.map(header => (
                  <td key={`${rowIndex}-${header}`} className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-slate-200">
                    {row[header] !== null ? String(row[header]) : <i className="text-gray-500 dark:text-slate-400">null</i>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0 p-2 text-xs text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
        <div className="flex items-center space-x-2">
            <label htmlFor="rows-per-page-select" className="font-medium">Rows per page:</label>
            <select
                id="rows-per-page-select"
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-1 text-xs"
            >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </select>
            <span className="pl-4">
              Showing {startRow} - {endRow} of {totalRows}
            </span>
        </div>
        <div className="flex items-center space-x-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Go to previous page"
                className="px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-slate-700"
            >
                Previous
            </button>
            <span aria-current="page">Page {currentPage} of {pageCount}</span>
             <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === pageCount || totalRows === 0}
                aria-label="Go to next page"
                className="px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-slate-700"
            >
                Next
            </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
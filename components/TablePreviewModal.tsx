import React, { useEffect } from 'react';
import { DataRow } from '../types';
import { XIcon } from './icons';

interface TablePreviewModalProps {
  tableName: string;
  data: DataRow[];
  onClose: () => void;
}

const TablePreviewModal: React.FC<TablePreviewModalProps> = ({ tableName, data, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (data.length === 0) {
    return null;
  }
  
  const headers = Object.keys(data[0]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-preview-title"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <h2 id="table-preview-title" className="text-lg font-bold text-gray-800 dark:text-slate-200">
            Preview: <span className="text-blue-600 dark:text-blue-400">{tableName}</span>
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
            aria-label="Close modal"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
              <tr>
                {headers.map(header => (
                  <th key={header} scope="col" className="px-4 py-2 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  {headers.map(header => (
                    <td key={`${rowIndex}-${header}`} className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-slate-200 max-w-xs truncate">
                      {row[header] !== null && row[header] !== undefined ? String(row[header]) : <i className="text-gray-500 dark:text-slate-400">null</i>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

         <div className="p-2 text-xs text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
            Showing first {data.length} rows.
        </div>
      </div>
    </div>
  );
};

export default TablePreviewModal;
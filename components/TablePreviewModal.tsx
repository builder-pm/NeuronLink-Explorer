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
      className="brutal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-preview-title"
    >
      <div
        className="bg-card border-2 border-border shadow-brutal-xl w-full max-w-4xl max-h-[80vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b-2 border-border flex-shrink-0">
          <h2 id="table-preview-title" className="text-lg font-bold text-foreground uppercase tracking-wide font-mono">
            Preview: <span className="text-primary">{tableName}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm text-left" aria-label={`Preview of ${tableName}`}>
            <thead className="bg-muted sticky top-0">
              <tr>
                {headers.map(header => (
                  <th key={header} scope="col" className="px-4 py-2 font-semibold text-foreground whitespace-nowrap uppercase tracking-wide text-xs font-mono">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/50 transition-colors">
                  {headers.map(header => (
                    <td key={`${rowIndex}-${header}`} className="px-4 py-2 whitespace-nowrap text-foreground max-w-xs truncate">
                      {row[header] !== null && row[header] !== undefined ? String(row[header]) : <i className="text-muted-foreground">null</i>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

         <div className="p-2 text-xs text-muted-foreground border-t-2 border-border flex-shrink-0 font-mono">
            Showing first {data.length} rows.
        </div>
      </div>
    </div>
  );
};

export default TablePreviewModal;

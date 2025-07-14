import React, { useState, useEffect } from 'react';
import { Join } from '../types';
import { XIcon } from './icons';

interface JoinEditorModalProps {
  join: Join;
  onClose: () => void;
  onSave: (join: Join) => void;
  onDelete: (join: Join) => void;
  allTables: { name: string; fields: string[]; }[];
}

const JoinEditorModal: React.FC<JoinEditorModalProps> = ({ join: initialJoin, onClose, onSave, onDelete, allTables }) => {
  const [join, setJoin] = useState<Join>(initialJoin);

  // Get all available fields for the two tables from the complete schema, not just selected ones.
  const fromTableSchema = allTables.find(t => t.name === initialJoin.from);
  const toTableSchema = allTables.find(t => t.name === initialJoin.to);
  const fromTableFields = fromTableSchema?.fields || [];
  const toTableFields = toTableSchema?.fields || [];


  // State for selected fields
  const [fromField, setFromField] = useState('');
  const [toField, setToField] = useState('');

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

  useEffect(() => {
    // Initialize state from the structured 'on' object
    if (initialJoin.on) {
        setFromField(initialJoin.on.from || '');
        setToField(initialJoin.on.to || '');
    }
  }, [initialJoin]);


  const handleSave = () => {
    if (fromField && toField) {
      onSave({ ...join, on: { from: fromField, to: toField } });
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-editor-title"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 id="join-editor-title" className="text-lg font-bold text-gray-800 dark:text-slate-200">
            Edit Relationship
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
            aria-label="Close modal"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
                <div className="p-3 border rounded-md bg-gray-50 dark:bg-slate-700/50 dark:border-slate-700">
                    <p className="text-sm text-gray-500 dark:text-slate-400">From Table</p>
                    <p className="font-semibold text-gray-800 dark:text-slate-200">{join.from}</p>
                </div>
                 <div className="p-3 border rounded-md bg-gray-50 dark:bg-slate-700/50 dark:border-slate-700">
                    <p className="text-sm text-gray-500 dark:text-slate-400">To Table</p>
                    <p className="font-semibold text-gray-800 dark:text-slate-200">{join.to}</p>
                </div>
            </div>
            
            <div>
                <label htmlFor="join-type" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Join Type</label>
                <select 
                    id="join-type"
                    value={join.type}
                    onChange={(e) => setJoin({...join, type: e.target.value as Join['type']})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200"
                >
                    <option>LEFT JOIN</option>
                    <option>INNER JOIN</option>
                    <option>RIGHT JOIN</option>
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Join Condition</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <select
                        value={fromField}
                        onChange={(e) => setFromField(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200"
                        aria-label={`Field from ${initialJoin.from}`}
                    >
                        <option value="" disabled>Select field...</option>
                        {fromTableFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <span className="font-bold text-gray-600 dark:text-slate-400">=</span>
                    <select
                        value={toField}
                        onChange={(e) => setToField(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200"
                        aria-label={`Field from ${initialJoin.to}`}
                    >
                        <option value="" disabled>Select field...</option>
                        {toTableFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-b-lg">
            <button
                onClick={() => onDelete(initialJoin)}
                className="px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 rounded-md hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
            >
                Delete Relationship
            </button>
            <div className="flex items-center space-x-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                    Cancel
                </button>
                 <button
                    onClick={handleSave}
                    disabled={!fromField || !toField}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
                >
                    Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default JoinEditorModal;
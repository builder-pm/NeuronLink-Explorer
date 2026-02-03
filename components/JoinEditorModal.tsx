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

  const fromTableSchema = allTables.find(t => t.name === initialJoin.from);
  const toTableSchema = allTables.find(t => t.name === initialJoin.to);
  const fromTableFields = fromTableSchema?.fields || [];
  const toTableFields = toTableSchema?.fields || [];

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
      className="brutal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-editor-title"
    >
      <div
        className="bg-card border-2 border-border shadow-brutal-xl w-full max-w-lg flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b-2 border-border">
          <h2 id="join-editor-title" className="text-lg font-bold text-foreground uppercase tracking-wide font-mono">
            Edit Relationship
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
                <div className="p-3 border-2 border-border bg-muted">
                    <p className="text-sm text-muted-foreground uppercase tracking-wide text-xs">From Table</p>
                    <p className="font-semibold text-primary font-mono">{join.from}</p>
                </div>
                 <div className="p-3 border-2 border-border bg-muted">
                    <p className="text-sm text-muted-foreground uppercase tracking-wide text-xs">To Table</p>
                    <p className="font-semibold text-primary font-mono">{join.to}</p>
                </div>
            </div>

            <div>
                <label htmlFor="join-type" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">Join Type</label>
                <select
                    id="join-type"
                    value={join.type}
                    onChange={(e) => setJoin({...join, type: e.target.value as Join['type']})}
                    className="brutal-select w-full"
                >
                    <option>LEFT JOIN</option>
                    <option>INNER JOIN</option>
                    <option>RIGHT JOIN</option>
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">Join Condition</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <select
                        value={fromField}
                        onChange={(e) => setFromField(e.target.value)}
                        className="brutal-select w-full"
                        aria-label={`Field from ${initialJoin.from}`}
                    >
                        <option value="" disabled>Select field...</option>
                        {fromTableFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <span className="font-bold text-primary font-mono">=</span>
                    <select
                        value={toField}
                        onChange={(e) => setToField(e.target.value)}
                        className="brutal-select w-full"
                        aria-label={`Field from ${initialJoin.to}`}
                    >
                        <option value="" disabled>Select field...</option>
                        {toTableFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t-2 border-border bg-muted">
            <button
                onClick={() => onDelete(initialJoin)}
                className="brutal-button-danger text-xs"
            >
                Delete Relationship
            </button>
            <div className="flex items-center space-x-2">
                <button
                    onClick={onClose}
                    className="brutal-button-secondary text-xs"
                >
                    Cancel
                </button>
                 <button
                    onClick={handleSave}
                    disabled={!fromField || !toField}
                    className="brutal-button-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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

import React, { useState, useEffect, useRef } from 'react';
import { Metric, MetricFormat, TimeIntelligenceType } from '../types';
import { parseFormula, ParsedFormula } from '../utils/formulaParser';
import { XIcon, SpinnerIcon, CalendarIcon, CalculatorIcon } from './icons';

interface MetricBuilderModalProps {
  isOpen: boolean;
  metric?: Metric;  // undefined = create new, defined = edit existing
  availableFields: string[];  // Fields from current model configuration
  onSave: (metric: Partial<Metric>) => Promise<void>;
  onClose: () => void;
}

type FormulaMode = 'formula' | 'sql';

export const MetricBuilderModal: React.FC<MetricBuilderModalProps> = ({
  isOpen,
  metric,
  availableFields,
  onSave,
  onClose
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<FormulaMode>('formula');
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<MetricFormat>('number');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ParsedFormula | null>(null);

  // Time Intelligence
  const [timeIntelligenceType, setTimeIntelligenceType] = useState<TimeIntelligenceType | ''>('');
  const [dateField, setDateField] = useState('');

  // Initialize form when metric changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveError(null);
      if (metric) {
        setName(metric.name || '');
        setFormula(metric.formula || '');
        setDescription(metric.description || '');
        setFormat(metric.format || 'number');
        setCategory(metric.category || '');
        setMode('formula');
        if (metric.timeIntelligence) {
          setTimeIntelligenceType(metric.timeIntelligence.type);
          setDateField(metric.timeIntelligence.dateField);
        } else {
          setTimeIntelligenceType('');
          setDateField('');
        }
      } else {
        setName('');
        setFormula('');
        setDescription('');
        setFormat('number');
        setCategory('');
        setMode('formula');
        setTimeIntelligenceType('');
        setDateField('');
      }
    }
  }, [isOpen, metric]);

  // Handle native dialog show/hide
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle ESC key and backdrop click
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClick = (e: MouseEvent) => {
      // If the click was on the dialog itself (the backdrop), close it
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleClick);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  // Debounced formula validation
  useEffect(() => {
    if (mode === 'sql') {
      setValidation(null);
      return;
    }

    if (!formula.trim()) {
      setValidation(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      const result = parseFormula(formula, availableFields);
      setValidation(result);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formula, availableFields, mode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const metricData: Partial<Metric> = {
        id: metric?.id || crypto.randomUUID(),
        name: name.trim(),
        formula: formula.trim(),
        description: description.trim() || undefined,
        format: format as MetricFormat,
        category: category.trim() || undefined,
        requiredFields: mode === 'formula' ? (validation?.requiredFields || []) : [],
        isGlobal: false,
        createdAt: metric?.createdAt || new Date().toISOString(),
        timeIntelligence: timeIntelligenceType ? {
          type: timeIntelligenceType as TimeIntelligenceType,
          dateField: dateField
        } : undefined
      };
      await onSave(metricData);
      onClose();
    } catch (error: any) {
      console.error('Failed to save metric:', error);
      setSaveError(error.message || 'Failed to save metric. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = name.trim() !== '' && (
    mode === 'sql' 
      ? formula.trim() !== ''
      : (formula.trim() !== '' && validation?.isValid === true)
  ) && (!timeIntelligenceType || dateField !== '');

  return (
    <dialog
      ref={dialogRef}
      className="bg-card text-foreground border-2 border-border shadow-brutal-xl p-0 w-full max-w-2xl backdrop:bg-background/80 backdrop:backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 rounded-none overflow-hidden"
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b-2 border-border bg-card">
          <h2 className="text-xl font-bold uppercase tracking-wider font-mono">
            {metric ? 'Edit Metric' : 'Create New Metric'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1 transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveError && (
            <div className="bg-destructive/10 border-2 border-destructive p-3 text-destructive text-xs font-bold uppercase">
              Error: {saveError}
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-muted-foreground">Metric Name</label>
            <input
              type="text"
              required
              className="brutal-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Total Revenue"
              autoFocus
            />
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1">Creation Mode</label>
              <div className="flex border-2 border-border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setMode('formula')}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-tight transition-colors ${
                    mode === 'formula'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Formula
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sql')}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-tight transition-colors ${
                    mode === 'sql'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Raw SQL
                </button>
              </div>
            </div>
            {mode === 'sql' && (
              <div className="mt-4">
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 border border-border">
                  ADVANCED: Write custom SQL expressions
                </span>
              </div>
            )}
          </div>

          {/* Formula/SQL Textarea */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-muted-foreground">
              {mode === 'formula' ? 'Formula Expression' : 'SQL Expression'}
            </label>
            <textarea
              required
              className="brutal-input w-full min-h-[140px] font-mono text-sm resize-y"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder={mode === 'formula' ? "e.g. SUM(sales) - SUM(cost)" : "e.g. SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)"}
            />            
            {mode === 'formula' && (
              <div className="mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {validation === null ? (
                      formula.trim() !== '' ? (
                        <div className="flex items-center gap-2">
                           <SpinnerIcon className="animate-spin h-3 w-3" />
                           <span className="text-xs text-muted-foreground font-bold">VALIDATING...</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Enter a formula to validate (e.g., SUM(price))</span>
                      )
                    ) : validation.isValid ? (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 border border-green-500/20">
                        <span className="text-[10px] font-black uppercase tracking-widest">✓ Formula Valid</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2 py-0.5 border border-destructive/20">
                        <span className="text-[10px] font-black uppercase tracking-widest">✕ Error: {validation.error}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Required fields */}
                {validation?.requiredFields && validation.requiredFields.length > 0 && (
                  <div className="bg-muted/30 p-3 border-2 border-dashed border-border">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Detected Fields</label>
                    <div className="flex flex-wrap gap-2">
                      {validation.requiredFields.map(field => (
                        <span key={field} className="px-2 py-1 bg-card text-[10px] font-bold border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'sql' && (
              <div className="mt-3 p-3 bg-yellow-500/5 border-2 border-dashed border-yellow-500/30 rounded-none">
                <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-tight leading-relaxed">
                  <strong>⚠️ Warning:</strong> Raw SQL expressions are not validated by the app. 
                  Ensure your SQL is correct for your database and returns a single numeric result.
                </p>
              </div>
            )}
          </div>

          {/* Time Intelligence (Optional) */}
          <div className="p-4 bg-muted/20 border-2 border-border space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <label className="text-xs font-black uppercase tracking-widest">Time Intelligence (Optional)</label>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-muted-foreground">Comparison Type</label>
                <select
                  className="brutal-select w-full text-xs"
                  value={timeIntelligenceType}
                  onChange={(e) => setTimeIntelligenceType(e.target.value as TimeIntelligenceType | '')}
                >
                  <option value="">None</option>
                  <option value="YoY">Year-over-Year (YoY)</option>
                  <option value="MoM">Month-over-Month (MoM)</option>
                  <option value="YTD">Year-to-Date (YTD)</option>
                  <option value="QTD">Quarter-to-Date (QTD)</option>
                  <option value="rolling_avg_7d">7-Day Rolling Average</option>
                  <option value="rolling_avg_30d">30-Day Rolling Average</option>
                </select>
              </div>

              {timeIntelligenceType && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                  <label className="block text-[10px] font-bold uppercase mb-1 text-muted-foreground">Date Field</label>
                  <select
                    className="brutal-select w-full text-xs"
                    value={dateField}
                    onChange={(e) => setDateField(e.target.value)}
                    required={!!timeIntelligenceType}
                  >
                    <option value="">Select a date field...</option>
                    {availableFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {timeIntelligenceType && (
              <p className="text-[10px] text-muted-foreground italic">
                This will wrap your formula in a window function for time-based analysis.
              </p>
            )}
          </div>

          {/* Format and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-muted-foreground">Display Format</label>
              <select
                className="brutal-select w-full"
                value={format}
                onChange={(e) => setFormat(e.target.value as MetricFormat)}
              >
                <option value="number">Number (1,234)</option>
                <option value="decimal">Decimal (1,234.56)</option>
                <option value="currency">Currency ($1,234.56)</option>
                <option value="percent">Percent (12.3%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-muted-foreground">Category (Optional)</label>
              <input
                type="text"
                className="brutal-input w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Financial"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-muted-foreground">Description (Optional)</label>
            <textarea
              className="brutal-input w-full min-h-[100px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this metric measure? How is it calculated?"
            />
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t-2 border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="brutal-button-secondary px-6 py-2 text-xs font-black uppercase"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="brutal-button-primary px-8 py-2 text-xs font-black uppercase flex items-center gap-2"
          >
            {isSaving && <SpinnerIcon className="animate-spin h-4 w-4" />}
            {metric ? 'Update Metric' : 'Save Metric'}
          </button>
        </div>
      </div>
    </dialog>
  );
};

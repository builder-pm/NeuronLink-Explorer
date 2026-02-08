import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { configService } from '../services/configService';
import { Configuration } from '../types';
import { SpinnerIcon } from './icons';
import { useAppState } from '../state/context';

interface SaveConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'db_config' | 'analysis_config';
    configData: any;
    onSaveSuccess?: (name: string) => void;
}

const SaveConfigModal: React.FC<SaveConfigModalProps> = ({ isOpen, onClose, type, configData, onSaveSuccess }) => {
    const state = useAppState();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            // Enrich configData with extended metadata from current state
            const enrichedConfig = {
                ...configData,
                fieldMetadata: state.fieldMetadata,
                sampleValues: state.sampleValues,
                hiddenFields: Array.from(state.hiddenFields || []),
                fieldOrder: [] // Placeholder for now
            };

            await configService.saveConfig({
                name,
                description,
                type,
                config: enrichedConfig,
                is_public: isPublic
            });
            toast.success('Configuration saved successfully!');
            onSaveSuccess?.(name);
            onClose();
            setName('');
            setDescription('');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md border-2 border-border shadow-brutal-xl p-6 animate-in fade-in zoom-in-95 duration-200 rounded-none">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold uppercase tracking-wider font-mono">
                        Save {type === 'db_config' ? 'Database' : 'Analysis'} Configuration
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-muted-foreground">Name</label>
                        <input
                            type="text"
                            required
                            className="brutal-input w-full"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sales Analysis Q1"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-muted-foreground">Description (Optional)</label>
                        <textarea
                            className="brutal-input w-full min-h-[80px]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this configuration does..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isConfigPublic"
                            className="brutal-checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                        />
                        <label htmlFor="isConfigPublic" className="text-sm font-medium cursor-pointer">Make this configuration public</label>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="brutal-button-secondary px-4 py-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="brutal-button-primary px-6 py-2 flex items-center gap-2"
                        >
                            {loading && <SpinnerIcon className="animate-spin h-4 w-4" />}
                            Save Configuration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveConfigModal;

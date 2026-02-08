import React, { useEffect, useState } from 'react';
import { Configuration } from '../types';
import { configService } from '../services/configService';
import { toast } from 'react-hot-toast';
import { SpinnerIcon, TrashIcon, ShareIcon, LockIcon } from './icons';

interface ConfigManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'db_config' | 'analysis_config';
    onLoad: (config: any, name: string) => void;
    userId?: string;
    availableFields?: string[];
}

const ConfigManagerModal: React.FC<ConfigManagerModalProps> = ({ isOpen, onClose, type, onLoad, userId, availableFields }) => {
    const [configs, setConfigs] = useState<Configuration[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'mine' | 'public'>('mine');

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const data = await configService.getConfigs(type);
            setConfigs(data);
        } catch (error: any) {
            toast.error(`Failed to load configurations: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchConfigs();
        }
    }, [isOpen, type]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this configuration?')) return;

        try {
            await configService.deleteConfig(id);
            setConfigs(configs.filter(c => c.id !== id));
            toast.success('Configuration deleted');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const togglePublic = async (e: React.MouseEvent, config: Configuration) => {
        e.stopPropagation();
        try {
            // Ensure hiddenFields is serialized as an array if it somehow exists as a Set
            const configBlob = { ...config.config };
            if (configBlob.hiddenFields && configBlob.hiddenFields instanceof Set) {
                configBlob.hiddenFields = Array.from(configBlob.hiddenFields);
            }

            const updatedConfig = await configService.saveConfig({
                ...config,
                config: configBlob,
                is_public: !config.is_public
            });
            setConfigs(configs.map(c => c.id === config.id ? updatedConfig : c));
            toast.success(`Configuration made ${updatedConfig.is_public ? 'Public' : 'Private'}`);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filteredConfigs = configs.filter(c => {
        // Base tab filter
        const tabMatch = activeTab === 'mine' ? c.user_id === userId : (c.is_public && c.user_id !== userId);
        if (!tabMatch) return false;

        // strict filtering for analysis configs
        if (type === 'analysis_config' && availableFields) {
            if (availableFields.length === 0) return false; // No DB config loaded -> no analysis configs

            // Check if all fields in the config are present in availableFields
            // config.config is the JSON payload. For analysis, it has selectedFields (array of strings) or pivotConfig?
            // Let's assume structure: { selectedFields: string[], ... } or check pivotConfig fields
            const configData = c.config as any;
            const requiredFields = configData.selectedFields || [];

            // Check if every required field exists in availableFields
            // Note: availableFields might be "table.field" or "field"? 
            // In App.tsx availableFields are fully qualified usually?
            // Actually App.tsx generates them from table columns.
            // Let's assume strict match.
            const isCompatible = requiredFields.every((f: string) => availableFields.includes(f));
            if (!isCompatible) return false;
        }

        return true;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-2xl border-2 border-border shadow-brutal-xl p-6 animate-in fade-in zoom-in-95 duration-200 rounded-none max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold uppercase tracking-wider font-mono">
                        Load {type === 'db_config' ? 'Database' : 'Analysis'} Configuration
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
                </div>

                {type === 'analysis_config' && availableFields && availableFields.length === 0 && (
                    <div className="mb-4 p-3 bg-destructive/10 border-l-4 border-destructive text-destructive text-sm font-bold">
                        Warning: No Database Configuration active. Please load or create a Database Model first.
                    </div>
                )}

                <div className="flex space-x-4 mb-4 border-b border-border">
                    <button
                        className={`pb-2 text-sm font-bold uppercase tracking-wide ${activeTab === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('mine')}
                    >
                        My Configs
                    </button>
                    <button
                        className={`pb-2 text-sm font-bold uppercase tracking-wide ${activeTab === 'public' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('public')}
                    >
                        Public Gallery
                    </button>
                    <div className="flex-grow"></div>
                    <button onClick={fetchConfigs} className="text-xs text-muted-foreground hover:text-primary mb-2">
                        Refresh
                    </button>
                </div>

                <div className="overflow-y-auto flex-grow space-y-2 pr-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <SpinnerIcon className="animate-spin h-6 w-6 text-primary" />
                        </div>
                    ) : filteredConfigs.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground border border-dashed border-border">
                            No configurations found.
                        </div>
                    ) : (
                        filteredConfigs.map(config => (
                            <div
                                key={config.id}
                                onClick={() => onLoad(config.config, config.name)}
                                className="group p-4 border border-border hover:border-primary hover:bg-muted/10 cursor-pointer transition-colors flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="font-bold">{config.name}</h3>
                                    {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground/50">
                                        <span>{new Date(config.updated_at || '').toLocaleDateString()}</span>
                                        {activeTab === 'public' && <span>by {config.user_id ? 'User' : 'System'}</span>}
                                    </div>
                                </div>

                                {activeTab === 'mine' && (
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => togglePublic(e, config)}
                                            className="p-2 hover:bg-background border border-transparent hover:border-border rounded-sm"
                                            title={config.is_public ? "Make Private" : "Make Public"}
                                        >
                                            {config.is_public ? <ShareIcon className="h-4 w-4 text-primary" /> : <LockIcon className="h-4 w-4" />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, config.id)}
                                            className="p-2 hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded-sm text-destructive"
                                            title="Delete"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfigManagerModal;

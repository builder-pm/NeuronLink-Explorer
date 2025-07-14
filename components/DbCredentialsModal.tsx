import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { XIcon, SpinnerIcon } from './icons';
import { DatabaseType, AthenaCredentials } from '../types';

interface DbCredentialsModalProps {
  onClose: () => void;
  onSave: (dbType: DatabaseType, creds: AthenaCredentials | null) => void;
  initialCreds: AthenaCredentials | null;
  initialDbTpe: DatabaseType;
}

const DbCredentialsModal: React.FC<DbCredentialsModalProps> = ({ onClose, onSave, initialCreds, initialDbTpe }) => {
  const [dbType, setDbType] = useState<DatabaseType>(initialDbTpe);
  const [creds, setCreds] = useState<AthenaCredentials>(initialCreds || {
      awsAccessKeyId: '',
      awsSecretAccessKey: '',
      awsRegion: '',
      s3OutputLocation: ''
  });
  const [isConnecting, setIsConnecting] = useState(false);

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

  const handleCredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCreds({ ...creds, [e.target.name]: e.target.value });
  }

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dbType === 'sqlite') {
        toast.success("In-browser database is always available!");
        return;
    }
    setIsConnecting(true);
    // Simulate connection test by calling the save function
    // The parent component `App.tsx` will show the real toast notifications.
    await onSave(dbType, creds);
    setIsConnecting(false);
  };
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(dbType, dbType === 'athena' ? creds : null);
  };
  
  const AthenaForm = () => (
    <>
        <div className="grid grid-cols-1 gap-4">
            <div>
                <label htmlFor="awsAccessKeyId" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">AWS Access Key ID</label>
                <input type="text" id="awsAccessKeyId" name="awsAccessKeyId" value={creds.awsAccessKeyId} onChange={handleCredChange} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
                <label htmlFor="awsSecretAccessKey" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">AWS Secret Access Key</label>
                <input type="password" id="awsSecretAccessKey" name="awsSecretAccessKey" value={creds.awsSecretAccessKey} onChange={handleCredChange} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
                <label htmlFor="awsRegion" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">AWS Region</label>
                <input type="text" id="awsRegion" name="awsRegion" value={creds.awsRegion} onChange={handleCredChange} placeholder="e.g., us-east-1" className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div>
                <label htmlFor="s3OutputLocation" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">S3 Staging Directory</label>
                <input type="text" id="s3OutputLocation" name="s3OutputLocation" value={creds.s3OutputLocation} onChange={handleCredChange} placeholder="s3://your-athena-results-bucket/" className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
            </div>
        </div>
    </>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-creds-title"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 id="db-creds-title" className="text-lg font-bold text-gray-800 dark:text-slate-200">
            Database Configuration
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
            aria-label="Close modal"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSave}>
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="db-type" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Database Type</label>
                    <select id="db-type" value={dbType} onChange={e => setDbType(e.target.value as DatabaseType)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200">
                        <option value="athena">Athena (Lakehouse)</option>
                        <option value="sqlite">SQLite (In-Browser Demo)</option>
                    </select>
                </div>
                {dbType === 'athena' ? <AthenaForm /> : (
                    <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-md text-sm text-gray-600 dark:text-slate-400">
                        The in-browser database uses a pre-loaded sample dataset. No configuration is needed.
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-b-lg">
                 <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isConnecting}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors flex items-center disabled:opacity-50"
                >
                    {isConnecting && <SpinnerIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                    Test Connection
                </button>
                <div className="flex space-x-2">
                     <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-transparent rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                     <button
                        type="submit"
                        disabled={isConnecting}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        Save & Connect
                    </button>
                </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default DbCredentialsModal;
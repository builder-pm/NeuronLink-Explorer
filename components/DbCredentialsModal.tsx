import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { XIcon, SpinnerIcon } from './icons';
import { DatabaseType, AthenaCredentials, SupabaseCredentials } from '../types';

// Default Supabase credentials from environment
const DEFAULT_SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eeagdzfpdgteuujdcfwu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_cwpHhdEwCBedrYCRB8gs_g_-oM4pPKb';

interface DbCredentialsModalProps {
  onClose: () => void;
  onSave: (dbType: DatabaseType, creds: AthenaCredentials | SupabaseCredentials | null) => void;
  initialCreds: AthenaCredentials | null;
  initialDbType: DatabaseType;
  initialSupabaseCreds?: SupabaseCredentials | null;
}

const DbCredentialsModal: React.FC<DbCredentialsModalProps> = ({
  onClose,
  onSave,
  initialCreds,
  initialDbType,
  initialSupabaseCreds
}) => {
  const [dbType, setDbType] = useState<DatabaseType>(initialDbType);
  const [athenaCreds, setAthenaCreds] = useState<AthenaCredentials>(initialCreds || {
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: '',
    s3OutputLocation: ''
  });
  const [supabaseCreds, setSupabaseCreds] = useState<SupabaseCredentials>(initialSupabaseCreds || {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY
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

  const handleAthenaCredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAthenaCreds({ ...athenaCreds, [e.target.name]: e.target.value });
  };

  const handleSupabaseCredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSupabaseCreds({ ...supabaseCreds, [e.target.name]: e.target.value });
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dbType === 'sqlite') {
      toast.success("In-browser database is always available!");
      return;
    }
    setIsConnecting(true);
    if (dbType === 'supabase') {
      await onSave(dbType, supabaseCreds);
    } else {
      await onSave(dbType, athenaCreds);
    }
    setIsConnecting(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (dbType === 'athena') {
      onSave(dbType, athenaCreds);
    } else if (dbType === 'supabase') {
      onSave(dbType, supabaseCreds);
    } else {
      onSave(dbType, null);
    }
  };

  const renderCredentialsForm = () => {
    if (dbType === 'supabase') {
      const isEnvKey = !!import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      return (
        <div className="grid grid-cols-1 gap-4">
          <div className="p-3 bg-accent/20 border-2 border-accent text-sm text-accent-foreground">
            <strong>DVD Rental Database</strong>
            <p className="text-xs mt-1 text-muted-foreground">
              Connect to the uploaded DVD Rental dataset with 15 tables including actors, films, customers, rentals, and payments.
            </p>
          </div>
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">HOSTNAME</label>
            <input
              type="password"
              id="url"
              name="url"
              value={supabaseCreds.url}
              onChange={handleSupabaseCredChange}
              className="brutal-input w-full"
              placeholder="https://your-project.supabase.co"
            />
          </div>
          <div>
            <label htmlFor="anonKey" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">PASSWORD</label>
            {isEnvKey ? (
              <div className="flex items-center space-x-2 p-2 bg-muted border border-border">
                <span className="text-green-500 font-mono text-xs">✓ Loaded from .env (PASSWORD)</span>
              </div>
            ) : (
              <input
                type="password"
                id="anonKey"
                name="anonKey"
                value={supabaseCreds.anonKey}
                onChange={handleSupabaseCredChange}
                className="brutal-input w-full"
              />
            )}
          </div>
        </div>
      );
    }

    if (dbType === 'athena') {
      return (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="awsAccessKeyId" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">AWS Access Key ID</label>
            <input type="text" id="awsAccessKeyId" name="awsAccessKeyId" value={athenaCreds.awsAccessKeyId} onChange={handleAthenaCredChange} className="brutal-input w-full" />
          </div>
          <div>
            <label htmlFor="awsSecretAccessKey" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">AWS Secret Access Key</label>
            <input type="password" id="awsSecretAccessKey" name="awsSecretAccessKey" value={athenaCreds.awsSecretAccessKey} onChange={handleAthenaCredChange} className="brutal-input w-full" />
          </div>
          <div>
            <label htmlFor="awsRegion" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">AWS Region</label>
            <input type="text" id="awsRegion" name="awsRegion" value={athenaCreds.awsRegion} onChange={handleAthenaCredChange} placeholder="e.g., us-east-1" className="brutal-input w-full" />
          </div>
          <div>
            <label htmlFor="s3OutputLocation" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">S3 Staging Directory</label>
            <input type="text" id="s3OutputLocation" name="s3OutputLocation" value={athenaCreds.s3OutputLocation} onChange={handleAthenaCredChange} placeholder="s3://your-athena-results-bucket/" className="brutal-input w-full" />
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-muted border-2 border-border text-sm text-muted-foreground">
        The in-browser database uses a pre-loaded sample dataset. No configuration is needed.
      </div>
    );
  };

  return (
    <div
      className="brutal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-creds-title"
    >
      <div
        className="bg-card border-2 border-border shadow-brutal-xl w-full max-w-md flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b-2 border-border">
          <h2 id="db-creds-title" className="text-lg font-bold text-foreground uppercase tracking-wide font-mono">
            Database Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="db-type" className="block text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wide">Database Type</label>
              <select id="db-type" value={dbType} onChange={e => setDbType(e.target.value as DatabaseType)} className="brutal-select w-full">
                <option value="supabase">LIVE Postgres</option>
                <option value="athena">Athena (Lakehouse)</option>
                <option value="sqlite">SQLite (In-Browser Demo)</option>
              </select>
            </div>
            {renderCredentialsForm()}
          </div>

          <div className="flex justify-between items-center p-4 border-t-2 border-border bg-muted">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isConnecting}
              className="brutal-button-secondary text-xs flex items-center disabled:opacity-50"
            >
              {isConnecting && <SpinnerIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />}
              Test Connection
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="brutal-button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnecting}
                className="brutal-button-primary text-xs disabled:opacity-50"
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

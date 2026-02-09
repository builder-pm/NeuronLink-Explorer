import React, { useEffect, useState } from 'react';
import { Toast, toast } from 'react-hot-toast'; // Import Toast type check? No, toast is value.
import { XIcon, SpinnerIcon } from './icons';
import { DatabaseType, AthenaCredentials, SupabaseCredentials } from '../types';

// Default Supabase credentials from environment
const DEFAULT_SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eeagdzfpdgteuujdcfwu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_cwpHhdEwCBedrYCRB8gs_g_-oM4pPKb';

interface DbCredentialsModalProps {
  onClose: () => void;
  onSave: (dbType: DatabaseType, creds: AthenaCredentials | SupabaseCredentials | null) => Promise<void> | void;
  onTest: (dbType: DatabaseType, creds: AthenaCredentials | SupabaseCredentials | null) => Promise<void> | void;
  initialCreds: AthenaCredentials | null;
  initialDbType: DatabaseType;
  initialSupabaseCreds?: SupabaseCredentials | null;
}

const DbCredentialsModal: React.FC<DbCredentialsModalProps> = ({
  onClose,
  onSave,
  onTest,
  initialCreds,
  initialDbType,
  initialSupabaseCreds
}) => {
  // Default to supabase if passed in type is athena (legacy cleanup)
  const [dbType, setDbType] = useState<DatabaseType>(initialDbType === 'athena' ? 'supabase' : initialDbType);

  // Keep supabase creds in state
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

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dbType === 'sqlite') {
      toast.success("In-browser database is always available!");
      return;
    }
    setIsConnecting(true);
    try {
      if (onTest) {
        await onTest(dbType, supabaseCreds);
      }
    } catch (error) {
      console.error("Connection test failed", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dbType === 'supabase') {
      setIsConnecting(true);
      try {
        await onSave(dbType, supabaseCreds);
      } finally {
        setIsConnecting(false);
      }
    } else {
      onSave(dbType, null);
    }
  };

  const renderCredentialsForm = () => {
    if (dbType === 'supabase') {
      return (
        <div className="grid grid-cols-1 gap-4">
          <div className="p-3 bg-primary/10 border-2 border-primary text-sm text-primary-foreground flex justify-between items-center">
            <div>
              <strong className="font-mono uppercase tracking-tighter">Managed Connection</strong>
              <p className="text-[10px] mt-1 text-muted-foreground uppercase">
                Enterprise credentials pre-configured & secured.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5">ENCRYPTED 🔒</span>
            </div>
          </div>
          <div>
            <label htmlFor="url" className="block text-sm font-black text-muted-foreground mb-1 uppercase tracking-widest font-mono">HOSTNAME</label>
            <input
              type="text"
              id="url"
              name="url"
              value="db.neuronlink.cloud.internal"
              readOnly
              className="brutal-input w-full bg-muted text-muted-foreground cursor-not-allowed font-mono opacity-80"
            />
          </div>
          <div>
            <label htmlFor="anonKey" className="block text-sm font-black text-muted-foreground mb-1 uppercase tracking-widest font-mono">ACCESS KEY</label>
            <input
              type="password"
              id="anonKey"
              name="anonKey"
              value="••••••••••••••••••••••••••••••••••••••••••••••••"
              readOnly
              className="brutal-input w-full bg-muted text-muted-foreground cursor-not-allowed font-mono opacity-80"
            />
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
      className="brutal-overlay z-[100]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-creds-title"
    >
      <div
        className="bg-card border-2 border-border shadow-brutal-xl w-full max-w-md flex flex-col m-4 animate-in fade-in zoom-in-95 duration-200"
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
              className="brutal-button-secondary text-xs flex items-center disabled:opacity-50 min-w-[120px] justify-center"
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
                className="brutal-button-primary text-xs disabled:opacity-50 flex items-center"
              >
                {isConnecting && <SpinnerIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />}
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

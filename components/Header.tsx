import React from 'react';
import { GithubIcon, LogoutIcon, UserIcon, CogIcon, TableIcon } from './icons';
import { PanelType } from '../types';
import { useAppDispatch, useAppState } from '../state/context';
import { ActionType } from '../state/actions';

interface HeaderProps {
  activePanel: PanelType;
  onTogglePanel: (panel: PanelType) => void;
  configName: string;
  onConfigNameChange: (name: string) => void;
  isGuest?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  user?: any;
}

const Header: React.FC<HeaderProps> = (props) => {
  const {
    activePanel,
    onTogglePanel,
    configName, onConfigNameChange,
    isGuest, onSignIn, onSignOut, user
  } = props;
  const { currentView } = useAppState();
  const dispatch = useAppDispatch();

  const toggleView = () => {
    const targetView = currentView === 'analysis' ? 'modeling' : 'analysis';
    dispatch({ type: ActionType.SET_VIEW, payload: targetView });
  }

  return (
    <header className="bg-card border-b-2 border-border shadow-brutal z-10 flex-shrink-0">
      {/* Top Row: Logo & Global Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b-2 border-border">
        <div className="flex items-center space-x-4">
          <a
            href="https://www.namankansal.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:opacity-80 transition-opacity"
            title="Visit Portfolio"
          >
            <img src="/favicon-symbolic.png" alt="NeuronLink" className="h-7 w-7 mr-2 object-contain" />
            <h1 className="text-xl font-bold text-primary font-mono tracking-wider uppercase">NeuronLink Explorer</h1>
          </a>
          {isGuest && (
            <div className="bg-yellow-400 text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter shadow-brutal border border-black animate-pulse">
              Guest Mode (Limited)
            </div>
          )}
        </div>

        {/* Right Side: Links & Auth */}
        <div className="flex items-center space-x-2">
          <a
            href="https://github.com/builder-pm/neuronlink-explorer"
            target="_blank"
            rel="noopener noreferrer"
            title="Source Code"
            className="p-2 border-2 border-border hover:bg-accent hover:text-accent-foreground transition-all hover:shadow-brutal-xs flex items-center justify-center"
          >
            <GithubIcon className="h-5 w-5" />
          </a>
          <a
            href="https://namankansal.in"
            target="_blank"
            rel="noopener noreferrer"
            title="Contact"
            className="p-2 border-2 border-border hover:bg-accent transition-all hover:shadow-brutal-xs flex items-center justify-center bg-card"
          >
            <img src="/naman-favicon.svg" alt="Portfolio" className="h-5 w-5 object-contain" />
          </a>

          <div className="border-l-2 border-border h-6 mx-2"></div>

          {/* Auth Section */}
          {user ? (
            <div className="flex items-center space-x-3 px-3 py-1 border-2 border-border bg-card">
              <div className="flex items-center space-x-2">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-6 w-6 rounded-full border border-border" />
                ) : (
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-xs font-bold uppercase tracking-wide max-w-[150px] truncate">
                  {user.user_metadata?.full_name || user.email || 'User'}
                </span>
              </div>
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Sign out"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          ) : isGuest ? (
            <button
              onClick={onSignIn}
              className="px-3 py-1 bg-primary text-primary-foreground border-2 border-border text-[11px] font-bold uppercase shadow-brutal-xs hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Sign In
            </button>
          ) : null}
        </div>
      </div>

      {/* Bottom Row: Context & View Toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-card">
        <div className="flex items-center space-x-4">
          <label htmlFor="configNameInput" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Name *</label>
          <input
            type="text"
            id="configNameInput"
            value={configName}
            onChange={(e) => onConfigNameChange(e.target.value)}
            className="brutal-input text-lg text-primary font-semibold bg-transparent px-1 min-w-[300px]"
            aria-required="true"
          />
        </div>

        {/* Context-Aware Navigation Button */}
        <div>
          {currentView === 'analysis' ? (
            <button
              onClick={toggleView}
              className="group flex items-center space-x-2 px-3 py-1.5 border-2 border-transparent text-muted-foreground hover:text-foreground transition-all hover:bg-muted/50"
              title="Go to Database Configuration"
            >
              <CogIcon className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          ) : (
            <button
              onClick={toggleView}
              className="flex items-center space-x-2 px-3 py-1.5 border-2 border-transparent text-muted-foreground hover:text-foreground transition-all hover:bg-muted/50"
              title="Back to Table View"
            >
              <TableIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

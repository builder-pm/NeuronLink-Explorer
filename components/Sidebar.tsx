import React, { useState } from 'react';
import { PanelType, AIAction, FieldGroups, DataRow, FieldAliases } from '../types';
import DataFieldsPanel from './DataFieldsPanel';
import AiChatPanel from './AiChatPanel';
import { FieldsIcon, AISparklesIcon } from './icons';

interface SidebarProps {
  activePanel: PanelType;
  selectedFields: string[];
  onFieldChange: (field: string, isSelected: boolean) => void;
  onAIAction: (action: AIAction) => void;
  fieldGroups: FieldGroups;
  executeQuery: (query: string) => Promise<DataRow[]>;
  availableFields: string[];
  fieldAliases: FieldAliases;
  isGuest?: boolean;
}

type SidebarTab = 'fields' | 'chat';

const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    selectedFields,
    onFieldChange,
    onAIAction,
    fieldGroups,
    executeQuery,
    availableFields,
    isGuest
  } = props;

  const [activeTab, setActiveTab] = useState<SidebarTab>('fields');

  const handleTabChange = (tab: SidebarTab) => {
    setActiveTab(tab);
  };

  return (
    <aside className="h-full w-full bg-card flex flex-col overflow-hidden">
      {/* Toggle Header */}
      <div className="flex border-b-2 border-border flex-shrink-0">
        <button
          onClick={() => handleTabChange('fields')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors uppercase tracking-wide ${activeTab === 'fields'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          title="Available Fields"
        >
          <FieldsIcon className="h-4 w-4" />
          <span>Fields</span>
        </button>
        <button
          onClick={() => handleTabChange('chat')}
          className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors uppercase tracking-wide ${activeTab === 'chat'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            } ${isGuest ? 'opacity-50 grayscale-[0.5]' : ''}`}
          title={isGuest ? "AI Features require account" : "AI Assistant"}
        >
          <AISparklesIcon className="h-4 w-4" />
          <span>Chat</span>
          {isGuest && (
            <span className="absolute top-1 right-2 text-[8px] bg-black text-white px-1 border border-white">LOCKED</span>
          )}
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {activeTab === 'fields' ? (
          <DataFieldsPanel
            selectedFields={selectedFields}
            onFieldChange={onFieldChange}
            fieldGroups={fieldGroups}
            allAvailableFields={availableFields}
            fieldAliases={props.fieldAliases}
          />
        ) : (
          isGuest ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 bg-muted/20">
              <AISparklesIcon className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-bold uppercase font-mono tracking-tight">AI Access Restricted</h3>
              <p className="text-sm text-muted-foreground">
                Unlock powerful AI data modeling and natural language querying by creating a free account.
              </p>
              <div className="w-12 h-1 bg-primary"></div>
            </div>
          ) : (
            <AiChatPanel
              onAIAction={onAIAction}
              executeQuery={executeQuery}
              availableFields={availableFields}
            />
          )
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

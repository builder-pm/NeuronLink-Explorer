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
  } = props;

  const [activeTab, setActiveTab] = useState<SidebarTab>('fields');

  return (
    <aside className="h-full w-full bg-card flex flex-col overflow-hidden">
      {/* Toggle Header */}
      <div className="flex border-b-2 border-border flex-shrink-0">
        <button
          onClick={() => setActiveTab('fields')}
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
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors uppercase tracking-wide ${activeTab === 'chat'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          title="AI Assistant"
        >
          <AISparklesIcon className="h-4 w-4" />
          <span>Chat</span>
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'fields' ? (
          <DataFieldsPanel
            selectedFields={selectedFields}
            onFieldChange={onFieldChange}
            fieldGroups={fieldGroups}
            allAvailableFields={availableFields}
            fieldAliases={props.fieldAliases}
          />
        ) : (
          <AiChatPanel
            onAIAction={onAIAction}
            executeQuery={executeQuery}
            availableFields={availableFields}
          />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

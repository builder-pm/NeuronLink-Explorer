import React from 'react';
import { PanelType, AIAction, FieldGroups, DataRow } from '../types';
import DataFieldsPanel from './DataFieldsPanel';
import AiChatPanel from './AiChatPanel';

interface SidebarProps {
  activePanel: PanelType;
  selectedFields: string[];
  onFieldChange: (field: string, isSelected: boolean) => void;
  onAIAction: (action: AIAction) => void;
  fieldGroups: FieldGroups;
  executeQuery: (query: string) => Promise<DataRow[]>;
  availableFields: string[];
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { 
    activePanel, 
    selectedFields, 
    onFieldChange, 
    onAIAction, 
    fieldGroups,
    executeQuery,
    availableFields,
  } = props;
  
  const PanelContent = () => {
      switch(activePanel) {
          case 'fields':
              return (
                 <DataFieldsPanel 
                    selectedFields={selectedFields}
                    onFieldChange={onFieldChange}
                    fieldGroups={fieldGroups}
                    allAvailableFields={availableFields}
                  />
              );
          case 'chat':
               return <AiChatPanel 
                        onAIAction={onAIAction} 
                        executeQuery={executeQuery} 
                        availableFields={availableFields} 
                      />;
          default:
              return null;
      }
  }

  return (
    <aside className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col flex-shrink-0">
      <div className="flex-1 overflow-y-auto">
        <PanelContent />
      </div>
    </aside>
  );
};

export default Sidebar;
import React, { createContext, useReducer, useContext, Dispatch, useEffect } from 'react';
import { AppState } from '../types';
import { AppAction } from './actions';
import { appReducer, initialState } from './reducer';

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'neuronLinkAppState';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState, (init) => {
        try {
            const storedItem = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedItem) {
                const savedState = JSON.parse(storedItem);
                // Merge with initial state to ensure new properties are not missing
                // after an application update.
                return { ...init, ...savedState };
            }
        } catch (e) {
            console.error("Failed to parse state from localStorage", e);
            // On error, clear the stored state to prevent a loop of errors
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        return init;
    });

    useEffect(() => {
        try {
            // Persist a subset of the state to avoid storing large data or sensitive info.
            const stateToPersist = {
                // UI state
                theme: state.theme,
                currentView: state.currentView,
                activePanel: state.activePanel,
                isSecondaryPanelOpen: state.isSecondaryPanelOpen,
                
                // Config/Mode
                configName: state.configName,
                fileName: state.fileName,
                isDemoMode: state.isDemoMode,

                // Data configuration
                selectedFields: state.selectedFields,
                pivotConfig: state.pivotConfig,
                filters: state.filters,
                sqlQuery: state.sqlQuery,
                joins: state.joins,
                tablePositions: state.tablePositions,
                fieldGroups: state.fieldGroups,
                modelConfiguration: state.modelConfiguration,
                confirmedModelConfiguration: state.confirmedModelConfiguration,

                // User preferences
                rowsPerPage: state.rowsPerPage,

                // DB connection
                databaseType: state.databaseType,
                athenaCredentials: state.athenaCredentials,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToPersist));
        } catch (e) {
            console.error("Failed to save state to localStorage", e);
        }
    }, [state]);

    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                {children}
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
};

export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppProvider');
    }
    return context;
};

export const useAppDispatch = () => {
    const context = useContext(AppDispatchContext);
     if (context === undefined) {
        throw new Error('useAppDispatch must be used within an AppProvider');
    }
    return context;
};
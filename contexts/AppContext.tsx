import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { ModuleId, NavigationPayload } from '../types';

interface AppContextValue {
    activeModule: ModuleId | null;
    initialEntryId?: string;
    navigationPayload?: NavigationPayload;
    navigateTo: (moduleId: ModuleId, entryId?: string, payload?: NavigationPayload) => void;
    onBack: () => void;
    // FIX: Add zenMode and toggleZenMode to the context value type
    zenMode: boolean;
    toggleZenMode: () => void;
}

export const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppContextProviderProps {
    children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
    const [activeModule, setActiveModule] = useState<ModuleId | null>(null);
    const [initialEntryId, setInitialEntryId] = useState<string | undefined>();
    const [navigationPayload, setNavigationPayload] = useState<NavigationPayload | undefined>();
    // FIX: Add zenMode state and a function to toggle it
    const [zenMode, setZenMode] = useState(false);
    const toggleZenMode = useCallback(() => setZenMode(prev => !prev), []);

    const navigateTo = useCallback((moduleId: ModuleId, entryId?: string, payload?: NavigationPayload) => {
        setActiveModule(moduleId);
        setInitialEntryId(entryId);
        setNavigationPayload(payload);
    }, []);

    const onBack = useCallback(() => {
        setActiveModule(null);
        setInitialEntryId(undefined);
        setNavigationPayload(undefined);
    }, []);

    const contextValue: AppContextValue = {
        activeModule,
        initialEntryId,
        navigationPayload,
        navigateTo,
        onBack,
        // FIX: Provide zenMode and its toggle function in the context
        zenMode,
        toggleZenMode,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextValue => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};
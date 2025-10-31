import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { AppSettings, SETTINGS_STORAGE_KEY, ModuleId, DashboardWidgetId } from '../types';
import { modules } from '../data';

interface SettingsContextType {
    settings: AppSettings;
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const sharableModules = modules
    .filter(m => ['journal', 'gratitude', 'thought-court', 'ritual', 'values', 'goals', 'assessment', 'wounds', 'rhythm', 'relational-ecosystem', 'body-map', 'unsent-letters', 'fear-setting', 'oracle', 'dream-journal', 'narrative-arc'].includes(m.id))
    .map(m => m.id);


const defaultMainOrder: DashboardWidgetId[] = ['summary', 'coach', 'suggestions'];
const defaultSideOrder: DashboardWidgetId[] = ['quick-actions', 'dailyPrompt', 'quickGratitude', 'moodTracker', 'rhythm', 'flashback', 'emotionCloud'];

const defaultSettings: AppSettings = {
    theme: 'dark',
    userName: '',
    shareContextWithAI: sharableModules.reduce((acc, moduleId) => {
        acc[moduleId as ModuleId] = true;
        return acc;
    }, {} as { [key in ModuleId]?: boolean }),
    dashboardWidgets: {
        flashback: true,
        rhythm: true,
        moodTracker: true,
        emotionCloud: true,
        quickGratitude: true,
        dailyPrompt: true,
    },
    dashboardMainOrder: defaultMainOrder,
    dashboardSideOrder: defaultSideOrder,
    coachSettings: {
        personality: 'Bienveillant',
        tone: 'Encourageant',
        voiceURI: null,
        voicePitch: 1,
        voiceRate: 1,
    },
    celebrateRitualCompletion: true,
    customCoachPrompts: [
        "Aide-moi à trouver ma 'deuxième vitesse'.",
        "Comment puis-je mieux m'ancrer au quotidien ?",
        "Aide-moi à clarifier ma mission profonde.",
        "Comment gérer une conversation difficile ?"
    ],
    favoriteModules: [],
    moduleSettings: {},
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const stored = storage.get<Partial<AppSettings> & { shareContextWithAI?: boolean | { [key in ModuleId]?: boolean } }>(SETTINGS_STORAGE_KEY, {});
        
        // Handle migration for shareContextWithAI from boolean to object
        let shareContextSettings = defaultSettings.shareContextWithAI;
        if (typeof stored.shareContextWithAI === 'boolean') {
             shareContextSettings = sharableModules.reduce((acc, moduleId) => {
                acc[moduleId as ModuleId] = stored.shareContextWithAI as boolean;
                return acc;
            }, {} as { [key in ModuleId]?: boolean });
        } else if (typeof stored.shareContextWithAI === 'object') {
            shareContextSettings = {
                ...defaultSettings.shareContextWithAI,
                ...stored.shareContextWithAI,
            };
        }

        return {
            ...defaultSettings,
            ...stored,
            shareContextWithAI: shareContextSettings,
            dashboardWidgets: {
                ...defaultSettings.dashboardWidgets,
                ...(stored.dashboardWidgets || {}),
            },
            dashboardMainOrder: stored.dashboardMainOrder || defaultMainOrder,
            dashboardSideOrder: stored.dashboardSideOrder || defaultSideOrder,
            coachSettings: {
                ...defaultSettings.coachSettings,
                ...(stored.coachSettings || {}),
            },
            moduleSettings: {
                ...defaultSettings.moduleSettings,
                ...(stored.moduleSettings || {}),
            },
        };
    });

    useEffect(() => {
        storage.set(SETTINGS_STORAGE_KEY, settings);
        document.documentElement.setAttribute('data-theme', settings.theme);
    }, [settings]);

    const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const value = useMemo(() => ({ settings, updateSetting }), [settings, updateSetting]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
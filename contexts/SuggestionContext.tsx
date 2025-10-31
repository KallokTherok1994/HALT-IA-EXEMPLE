import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { generateSuggestionFeed } from '../services/generative-ai';
import { generateContextualSummary } from '../utils/dataSummary';
import { Suggestion, CompanionStorage, COMPANION_STORAGE_KEY } from '../types';
import { useSettings } from './SettingsContext';
import { useToast } from './ToastContext';

interface SuggestionContextType {
    loading: boolean;
    primarySuggestion: Suggestion | null;
    otherSuggestions: Suggestion[];
    error: string | null;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export const SuggestionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { settings } = useSettings();
    const { showToast } = useToast();

    useEffect(() => {
        const fetchSuggestions = async () => {
            const today = new Date().toISOString().split('T')[0];
            const storedData = storage.get<CompanionStorage | null>(COMPANION_STORAGE_KEY, null);

            if (storedData && storedData.lastGenerated === today) {
                setSuggestions(storedData.suggestion);
                setLoading(false);
                return;
            }

            try {
                const summary = generateContextualSummary(settings);
                const newSuggestions = await generateSuggestionFeed(summary, settings);
                setSuggestions(newSuggestions);

                const newStorageData: CompanionStorage = {
                    lastGenerated: today,
                    suggestion: newSuggestions,
                };
                storage.set(COMPANION_STORAGE_KEY, newStorageData);
            } catch (err) {
                console.error("Failed to get suggestion feed:", err);
                const errorMessage = "Impossible de charger les suggestions du jour.";
                setError(errorMessage);
                showToast(errorMessage, "destructive");
            } finally {
                setLoading(false);
            }
        };

        fetchSuggestions();
    }, [settings, showToast]);

    const primarySuggestion = useMemo(() => suggestions.find(s => s.isPrimary) || (suggestions.length > 0 ? suggestions[0] : null), [suggestions]);
    const otherSuggestions = useMemo(() => suggestions.filter(s => s.isPrimary === false), [suggestions]);

    const value = { loading, primarySuggestion, otherSuggestions, error };

    return (
        <SuggestionContext.Provider value={value}>
            {children}
        </SuggestionContext.Provider>
    );
};

export const useSuggestionContext = (): SuggestionContextType => {
    const context = useContext(SuggestionContext);
    if (!context) {
        throw new Error('useSuggestionContext must be used within a SuggestionProvider');
    }
    return context;
};
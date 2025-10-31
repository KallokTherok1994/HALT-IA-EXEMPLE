import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { generateProactiveMessage } from '../services/generative-ai';
import { generateContextualSummary } from '../utils/dataSummary';
import { 
    ProactiveSuggestion, 
    ProactiveCoachStorage, 
    PROACTIVE_COACH_STORAGE_KEY
} from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface ProactiveCoachHookResult {
    loading: boolean;
    suggestion: ProactiveSuggestion | null;
    error: string | null;
}

const CACHE_DURATION_HOURS = 4;

export const useProactiveCoach = (): ProactiveCoachHookResult => {
    const [loading, setLoading] = useState(true);
    const [suggestion, setSuggestion] = useState<ProactiveSuggestion | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { settings } = useSettings();

    useEffect(() => {
        const fetchSuggestion = async () => {
            const now = new Date();
            const storedData = storage.get<ProactiveCoachStorage | null>(PROACTIVE_COACH_STORAGE_KEY, null);

            if (storedData && storedData.lastGenerated) {
                const lastGeneratedDate = new Date(storedData.lastGenerated);
                const hoursDiff = (now.getTime() - lastGeneratedDate.getTime()) / (1000 * 60 * 60);
                if (hoursDiff < CACHE_DURATION_HOURS) {
                    setSuggestion(storedData.suggestion);
                    setLoading(false);
                    return;
                }
            }

            try {
                const summary = generateContextualSummary(settings);
                const newSuggestion = await generateProactiveMessage(summary, settings);
                setSuggestion(newSuggestion);

                const newStorageData: ProactiveCoachStorage = {
                    lastGenerated: now.toISOString(),
                    suggestion: newSuggestion,
                };
                storage.set(PROACTIVE_COACH_STORAGE_KEY, newStorageData);

            } catch (err) {
                console.error("Failed to get proactive coach message:", err);
                setError("Impossible de charger le message du coach.");
            } finally {
                setLoading(false);
            }
        };

        fetchSuggestion();
    }, [settings]);

    return { loading, suggestion, error };
};
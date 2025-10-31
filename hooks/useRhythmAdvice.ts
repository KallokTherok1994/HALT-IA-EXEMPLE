import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getTodayDateString } from '../utils/dateHelpers';
import { generateRhythmAdvice } from '../services/generative-ai';
import { DailyRhythmAdvice, RhythmData, RHYTHM_ADVICE_CACHE_KEY, RHYTHM_STORAGE_KEY } from '../types';
import { useToast } from '../contexts/ToastContext';

interface RhythmAdviceHook {
    loading: boolean;
    advice: DailyRhythmAdvice | null;
    needsSetup: boolean;
    error: string | null;
}

export const useRhythmAdvice = (): RhythmAdviceHook => {
    const [advice, setAdvice] = useState<DailyRhythmAdvice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsSetup, setNeedsSetup] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchAdvice = async () => {
            const rhythmData = storage.get<RhythmData | null>(RHYTHM_STORAGE_KEY, null);

            if (!rhythmData || !rhythmData.season) {
                setNeedsSetup(true);
                setLoading(false);
                return;
            }

            const todayStr = getTodayDateString();
            const cachedAdvice = storage.get<DailyRhythmAdvice | null>(RHYTHM_ADVICE_CACHE_KEY, null);

            if (cachedAdvice && cachedAdvice.date === todayStr) {
                setAdvice(cachedAdvice);
                setLoading(false);
                return;
            }

            try {
                const result = await generateRhythmAdvice(rhythmData.chronotype, rhythmData.season);
                const newAdvice: DailyRhythmAdvice = {
                    date: todayStr,
                    ...result
                };
                setAdvice(newAdvice);
                storage.set(RHYTHM_ADVICE_CACHE_KEY, newAdvice);
            } catch (err) {
                const errorMessage = "Impossible de générer le conseil du jour.";
                setError(errorMessage);
                showToast(errorMessage, "destructive");
            } finally {
                setLoading(false);
            }
        };

        fetchAdvice();
    }, [showToast]);

    return { loading, advice, needsSetup, error };
};
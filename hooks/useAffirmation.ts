import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getTodayDateString } from '../utils/dateHelpers';
import { getDailyAffirmation } from '../services/generative-ai';
import { DailyAffirmation, AFFIRMATION_STORAGE_KEY } from '../types';

interface AffirmationHookResult {
    loading: boolean;
    affirmation: string | null;
}

export const useAffirmation = (): AffirmationHookResult => {
    const [loading, setLoading] = useState(true);
    const [affirmation, setAffirmation] = useState<string | null>(null);

    useEffect(() => {
        const fetchAffirmation = async () => {
            const todayStr = getTodayDateString();
            const storedData = storage.get<DailyAffirmation | null>(AFFIRMATION_STORAGE_KEY, null);

            if (storedData && storedData.date === todayStr) {
                setAffirmation(storedData.affirmation);
                setLoading(false);
                return;
            }

            try {
                const newAffirmation = await getDailyAffirmation();
                setAffirmation(newAffirmation);
                storage.set<DailyAffirmation>(AFFIRMATION_STORAGE_KEY, {
                    date: todayStr,
                    affirmation: newAffirmation,
                });
            } catch (err) {
                console.error("Failed to get daily affirmation:", err);
                // Fail silently, don't show an error to the user
            } finally {
                setLoading(false);
            }
        };

        fetchAffirmation();
    }, []);

    return { loading, affirmation };
};

import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getTodayDateString } from '../utils/dateHelpers';
import { generateJournalPrompt } from '../services/generative-ai';
import { DailyPromptCache, DAILY_PROMPT_STORAGE_KEY } from '../types';

export const useDailyPrompt = () => {
    const [loading, setLoading] = useState(true);
    const [prompt, setPrompt] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrompt = async () => {
            const todayStr = getTodayDateString();
            const cached = storage.get<DailyPromptCache | null>(DAILY_PROMPT_STORAGE_KEY, null);

            if (cached && cached.date === todayStr) {
                setPrompt(cached.prompt);
                setLoading(false);
                return;
            }

            try {
                const newPrompt = await generateJournalPrompt();
                setPrompt(newPrompt);
                storage.set<DailyPromptCache>(DAILY_PROMPT_STORAGE_KEY, { date: todayStr, prompt: newPrompt });
            } catch (e) {
                // Fail gracefully, don't show error, widget will just be empty.
                console.error("Failed to fetch daily prompt:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPrompt();
    }, []);

    return { loading, prompt };
};
